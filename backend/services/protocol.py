"""
LoRa Protocol Implementation — Shared between Pi TX, ESP32, and Laptop RX.
Based on neuranex/shared/lora_protocol_shared.py
"""
import struct
import zlib
from dataclasses import dataclass
from typing import Optional, List, Tuple, Union
from config import config


# Protocol constants (MUST match ESP32 and Pi)
PROTOCOL_VERSION = config.PROTOCOL_VERSION
HEADER_FORMAT = "!B B 6s 6s H H H 16s"
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)

PKT_DATA = config.PKT_DATA
PKT_ACK = config.PKT_ACK
PKT_NACK = config.PKT_NACK
PKT_META = config.PKT_META
PKT_STATUS = config.PKT_STATUS
PKT_DONE = config.PKT_DONE
PKT_TELEMETRY = config.PKT_TELEMETRY

FRAME_START = config.FRAME_START
MAX_PAYLOAD = config.MAX_PAYLOAD


# CRC32 (polynomial 0xEDB88320, init 0xFFFFFFFF)
def crc32_update(crc: int, data: bytes) -> int:
    """Incremental CRC32 matching Python's zlib.crc32."""
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0xEDB88320 & (-(crc & 1)))
    return crc


def calculate_crc(data: bytes) -> int:
    """Full CRC32 calculation."""
    return (~crc32_update(0xFFFFFFFF, data)) & 0xFFFFFFFF


def verify_crc(data: bytes, expected_crc: int) -> bool:
    """Verify CRC32 of data."""
    return calculate_crc(data) == expected_crc


# Wire format helpers
def encode_id(id_str: str) -> bytes:
    """Encode mission/image ID to 6-byte wire format."""
    return id_str.encode("utf-8")[:6].ljust(6, b"\x00")


def decode_id(data: bytes) -> str:
    """Decode 6-byte wire format to string."""
    return data.rstrip(b"\x00").decode("utf-8", errors="ignore")


# Packet builders
def build_header(pkt_type: int, mission_id: str, image_id: str,
                 chunk_num: int, total_chunks: int, payload_len: int,
                 crc_val: int = 0) -> bytes:
    """Build packet header."""
    return struct.pack(
        HEADER_FORMAT,
        PROTOCOL_VERSION,
        pkt_type,
        encode_id(mission_id),
        encode_id(image_id),
        chunk_num,
        total_chunks,
        payload_len,
        struct.pack("!I", crc_val).ljust(16, b"\x00")
    )


def build_data_packet(mission_id: str, image_id: str,
                      chunk_num: int, total_chunks: int,
                      payload: bytes) -> bytes:
    """Build PKT_DATA packet."""
    header = build_header(PKT_DATA, mission_id, image_id,
                          chunk_num, total_chunks, len(payload))
    crc_val = calculate_crc(header + payload)
    header = build_header(PKT_DATA, mission_id, image_id,
                          chunk_num, total_chunks, len(payload), crc_val)
    return header + payload


def build_meta_packet(mission_id: str, image_id: str,
                      total_segments: int, chunk_size: int,
                      classification: str, priority: int,
                      jpeg_quality: int, file_size: int) -> bytes:
    """Build PKT_META packet (TX -> RX)."""
    # Payload: total_segments(u16), chunk_size(u16), classification(u8),
    # priority(u8), jpeg_quality(u8), reserved(u8), file_size(u32)
    class_map = {"CLEAR": 0, "CLOUDY": 1, "NOT_VISIBLE": 2}
    class_byte = class_map.get(classification, 255)

    payload = struct.pack("!HHBBBBI",
                          total_segments,
                          chunk_size,
                          class_byte,
                          priority,
                          jpeg_quality,
                          0,  # reserved
                          file_size)

    header = build_header(PKT_META, mission_id, image_id,
                          0xFFFF, 0xFFFF, len(payload))
    crc_val = calculate_crc(header + payload)
    header = build_header(PKT_META, mission_id, image_id,
                          0xFFFF, 0xFFFF, len(payload), crc_val)
    return header + payload


def build_status_packet(mission_id: str, image_id: str,
                        total_segments: int, missing_segments: List[int]) -> bytes:
    """Build PKT_STATUS packet (RX -> TX)."""
    received_count = total_segments - len(missing_segments)
    missing_bytes = bytes([len(missing_segments)]) + bytes(missing_segments[:255])

    payload = struct.pack("!HH", total_segments, received_count) + missing_bytes

    header = build_header(PKT_STATUS, mission_id, image_id,
                          0xFFFF, 0xFFFF, len(payload))
    crc_val = calculate_crc(header + payload)
    header = build_header(PKT_STATUS, mission_id, image_id,
                          0xFFFF, 0xFFFF, len(payload), crc_val)
    return header + payload


def build_done_packet(mission_id: str, image_id: str, total_segments: int) -> bytes:
    """Build PKT_DONE packet (TX -> RX)."""
    payload = struct.pack("!HH", total_segments, 0)

    header = build_header(PKT_DONE, mission_id, image_id,
                          0xFFFF, 0xFFFF, len(payload))
    crc_val = calculate_crc(header + payload)
    header = build_header(PKT_DONE, mission_id, image_id,
                          0xFFFF, 0xFFFF, len(payload), crc_val)
    return header + payload


# Parsers
@dataclass
class ParsedPacket:
    pkt_type: int
    mission_id: str
    image_id: str
    chunk_num: int
    total_chunks: int
    payload_len: int
    payload: bytes
    crc: int
    crc_valid: bool


def parse_packet(data: bytes) -> Optional[ParsedPacket]:
    """Parse full packet (header + payload)."""
    if len(data) < HEADER_SIZE:
        return None

    header = data[:HEADER_SIZE]
    payload = data[HEADER_SIZE:]

    try:
        (proto_ver, pkt_type, mission_id_b, image_id_b,
         chunk_num, total_chunks, payload_len, crc_bytes) = struct.unpack(HEADER_FORMAT, header)
    except struct.error:
        return None

    if proto_ver != PROTOCOL_VERSION:
        return None

    if len(payload) != payload_len:
        return None

    # Extract CRC from header (first 4 bytes of 16-byte field)
    received_crc = struct.unpack("!I", crc_bytes[:4])[0]

    # Verify CRC (header with zeroed CRC + payload)
    header_zero_crc = build_header(pkt_type, decode_id(mission_id_b), decode_id(image_id_b),
                                   chunk_num, total_chunks, payload_len, 0)
    crc_valid = verify_crc(header_zero_crc + payload, received_crc)

    return ParsedPacket(
        pkt_type=pkt_type,
        mission_id=decode_id(mission_id_b),
        image_id=decode_id(image_id_b),
        chunk_num=chunk_num,
        total_chunks=total_chunks,
        payload_len=payload_len,
        payload=payload,
        crc=received_crc,
        crc_valid=crc_valid
    )


def parse_meta_payload(payload: bytes) -> dict:
    """Parse PKT_META payload."""
    if len(payload) < 12:
        return {}
    total_segments, chunk_size, class_byte, priority, jpeg_quality, reserved, file_size = struct.unpack("!HHBBBBI", payload[:12])
    class_map = {0: "CLEAR", 1: "CLOUDY", 2: "NOT_VISIBLE", 255: "UNKNOWN"}
    return {
        "total_segments": total_segments,
        "chunk_size": chunk_size,
        "classification": class_map.get(class_byte, "UNKNOWN"),
        "priority": priority,
        "jpeg_quality": jpeg_quality,
        "file_size": file_size
    }


def parse_status_payload(payload: bytes) -> dict:
    """Parse PKT_STATUS payload."""
    if len(payload) < 5:
        return {}
    total_segments, received_count = struct.unpack("!HH", payload[:4])
    missing_count = payload[4] if len(payload) > 4 else 0
    missing_segments = list(payload[5:5 + missing_count]) if missing_count > 0 else []
    return {
        "total_segments": total_segments,
        "received_count": received_count,
        "missing_count": missing_count,
        "missing_segments": missing_segments
    }


def parse_telemetry_payload(payload: bytes) -> dict:
    """Parse PKT_TELEMETRY payload (from ESP32)."""
    # rssi(i8), snr(i8), packet_type(u8), segment(u16), total(u16), timestamp(u32)
    if len(payload) < 9:
        return {}
    rssi = struct.unpack("b", payload[0:1])[0]  # signed byte
    snr = struct.unpack("b", payload[1:2])[0] * 0.25  # ESP32 stores SNR * 4
    packet_type = payload[2]
    segment = struct.unpack("!H", payload[3:5])[0]
    total = struct.unpack("!H", payload[5:7])[0]
    timestamp = struct.unpack("!I", payload[7:11])[0] if len(payload) >= 11 else 0
    return {
        "rssi": rssi,
        "snr": snr,
        "packet_type": packet_type,
        "segment": segment,
        "total": total,
        "timestamp": timestamp
    }


# Serial frame protocol (ESP32 <-> Laptop)
# Frame: [0xAA][LEN_HI][LEN_LO][PAYLOAD...][CRC_HI][CRC_LO]
# CRC16-CCITT (poly 0x1021, init 0xFFFF) over LEN + PAYLOAD

SERIAL_START = 0xAA
SERIAL_HEADER_SIZE = 3  # START + LEN_HI + LEN_LO
SERIAL_CRC_SIZE = 2

def crc16_ccitt(data: bytes, init: int = 0xFFFF) -> int:
    """CRC16-CCITT (poly 0x1021)."""
    crc = init
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc = (crc << 1)
            crc &= 0xFFFF
    return crc


def build_serial_frame(payload: bytes) -> bytes:
    """Build serial frame with CRC16."""
    if len(payload) > MAX_PAYLOAD:
        raise ValueError(f"Payload too large: {len(payload)} > {MAX_PAYLOAD}")

    length = len(payload)
    frame = bytes([SERIAL_START, (length >> 8) & 0xFF, length & 0xFF]) + payload
    crc = crc16_ccitt(frame[1:])  # CRC over LEN + PAYLOAD
    frame += struct.pack("!H", crc)
    return frame


def parse_serial_frame(data: bytes) -> Optional[bytes]:
    """Parse serial frame, return payload if valid."""
    if len(data) < SERIAL_HEADER_SIZE + SERIAL_CRC_SIZE:
        return None

    if data[0] != SERIAL_START:
        return None

    length = (data[1] << 8) | data[2]
    if len(data) < SERIAL_HEADER_SIZE + length + SERIAL_CRC_SIZE:
        return None

    payload = data[3:3 + length]
    received_crc = struct.unpack("!H", data[3 + length:3 + length + 2])[0]

    # Verify CRC over LEN + PAYLOAD
    calc_crc = crc16_ccitt(data[1:3 + length])
    if calc_crc != received_crc:
        return None

    return payload


# Convenience: build serial frame with LoRa packet inside
def build_serial_packet(pkt_type: int, mission_id: str, image_id: str,
                        chunk_num: int, total_chunks: int, payload: bytes) -> bytes:
    """Build complete serial frame containing a LoRa packet."""
    lora_packet = build_header(pkt_type, mission_id, image_id,
                               chunk_num, total_chunks, len(payload))
    lora_packet += payload
    return build_serial_frame(lora_packet)