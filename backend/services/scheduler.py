"""
Revolution Scheduler — Manages 60-second downlink windows, 3 per day.
Coordinates with Pi TX via serial commands.
"""
import threading
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from flask import current_app
from models import db, Image, Revolution, ImageStatus
from services.protocol import build_serial_frame, build_meta_packet, build_done_packet, PKT_META, PKT_DONE
from services.receiver import get_receiver

logger = logging.getLogger(__name__)


class RevolutionScheduler:
    """Manages downlink revolution windows and coordinates with Pi TX."""

    def __init__(self, socketio=None, app=None):
        self.socketio = socketio
        self.app = app
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.current_revolution: Optional[Revolution] = None
        self.receiver = None

    def start(self):
        """Start the scheduler."""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.thread.start()
        logger.info("Revolution scheduler started")

    def stop(self):
        """Stop the scheduler."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5.0)
        logger.info("Revolution scheduler stopped")

    def _scheduler_loop(self):
        """Main scheduler loop — checks for revolution windows every 10 seconds."""
        while self.running:
            try:
                with self.app.app_context() if self.app else current_app.app_context():
                    self._check_revolution_window()
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
            time.sleep(10)  # Check every 10 seconds

    def _check_revolution_window(self):
        """Check if a revolution window should start/end."""
        now = datetime.utcnow()

        # Check for scheduled revolution that should start
        scheduled = Revolution.query.filter(
            Revolution.status == "scheduled",
            Revolution.window_start <= now
        ).order_by(Revolution.window_start).first()

        if scheduled and not self.current_revolution:
            self._start_revolution(scheduled)

        # Check if current revolution should end
        if self.current_revolution and now >= self.current_revolution.window_end:
            self._end_revolution(self.current_revolution)

    def _start_revolution(self, revolution: Revolution):
        """Start a revolution window."""
        logger.info(f"Starting revolution {revolution.revolution_num} for mission {revolution.mission_id}")

        revolution.status = "active"
        revolution.started_at = datetime.utcnow()
        db.session.commit()

        self.current_revolution = revolution

        # Emit WebSocket event
        if self.socketio:
            self.socketio.emit("revolution:start", {
                "revolution_num": revolution.revolution_num,
                "mission_id": revolution.mission_id,
                "window_sec": revolution.window_duration_sec,
                "images_in_window": revolution.images_planned or [],
                "started_at": revolution.started_at.isoformat()
            })

        # Send META packets for all planned images to Pi TX
        self._send_meta_packets(revolution)

    def _end_revolution(self, revolution: Revolution):
        """End a revolution window."""
        logger.info(f"Ending revolution {revolution.revolution_num}")

        # Collect results
        completed = []
        failed = []
        total_tx = 0
        total_confirmed = 0

        if revolution.images_planned:
            for img_plan in revolution.images_planned:
                img_id = img_plan.get("id")
                image = Image.query.get(img_id)
                if image:
                    total_tx += image.total_segments or 0
                    total_confirmed += image.segments_confirmed
                    if image.status == "complete":
                        completed.append(img_id)
                    elif image.status in ["transmitting", "queued"]:
                        failed.append(img_id)

        revolution.status = "completed"
        revolution.completed_at = datetime.utcnow()
        revolution.images_completed = completed
        revolution.images_failed = failed
        revolution.total_segments_transmitted = total_tx
        revolution.total_segments_confirmed = total_confirmed

        db.session.commit()

        # Emit WebSocket event
        if self.socketio:
            self.socketio.emit("revolution:end", {
                "revolution_num": revolution.revolution_num,
                "mission_id": revolution.mission_id,
                "completed": completed,
                "failed": failed,
                "total_segments_transmitted": total_tx,
                "total_segments_confirmed": total_confirmed,
                "ended_at": revolution.completed_at.isoformat()
            })

        self.current_revolution = None

    def _send_meta_packets(self, revolution: Revolution):
        """Send META packets for all images in this revolution to Pi TX."""
        if not revolution.images_planned:
            return

        receiver = get_receiver()
        if not receiver or not receiver.serial_conn:
            logger.warning("No serial connection to send META packets")
            return

        for img_plan in revolution.images_planned:
            img_id = img_plan.get("id")
            image = Image.query.get(img_id)
            if not image:
                continue

            # Build META packet
            meta_packet = build_meta_packet(
                mission_id=revolution.mission_id,
                image_id=img_id,
                total_segments=image.total_segments or 0,
                chunk_size=image.chunk_size or 200,
                classification=image.classification or "UNKNOWN",
                priority=image.priority or 99,
                jpeg_quality=image.jpeg_quality or 85,
                file_size=0  # TODO: get actual file size
            )

            # Wrap in serial frame and send
            serial_frame = build_serial_frame(meta_packet)
            try:
                receiver.serial_conn.write(serial_frame)
                receiver.serial_conn.flush()
                logger.info(f"Sent META for {img_id} to Pi TX")
            except Exception as e:
                logger.error(f"Failed to send META for {img_id}: {e}")

            # Update image status
            image.status = "transmitting"
            image.transmitted_at = datetime.utcnow()
            db.session.commit()

            time.sleep(0.1)  # Small delay between META packets

    def schedule_next_revolution(self, mission_id: str) -> Optional[Revolution]:
        """Schedule the next revolution for a mission."""
        # Find last revolution number
        last_rev = Revolution.query.filter(
            Revolution.mission_id == mission_id
        ).order_by(Revolution.revolution_num.desc()).first()

        next_num = (last_rev.revolution_num + 1) if last_rev else 1

        # Schedule for next 60-second window boundary
        now = datetime.utcnow()
        # Round up to next minute
        window_start = now.replace(second=0, microsecond=0) + timedelta(minutes=1)

        # Get pending images (classified, queued) ordered by priority
        pending_images = Image.query.filter(
            Image.mission_id == mission_id,
            Image.status.in_([ImageStatus.CLASSIFIED.value, ImageStatus.QUEUED.value])
        ).order_by(Image.priority.asc(), Image.created_at.asc()).all()

        # Limit to what can fit in 60s window (rough estimate)
        # At ~5 kbps LoRa, 60s = ~37 KB = ~185 segments @ 200B
        max_segments = 180
        images_planned = []
        segment_count = 0

        for img in pending_images:
            if img.total_segments and segment_count + img.total_segments <= max_segments:
                images_planned.append({"id": img.id, "priority": img.priority})
                segment_count += img.total_segments
            elif not images_planned:
                # Always include at least one
                images_planned.append({"id": img.id, "priority": img.priority})
                break

        if not images_planned:
            logger.warning(f"No images to schedule for mission {mission_id}")
            return None

        revolution = Revolution(
            revolution_num=next_num,
            mission_id=mission_id,
            window_start=window_start,
            window_end=window_start + timedelta(seconds=60),
            window_duration_sec=60,
            images_planned=images_planned,
            total_segments_planned=segment_count,
            status="scheduled"
        )

        db.session.add(revolution)
        db.session.commit()

        logger.info(f"Scheduled revolution {next_num} for mission {mission_id} at {window_start.isoformat()}")
        return revolution

    def get_revolution_status(self) -> Dict[str, Any]:
        """Get current revolution status."""
        if self.current_revolution:
            return {
                "active": True,
                "revolution": self.current_revolution.to_dict(),
                "time_remaining": max(0, (self.current_revolution.window_end - datetime.utcnow()).total_seconds())
            }
        else:
            next_scheduled = Revolution.query.filter(
                Revolution.status == "scheduled"
            ).order_by(Revolution.window_start).first()

            return {
                "active": False,
                "next_revolution": next_scheduled.to_dict() if next_scheduled else None,
                "time_until_next": max(0, (next_scheduled.window_start - datetime.utcnow()).total_seconds()) if next_scheduled else None
            }


# Singleton
_scheduler_instance: Optional[RevolutionScheduler] = None


def get_scheduler() -> Optional[RevolutionScheduler]:
    return _scheduler_instance


def init_scheduler(socketio, app) -> RevolutionScheduler:
    global _scheduler_instance
    _scheduler_instance = RevolutionScheduler(socketio, app)
    return _scheduler_instance