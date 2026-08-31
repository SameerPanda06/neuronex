"""
Serial Receiver Service — Reads from ESP32 via USB serial, parses frames,
stores telemetry, and emits WebSocket events.
"""
import serial
import threading
import time
import logging
from datetime import datetime
from typing import Optional, Callable

from flask import current_app
from config import config
from services.protocol import (
    parse_serial_frame, parse_packet, parse_meta_payload,
    parse_status_payload, parse_telemetry_payload,
    parse_cmd_payload,
    CMD_STATUS_REQ,
    PKT_DATA, PKT_META, PKT_STATUS, PKT_TELEMETRY, PKT_ACK, PKT_NACK, PKT_DONE, PKT_CMD
)
from models import db, Image, Telemetry, Retransmission, Revolution, ImageStatus
from sqlalchemy.orm import Session
from services.storage import get_storage

logger = logging.getLogger(__name__)


class SerialReceiver:
    """Background serial reader for ESP32 bridge."""

    def __init__(self, port: str, baudrate: int, socketio=None, app=None):
        self.port = port
        self.baudrate = baudrate
        self.socketio = socketio
        self.app = app
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.serial_conn: Optional[serial.Serial] = None
        self.buffer = bytearray()
        self._callbacks = []

    def start(self):
        """Start the receiver thread."""
        if self.running:
            return

        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1.0,
                write_timeout=1.0
            )
            logger.info(f"Opened serial port {self.port} @ {self.baudrate}")
        except Exception as e:
            logger.warning(f"Serial port {self.port} unavailable: {e}. Running in software fallback mode.")
            self.serial_conn = None
            return

        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        logger.info("Serial receiver started")

    def stop(self):
        """Stop the receiver thread."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        if self.serial_conn:
            self.serial_conn.close()
        logger.info("Serial receiver stopped")

    def register_callback(self, callback: Callable[[dict], None]):
        """Register callback for parsed packets."""
        self._callbacks.append(callback)

    def _read_loop(self):
        """Main read loop."""
        while self.running:
            try:
                if not self.serial_conn or not self.serial_conn.is_open:
                    time.sleep(0.1)
                    continue

                # Read available data
                data = self.serial_conn.read(self.serial_conn.in_waiting or 1)
                if not data:
                    time.sleep(0.01)
                    continue

                self.buffer.extend(data)
                self._process_buffer()

            except serial.SerialException as e:
                logger.error(f"Serial error: {e}")
                time.sleep(1.0)
                # Try to reconnect
                try:
                    if self.serial_conn:
                        self.serial_conn.close()
                    self.serial_conn = serial.Serial(
                        port=self.port,
                        baudrate=self.baudrate,
                        timeout=1.0
                    )
                except Exception as e2:
                    logger.error(f"Reconnect failed: {e2}")
                    time.sleep(5.0)
            except Exception as e:
                logger.error(f"Read loop error: {e}")
                time.sleep(0.1)

    def _process_buffer(self):
        """Process buffer for complete frames with robust sync recovery."""
        while len(self.buffer) >= 4:  # Minimum frame: START + LEN_HI + LEN_LO + CRC
            # Find start byte
            start_idx = self.buffer.find(0xAA)
            if start_idx == -1:
                self.buffer.clear()
                return

            if start_idx > 0:
                logger.warning(f"Dropping {start_idx} bytes before start byte")
                self.buffer = self.buffer[start_idx:]

            # Check if we have length bytes
            if len(self.buffer) < 3:
                return

            length = (self.buffer[1] << 8) | self.buffer[2]
            frame_size = 3 + length + 2  # START + LEN(2) + PAYLOAD + CRC(2)

            # Validate length - reject obviously corrupt frames
            if length > 255 or length < 1:
                logger.warning(f"Suspicious length={length}, dropping frame, buffer_head={self.buffer[:20].hex()}")
                self.buffer = self.buffer[1:]  # Skip start byte, try next
                continue

            if len(self.buffer) < frame_size:
                return  # Wait for more data

            # Extract frame
            frame = bytes(self.buffer[:frame_size])
            self.buffer = self.buffer[frame_size:]

            # Debug: log raw frame
            logger.debug(f"Raw frame: {frame.hex()}")

            # Parse frame with CRC16 validation
            payload = parse_serial_frame(frame)
            if payload is None:
                logger.warning(f"Invalid serial frame (CRC error or malformed), frame={frame.hex()}")
                # Try to recover by scanning for next valid start byte within this frame
                # This handles case where ASCII logs corrupted the frame boundary
                continue

            logger.debug(f"Parsed payload ({len(payload)} bytes): {payload.hex()}")

            # Parse LoRa packet
            packet = parse_packet(payload)
            if packet is None:
                logger.warning(f"Invalid LoRa packet, payload={payload.hex()}")
                continue

            if not packet.crc_valid:
                logger.warning(f"LoRa CRC mismatch: mission={packet.mission_id}, image={packet.image_id}, type={packet.pkt_type}")
                continue

            # Process packet
            self._handle_packet(packet)

    def _handle_packet(self, packet):
        """Handle parsed LoRa packet."""
        try:
            with self.app.app_context() if self.app else current_app.app_context():
                self._process_packet(packet)
        except Exception as e:
            logger.error(f"Packet handling error: {e}")

    def _process_packet(self, packet):
        """Process packet and update database."""
        pkt_type = packet.pkt_type
        mission_id = packet.mission_id
        image_id = packet.image_id

        logger.debug(f"RX: type={pkt_type}, mission={mission_id}, image={image_id}, seg={packet.chunk_num}/{packet.total_chunks}")

        # Store telemetry
        telemetry = Telemetry(
            image_id=image_id,
            mission_id=mission_id,
            packet_type=self._pkt_type_name(pkt_type),
            segment_num=packet.chunk_num if packet.chunk_num != 0xFFFF else None,
            total_segments=packet.total_chunks if packet.total_chunks != 0xFFFF else None,
            rssi=None,  # Will be updated from PKT_TELEMETRY
            snr=None,
            latency_ms=None,
            raw_payload=packet.payload.hex()
        )
        db.session.add(telemetry)

        # Handle by packet type
        if pkt_type == PKT_META:
            self._handle_meta(image_id, mission_id, packet.payload)
        elif pkt_type == PKT_STATUS:
            self._handle_status(image_id, mission_id, packet.payload)
        elif pkt_type == PKT_TELEMETRY:
            self._handle_telemetry(image_id, mission_id, packet.payload)
        elif pkt_type == PKT_ACK:
            self._handle_ack(image_id, mission_id)
        elif pkt_type == PKT_NACK:
            self._handle_nack(image_id, mission_id, packet.payload)
        elif pkt_type == PKT_DONE:
            self._handle_done(image_id, mission_id, packet.payload)
        elif pkt_type == PKT_DATA:
            self._handle_data(image_id, mission_id, packet.chunk_num, packet.total_chunks, packet.payload)
        elif pkt_type == PKT_CMD:
            self._handle_cmd(image_id, mission_id, packet.payload)

        db.session.commit()

        # Emit WebSocket event
        self._emit_websocket(packet)

        # Callbacks
        for cb in self._callbacks:
            try:
                cb(packet)
            except Exception as e:
                logger.error(f"Callback error: {e}")

    def _handle_meta(self, image_id: str, mission_id: str, payload: bytes):
        """Handle PKT_META: image metadata from Pi TX."""
        meta = parse_meta_payload(payload)

        image = db.session.get(Image, image_id)
        if not image:
            # Create new image record
            image = Image(
                id=image_id,
                mission_id=mission_id,
                file_path=f"unknown/{image_id}.jpg",
                status="classified"
            )
            db.session.add(image)

        # Update with metadata
        image.total_segments = meta.get("total_segments")
        image.chunk_size = meta.get("chunk_size")
        image.classification = meta.get("classification")
        image.priority = meta.get("priority")
        image.jpeg_quality = meta.get("jpeg_quality")
        image.status = "queued"
        image.segments_confirmed = 0
        image.progress_percent = 0.0

        # Also store in local storage
        storage = get_storage()
        storage.add_segment(image_id, mission_id, 0,  # META is segment 0
                          meta.get("total_segments", 0),
                          meta.get("chunk_size", 200),
                          b'',  # no payload for META
                          meta=meta)

        logger.info(f"META: {image_id} {meta.get('classification')} segs={meta.get('total_segments')}")

    def _handle_status(self, image_id: str, mission_id: str, payload: bytes):
        """Handle PKT_STATUS: RX reports what it has/needs."""
        status = parse_status_payload(payload)
        missing = status.get("missing_segments", [])

        image = db.session.get(Image, image_id)
        if image:
            image.segments_confirmed = status.get("received_count", 0)
            image.total_segments = status.get("total_segments", image.total_segments)
            if image.total_segments:
                image.progress_percent = round(image.segments_confirmed / image.total_segments * 100, 1)

            # Create retransmission request if missing segments
            if missing:
                retrans = Retransmission(
                    image_id=image_id,
                    mission_id=mission_id,
                    missing_segments=missing,
                    status="pending"
                )
                db.session.add(retrans)
                logger.info(f"STATUS: {image_id} missing {len(missing)} segments: {missing[:10]}...")

    def _handle_telemetry(self, image_id: str, mission_id: str, payload: bytes):
        """Handle PKT_TELEMETRY: RSSI/SNR from ESP32."""
        telem = parse_telemetry_payload(payload)
        rssi = telem.get("rssi")
        snr = telem.get("snr")

        # Update latest telemetry record
        latest_telem = Telemetry.query.filter(
            Telemetry.image_id == image_id,
            Telemetry.mission_id == mission_id
        ).order_by(Telemetry.timestamp.desc()).first()

        if latest_telem:
            latest_telem.rssi = rssi
            latest_telem.snr = snr

        # Update image with latest signal quality
        image = db.session.get(Image, image_id)
        if image:
            image.rssi = rssi
            image.snr = snr

        logger.debug(f"TELEMETRY: {image_id} RSSI={rssi} SNR={snr}")

    def _handle_ack(self, image_id: str, mission_id: str):
        """Handle PKT_ACK: All segments received."""
        image = db.session.get(Image, image_id)
        if image:
            image.status = "complete"
            image.segments_confirmed = image.total_segments or 0
            image.progress_percent = 100.0
            image.completed_at = datetime.utcnow()
            logger.info(f"ACK: {image_id} COMPLETE")

    def _handle_nack(self, image_id: str, mission_id: str, payload: bytes):
        """Handle PKT_NACK: Missing segments request."""
        # NACK payload: mission_id(6) + image_id(6) + count(u16) + missing[]
        if len(payload) < 14:
            return
        count = (payload[12] << 8) | payload[13]
        missing = list(payload[14:14 + count])

        image = db.session.get(Image, image_id)
        if image:
            # Create retransmission request
            retrans = Retransmission(
                image_id=image_id,
                mission_id=mission_id,
                missing_segments=missing,
                status="pending"
            )
            db.session.add(retrans)
            logger.info(f"NACK: {image_id} requests {len(missing)} segments")

    def _handle_done(self, image_id: str, mission_id: str, payload: bytes):
        """Handle PKT_DONE: TX confirms moving on."""
        image = db.session.get(Image, image_id)
        if image and image.status != "complete":
            image.status = "complete"
            image.progress_percent = 100.0
            image.completed_at = datetime.utcnow()
            logger.info(f"DONE: {image_id} marked complete by TX")

    def _handle_data(self, image_id: str, mission_id: str, chunk_num: int, total_chunks: int, payload: bytes = None):
        """Handle PKT_DATA: Image segment received (forwarded from ESP32)."""
        # Payload comes from the parsed packet
        if payload is None:
            return

        # Store in local storage for reassembly
        storage = get_storage()
        # Get image meta to fill in classification etc.
        image = db.session.get(Image, image_id)
        meta = {
            "classification": image.classification if image else "UNKNOWN",
            "priority": image.priority if image else 99,
            "jpeg_quality": image.jpeg_quality if image else 85,
            "file_size": 0
        }
        storage.add_segment(image_id, mission_id, chunk_num, total_chunks,
                          image.chunk_size if image else 200, payload,
                          meta=meta, rssi=image.rssi or 0, snr=image.snr or 0)

        # Update DB progress
        if image:
            image.segments_confirmed = chunk_num + 1
            if total_chunks:
                image.progress_percent = round((chunk_num + 1) / total_chunks * 100, 1)
            image.status = "transmitting"

    def _handle_cmd(self, image_id: str, mission_id: str, payload: bytes):
        """Handle PKT_CMD: Ground command echoed back from satellite."""
        cmd_data = parse_cmd_payload(payload)
        cmd = cmd_data.get("cmd")
        value = cmd_data.get("value", 0)

        logger.info(f"CMD echo from satellite: cmd={cmd} value={value}")

        if cmd == CMD_STATUS_REQ:
            # Satellite is responding to our status request
            self.socketio.emit("status:response", {
                "image_id": image_id,
                "mission_id": mission_id,
                "value": value
            })

    def _pkt_type_name(self, pkt_type: int) -> str:
        names = {
            PKT_DATA: "DATA",
            PKT_ACK: "ACK",
            PKT_NACK: "NACK",
            PKT_META: "META",
            PKT_STATUS: "STATUS",
            PKT_DONE: "DONE",
            PKT_TELEMETRY: "TELEMETRY"
        }
        return names.get(pkt_type, f"UNKNOWN({pkt_type})")

    def _emit_websocket(self, packet):
        """Emit WebSocket event for real-time dashboard."""
        if not self.socketio:
            return

        pkt_type = packet.pkt_type
        image_id = packet.image_id
        mission_id = packet.mission_id

        if pkt_type == PKT_TELEMETRY:
            # Already handled in _handle_telemetry
            pass
        elif pkt_type == PKT_STATUS:
            self.socketio.emit("retransmit:requested", {
                "image_id": image_id,
                "mission_id": mission_id,
                "missing_segments": parse_status_payload(packet.payload).get("missing_segments", [])
            })
        elif pkt_type == PKT_META:
            meta = parse_meta_payload(packet.payload)
            self.socketio.emit("image:classified", {
                "id": image_id,
                "mission_id": mission_id,
                "classification": meta.get("classification"),
                "confidence": 0.0,  # Would need to be in META
                "priority": meta.get("priority"),
                "action": "keep" if meta.get("classification") == "CLEAR" else "defer"
            })
        elif pkt_type == PKT_ACK:
            self.socketio.emit("image:progress", {
                "id": image_id,
                "segments_confirmed": packet.total_chunks,
                "segments_total": packet.total_chunks,
                "status": "complete"
            })


# Singleton instance
_receiver_instance: Optional[SerialReceiver] = None


def get_receiver() -> Optional[SerialReceiver]:
    return _receiver_instance


def init_receiver(port: str, baudrate: int, socketio, app) -> SerialReceiver:
    global _receiver_instance
    _receiver_instance = SerialReceiver(port, baudrate, socketio, app)
    return _receiver_instance


# ============================================================
# STANDALONE ENTRY POINT
# ============================================================
if __name__ == "__main__":
    import os
    from flask import Flask
    from models import db

    # Minimal Flask app for database context
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    with app.app_context():
        db.create_all()

    port = os.getenv("SERIAL_PORT", "COM3")
    baudrate = int(os.getenv("SERIAL_BAUDRATE", "115200"))

    print(f"[RECEIVER] Starting serial reader on {port} @ {baudrate}...")
    receiver = SerialReceiver(port, baudrate, socketio=None, app=app)
    receiver.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[RECEIVER] Shutting down...")
        receiver.stop()