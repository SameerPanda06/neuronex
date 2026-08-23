from datetime import datetime
from enum import Enum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON

db = SQLAlchemy()


class ImageStatus(str, Enum):
    PENDING = "pending"
    CLASSIFIED = "classified"
    QUEUED = "queued"
    TRANSMITTING = "transmitting"
    COMPLETE = "complete"
    DISCARDED = "discarded"
    FAILED = "failed"


class Classification(str, Enum):
    CLEAR = "CLEAR"
    CLOUDY = "CLOUDY"
    NOT_VISIBLE = "NOT_VISIBLE"


class Action(str, Enum):
    KEEP = "keep"
    DEFER = "defer"
    DISCARD = "discard"


class Image(db.Model):
    """Satellite image with ML classification and transmission state."""
    __tablename__ = "images"

    id = Column(String(32), primary_key=True)  # e.g., "IMG-000001"
    mission_id = Column(String(32), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)

    # ML Classification
    classification = Column(String(16), nullable=True)  # CLEAR, CLOUDY, NOT_VISIBLE
    confidence = Column(Float, nullable=True)
    all_probabilities = Column(SQLiteJSON, nullable=True)  # {"CLEAR": 0.9, ...}
    latency_ms = Column(Float, nullable=True)
    classified_at = Column(DateTime, nullable=True)

    # Decision
    action = Column(String(16), nullable=True)  # keep, defer, discard
    priority = Column(Integer, nullable=True, default=99)
    jpeg_quality = Column(Integer, nullable=True)

    # Transmission state
    status = Column(String(16), nullable=False, default=ImageStatus.PENDING.value, index=True)
    total_segments = Column(Integer, nullable=True)
    segments_confirmed = Column(Integer, nullable=False, default=0)
    current_segment = Column(Integer, nullable=False, default=0)
    chunk_size = Column(Integer, nullable=True)

    # Signal quality (from ESP32 telemetry)
    rssi = Column(Integer, nullable=True)
    snr = Column(Float, nullable=True)
    throughput_bps = Column(Float, nullable=True)
    latency_ms_tx = Column(Float, nullable=True)

    # Progress
    progress_percent = Column(Float, nullable=False, default=0.0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transmitted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    telemetry = db.relationship("Telemetry", backref="image", lazy="dynamic", cascade="all, delete-orphan")
    retransmissions = db.relationship("Retransmission", backref="image", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "mission_id": self.mission_id,
            "file_path": self.file_path,
            "classification": self.classification,
            "confidence": self.confidence,
            "all_probabilities": self.all_probabilities,
            "latency_ms": self.latency_ms,
            "classified_at": self.classified_at.isoformat() if self.classified_at else None,
            "action": self.action,
            "priority": self.priority,
            "jpeg_quality": self.jpeg_quality,
            "status": self.status,
            "total_segments": self.total_segments,
            "segments_confirmed": self.segments_confirmed,
            "current_segment": self.current_segment,
            "chunk_size": self.chunk_size,
            "rssi": self.rssi,
            "snr": self.snr,
            "throughput_bps": self.throughput_bps,
            "latency_ms_tx": self.latency_ms_tx,
            "progress_percent": self.progress_percent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "transmitted_at": self.transmitted_at.isoformat() if self.transmitted_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class Telemetry(db.Model):
    """Per-packet telemetry from ESP32."""
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(String(32), db.ForeignKey("images.id"), nullable=False, index=True)
    mission_id = Column(String(32), nullable=False, index=True)

    # Packet info
    packet_type = Column(String(16), nullable=False)  # DATA, ACK, NACK, STATUS, META, TELEMETRY
    segment_num = Column(Integer, nullable=True)
    total_segments = Column(Integer, nullable=True)

    # Signal quality
    rssi = Column(Integer, nullable=True)
    snr = Column(Float, nullable=True)

    # Timing
    latency_ms = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Raw data (for debugging)
    raw_payload = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "image_id": self.image_id,
            "mission_id": self.mission_id,
            "packet_type": self.packet_type,
            "segment_num": self.segment_num,
            "total_segments": self.total_segments,
            "rssi": self.rssi,
            "snr": self.snr,
            "latency_ms": self.latency_ms,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Retransmission(db.Model):
    """Retransmission requests from ESP32 (NACK/STATUS)."""
    __tablename__ = "retransmissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(String(32), db.ForeignKey("images.id"), nullable=False, index=True)
    mission_id = Column(String(32), nullable=False, index=True)

    missing_segments = Column(SQLiteJSON, nullable=False)  # [1, 5, 12, ...]
    requested_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    status = Column(String(16), nullable=False, default="pending")  # pending, acknowledged, completed

    def to_dict(self):
        return {
            "id": self.id,
            "image_id": self.image_id,
            "mission_id": self.mission_id,
            "missing_segments": self.missing_segments,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "status": self.status,
        }


class Revolution(db.Model):
    """Downlink revolution (60s window, 3/day)."""
    __tablename__ = "revolutions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    revolution_num = Column(Integer, nullable=False, unique=True, index=True)
    mission_id = Column(String(32), nullable=False, index=True)

    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    window_duration_sec = Column(Integer, default=60)

    images_planned = Column(SQLiteJSON, nullable=True)  # [{"id": "...", "priority": 1}, ...]
    images_completed = Column(SQLiteJSON, nullable=True)  # ["IMG-001", ...]
    images_failed = Column(SQLiteJSON, nullable=True)  # ["IMG-002", ...]

    status = Column(String(16), nullable=False, default="scheduled")  # scheduled, active, completed
    total_segments_planned = Column(Integer, default=0)
    total_segments_transmitted = Column(Integer, default=0)
    total_segments_confirmed = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "revolution_num": self.revolution_num,
            "mission_id": self.mission_id,
            "window_start": self.window_start.isoformat() if self.window_start else None,
            "window_end": self.window_end.isoformat() if self.window_end else None,
            "window_duration_sec": self.window_duration_sec,
            "images_planned": self.images_planned,
            "images_completed": self.images_completed,
            "images_failed": self.images_failed,
            "status": self.status,
            "total_segments_planned": self.total_segments_planned,
            "total_segments_transmitted": self.total_segments_transmitted,
            "total_segments_confirmed": self.total_segments_confirmed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }