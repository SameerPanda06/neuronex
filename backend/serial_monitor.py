#!/usr/bin/env python3
"""
Quick Serial Monitor for Neuranex ESP32 Bridge.
Run this to see raw frames from the ESP32 on serial port.
"""
import serial
import serial.tools.list_ports
import sys
import time
from datetime import datetime

# Try to import protocol parser
try:
    from services.protocol import (
        parse_serial_frame, parse_packet, parse_meta_payload,
        parse_status_payload, parse_telemetry_payload,
        PKT_DATA, PKT_META, PKT_STATUS, PKT_TELEMETRY, PKT_ACK, PKT_NACK, PKT_DONE
    )
    HAS_PROTOCOL = True
except ImportError:
    HAS_PROTOCOL = False
    print("Protocol module not available - showing raw bytes only")


def list_ports():
    """List available serial ports."""
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("No serial ports found!")
        return []

    print("\nAvailable serial ports:")
    for i, p in enumerate(ports):
        print(f"  [{i}] {p.device} - {p.description}")
        if p.hwid:
            print(f"      HWID: {p.hwid}")
    return ports


def decode_packet_type(pkt_type: int) -> str:
    names = {
        PKT_DATA: "DATA",
        PKT_ACK: "ACK",
        PKT_NACK: "NACK",
        PKT_META: "META",
        PKT_STATUS: "STATUS",
        PKT_DONE: "DONE",
        PKT_TELEMETRY: "TELEMETRY",
    }
    return names.get(pkt_type, f"UNKNOWN({pkt_type})")


def pretty_print_packet(parsed):
    """Pretty print a parsed packet."""
    pkt_name = decode_packet_type(parsed.pkt_type)
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] {pkt_name} Packet")
    print(f"{'='*60}")
    print(f"  Mission ID: {parsed.mission_id}")
    print(f"  Image ID:   {parsed.image_id}")
    print(f"  Chunk:      {parsed.chunk_num} / {parsed.total_chunks}")
    print(f"  Payload:    {parsed.payload_len} bytes")
    print(f"  CRC Valid:  {parsed.crc_valid}")

    # Parse payload based on type
    if parsed.pkt_type == PKT_META and len(parsed.payload) >= 12:
        meta = parse_meta_payload(parsed.payload)
        print(f"  Segments:   {meta.get('total_segments')}")
        print(f"  Chunk Size: {meta.get('chunk_size')}")
        print(f"  Class:      {meta.get('classification')}")
        print(f"  Priority:   {meta.get('priority')}")
        print(f"  JPEG Qual:  {meta.get('jpeg_quality')}")
        print(f"  File Size:  {meta.get('file_size')}")

    elif parsed.pkt_type == PKT_STATUS:
        status = parse_status_payload(parsed.payload)
        print(f"  Total Segs:  {status.get('total_segments')}")
        print(f"  Received:    {status.get('received_count')}")
        print(f"  Missing:     {status.get('missing_count')}")
        if status.get('missing_segments'):
            print(f"  Missing IDs: {status['missing_segments'][:20]}{'...' if len(status['missing_segments']) > 20 else ''}")

    elif parsed.pkt_type == PKT_TELEMETRY:
        telem = parse_telemetry_payload(parsed.payload)
        print(f"  RSSI:        {telem.get('rssi')} dBm")
        print(f"  SNR:         {telem.get('snr')} dB")
        print(f"  Pkt Type:    {telem.get('packet_type')}")
        print(f"  Segment:     {telem.get('segment')}/{telem.get('total')}")

    elif parsed.pkt_type == PKT_ACK:
        print(f"  -> All segments confirmed!")

    elif parsed.pkt_type == PKT_DONE:
        print(f"  -> TX moving to next image")

    elif parsed.pkt_type == PKT_NACK:
        print(f"  -> Missing segments request")

    # Raw payload hex
    if parsed.payload:
        hex_str = parsed.payload.hex(' ')
        print(f"  Raw Payload: {hex_str[:120]}{'...' if len(hex_str) > 120 else ''}")


def monitor_port(port: str, baudrate: int = 115200):
    """Monitor serial port and decode frames."""
    print(f"\nOpening {port} @ {baudrate} baud...")
    print("Press Ctrl+C to exit\n")

    try:
        ser = serial.Serial(port=port, baudrate=baudrate, timeout=0.1)
    except Exception as e:
        print(f"Failed to open port: {e}")
        return

    buffer = bytearray()
    frame_count = 0
    error_count = 0

    try:
        while True:
            # Read available data
            data = ser.read(ser.in_waiting or 1)
            if data:
                buffer.extend(data)

                # Process complete frames
                while True:
                    # Find frame start (0xAA)
                    start_idx = buffer.find(0xAA)
                    if start_idx == -1:
                        # No frame start, keep last byte in case it's start of next
                        if len(buffer) > 1:
                            buffer = buffer[-1:]
                        break

                    if start_idx > 0:
                        # Discard garbage before frame start
                        print(f"  [DISCARDED {start_idx} bytes before frame start]")
                        buffer = buffer[start_idx:]

                    # Need at least header (3 bytes) to get length
                    if len(buffer) < 3:
                        break

                    # Get payload length
                    payload_len = (buffer[1] << 8) | buffer[2]
                    frame_total_len = 3 + payload_len + 2  # header + payload + CRC16

                    if len(buffer) < frame_total_len:
                        # Incomplete frame, wait for more data
                        break

                    # Extract full frame
                    frame = bytes(buffer[:frame_total_len])
                    buffer = buffer[frame_total_len:]

                    frame_count += 1
                    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]

                    # Try to parse
                    payload = parse_serial_frame(frame)
                    if payload is None:
                        error_count += 1
                        print(f"[{timestamp}] Frame #{frame_count} - CRC ERROR or invalid frame")
                        print(f"  Raw: {frame.hex(' ')}")
                        continue

                    print(f"\n[{timestamp}] Frame #{frame_count} ({len(frame)} bytes) - OK")

                    if HAS_PROTOCOL:
                        parsed = parse_packet(payload)
                        if parsed:
                            pretty_print_packet(parsed)
                        else:
                            print(f"  Payload ({len(payload)} bytes): {payload.hex(' ')}")
                    else:
                        print(f"  Payload ({len(payload)} bytes): {payload.hex(' ')}")

            else:
                time.sleep(0.01)

    except KeyboardInterrupt:
        print(f"\n\nStopped. Frames: {frame_count}, Errors: {error_count}")
    finally:
        ser.close()


if __name__ == "__main__":
    ports = list_ports()

    if not ports:
        sys.exit(1)

    # Auto-select if only one port, or ask
    if len(ports) == 1:
        port = ports[0].device
        print(f"\nAuto-selected: {port}")
    else:
        try:
            choice = input("\nSelect port number: ").strip()
            idx = int(choice)
            port = ports[idx].device
        except (ValueError, IndexError):
            print("Invalid selection")
            sys.exit(1)

    # Allow baudrate override
    baudrate = 115200
    if len(sys.argv) > 1:
        try:
            baudrate = int(sys.argv[1])
        except ValueError:
            pass

    monitor_port(port, baudrate)