"""
Local Storage Service — Persist received image segments to disk,
reassemble JPEGs, and manage storage quotas.
"""
import os
import json
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass, asdict

STORAGE_ROOT = os.path.expanduser("~/neuronex_storage")
MISSIONS_DIR = os.path.join(STORAGE_ROOT, "missions")
IMAGES_DIR = os.path.join(STORAGE_ROOT, "images")
METADATA_DIR = os.path.join(STORAGE_ROOT, "metadata")

# Storage limits
MAX_STORAGE_GB = 5
MAX_IMAGES = 10000

@dataclass
class ImageMetadata:
    """Metadata for a received image."""
    image_id: str
    mission_id: str
    classification: str
    priority: int
    jpeg_quality: int
    total_segments: int
    chunk_size: int
    segments_received: List[int]
    segments_missing: List[int]
    file_size: int
    rssi_avg: float
    snr_avg: float
    first_received: str
    last_updated: str
    completed_at: Optional[str] = None
    local_path: Optional[str] = None

class LocalStorage:
    """Manages local image storage and reassembly."""

    def __init__(self, root: str = STORAGE_ROOT):
        self.root = root
        self.lock = threading.RLock()

        # Create directories
        os.makedirs(MISSIONS_DIR, exist_ok=True)
        os.makedirs(IMAGES_DIR, exist_ok=True)
        os.makedirs(METADATA_DIR, exist_ok=True)

        # Segment buffers: {image_id: {seg_num: bytes}}
        self._segment_buffers: Dict[str, Dict[int, bytes]] = {}
        self._image_meta: Dict[str, ImageMetadata] = {}

    def _get_meta_path(self, image_id: str) -> str:
        return os.path.join(METADATA_DIR, f"{image_id}.json")

    def _get_image_path(self, image_id: str) -> str:
        return os.path.join(IMAGES_DIR, f"{image_id}.jpg")

    def _load_meta(self, image_id: str) -> Optional[ImageMetadata]:
        """Load metadata from disk."""
        path = self._get_meta_path(image_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path) as f:
                data = json.load(f)
            return ImageMetadata(**data)
        except Exception:
            return None

    def _save_meta(self, meta: ImageMetadata):
        """Save metadata to disk."""
        path = self._get_meta_path(meta.image_id)
        with open(path, 'w') as f:
            json.dump(asdict(meta), f, indent=2)

    def initialize_from_disk(self):
        """Load all existing metadata on startup."""
        with self.lock:
            for meta_file in Path(METADATA_DIR).glob("*.json"):
                image_id = meta_file.stem
                meta = self._load_meta(image_id)
                if meta:
                    self._image_meta[image_id] = meta
                    # Load existing segments
                    image_path = self._get_image_path(image_id)
                    if os.path.exists(image_path) and meta.segments_received:
                        self._image_meta[image_id].local_path = image_path

    def add_segment(self, image_id: str, mission_id: str, segment_num: int,
                    total_segments: int, chunk_size: int, payload: bytes,
                    meta: Optional[Dict] = None, rssi: float = 0, snr: float = 0):
        """Add a received segment, reassemble when complete."""
        with self.lock:
            # Initialize metadata if first segment
            if image_id not in self._segment_buffers:
                self._segment_buffers[image_id] = {}
                now = datetime.utcnow().isoformat()
                self._image_meta[image_id] = ImageMetadata(
                    image_id=image_id,
                    mission_id=mission_id,
                    classification=meta.get("classification", "UNKNOWN") if meta else "UNKNOWN",
                    priority=meta.get("priority", 99) if meta else 99,
                    jpeg_quality=meta.get("jpeg_quality", 85) if meta else 85,
                    total_segments=total_segments,
                    chunk_size=chunk_size,
                    segments_received=[],
                    segments_missing=list(range(total_segments)),
                    file_size=meta.get("file_size", 0) if meta else 0,
                    rssi_avg=rssi,
                    snr_avg=snr,
                    first_received=now,
                    last_updated=now
                )

            # Store segment
            self._segment_buffers[image_id][segment_num] = payload

            # Update metadata
            m = self._image_meta[image_id]
            if segment_num not in m.segments_received:
                m.segments_received.append(segment_num)
                m.segments_received.sort()
            if segment_num in m.segments_missing:
                m.segments_missing.remove(segment_num)
            m.rssi_avg = (m.rssi_avg * (len(m.segments_received) - 1) + rssi) / len(m.segments_received)
            m.snr_avg = (m.snr_avg * (len(m.segments_received) - 1) + snr) / len(m.segments_received)
            m.last_updated = datetime.utcnow().isoformat()

            # Check if complete
            if len(m.segments_received) >= total_segments:
                self._reassemble_image(image_id)

            self._save_meta(m)

    def _reassemble_image(self, image_id: str):
        """Reassemble JPEG from segments and save to disk."""
        segments = self._segment_buffers.get(image_id, {})
        meta = self._image_meta.get(image_id)
        if not segments or not meta:
            return

        # Sort and concatenate
        ordered_data = b''.join(segments[i] for i in range(meta.total_segments) if i in segments)

        # Save JPEG
        image_path = self._get_image_path(image_id)
        try:
            with open(image_path, 'wb') as f:
                f.write(ordered_data)

            meta.local_path = image_path
            meta.completed_at = datetime.utcnow().isoformat()
            meta.file_size = len(ordered_data)
            self._save_meta(meta)

            # Cleanup segment buffer
            del self._segment_buffers[image_id]

            print(f"[STORAGE] Reassembled {image_id}: {len(ordered_data)} bytes -> {image_path}")

        except Exception as e:
            print(f"[STORAGE] Failed to reassemble {image_id}: {e}")

    def get_image(self, image_id: str) -> Optional[ImageMetadata]:
        """Get image metadata."""
        with self.lock:
            if image_id not in self._image_meta:
                return self._load_meta(image_id)
            return self._image_meta[image_id]

    def list_images(self, mission_id: Optional[str] = None,
                    classification: Optional[str] = None,
                    limit: int = 100) -> List[ImageMetadata]:
        """List stored images with optional filters."""
        with self.lock:
            results = []
            for meta in self._image_meta.values():
                if mission_id and meta.mission_id != mission_id:
                    continue
                if classification and meta.classification != classification:
                    continue
                results.append(meta)

            # Sort by most recent first
            results.sort(key=lambda m: m.last_updated, reverse=True)
            return results[:limit]

    def get_storage_stats(self) -> Dict:
        """Get storage usage statistics."""
        with self.lock:
            total_images = len(self._image_meta)
            completed = sum(1 for m in self._image_meta.values() if m.completed_at)
            total_size = sum(m.file_size for m in self._image_meta.values() if m.file_size)
            return {
                "total_images": total_images,
                "completed_images": completed,
                "in_progress": total_images - completed,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / 1024 / 1024, 1),
                "max_size_gb": MAX_STORAGE_GB,
                "max_images": MAX_IMAGES,
            }

    def cleanup_old_images(self, keep_recent: int = 100):
        """Remove oldest completed images if over quota."""
        with self.lock:
            completed = [(m.image_id, m.last_updated) for m in self._image_meta.values()
                        if m.completed_at and m.local_path]
            completed.sort(key=lambda x: x[1])  # Oldest first

            to_remove = len(completed) - keep_recent
            if to_remove <= 0:
                return 0

            removed = 0
            for image_id, _ in completed[:to_remove]:
                try:
                    image_path = self._get_image_path(image_id)
                    meta_path = self._get_meta_path(image_id)
                    if os.path.exists(image_path):
                        os.remove(image_path)
                    if os.path.exists(meta_path):
                        os.remove(meta_path)
                    if image_id in self._image_meta:
                        del self._image_meta[image_id]
                    removed += 1
                except Exception as e:
                    print(f"[STORAGE] Failed to remove {image_id}: {e}")
            return removed

# Global instance
_storage_instance: Optional[LocalStorage] = None

def get_storage() -> LocalStorage:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorage()
        _storage_instance.initialize_from_disk()
    return _storage_instance