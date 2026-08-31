"""
Scheduler Service — 12 revolutions/day, downlink window management,
countdown timers for dashboard.
"""
import threading
import time
from datetime import datetime, timedelta
from typing import Optional, Callable
from dataclasses import dataclass

# Schedule: 12 revolutions per day = every 2 hours
REVS_PER_DAY = 12
INTERVAL_SEC = 86400 // REVS_PER_DAY  # 7200 seconds = 2 hours
DOWNLINK_WINDOW_SEC = 180  # 3 minutes

# Fixed schedule: revolutions at 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
# Or configurable offset from midnight

@dataclass
class ScheduleState:
    """Current schedule state for dashboard."""
    revs_per_day: int
    interval_sec: int
    window_sec: int
    current_rev: int
    window_active: bool
    window_start: Optional[datetime]
    window_end: Optional[datetime]
    next_rev_start: Optional[datetime]
    seconds_until_window: int
    seconds_until_next_rev: int
    is_in_window: bool
    progress_percent: float  # 0-100% through current window or inter-window period

class ScheduleManager:
    """Manages the 12-rev/day schedule and provides countdown timers."""

    def __init__(self, start_offset_minutes: int = 0):
        """
        Args:
            start_offset_minutes: Minutes after midnight for first revolution (0 = 00:00)
        """
        self.start_offset = start_offset_minutes * 60
        self._lock = threading.RLock()
        self._callbacks = []

    def register_callback(self, cb: Callable[[ScheduleState], None]):
        """Register callback for schedule updates."""
        self._callbacks.append(cb)

    def _notify(self, state: ScheduleState):
        for cb in self._callbacks:
            try:
                cb(state)
            except Exception as e:
                print(f"[SCHEDULER] Callback error: {e}")

    def get_state(self, at_time: Optional[datetime] = None) -> ScheduleState:
        """Get current schedule state."""
        now = at_time or datetime.utcnow()
        return self._compute_state(now)

    def _compute_state(self, now: datetime) -> ScheduleState:
        """Compute schedule state at given time."""
        # Seconds since midnight
        secs_since_midnight = (now - now.replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds()
        secs_since_midnight += self.start_offset

        # Current revolution number (0-indexed)
        rev_number = int(secs_since_midnight // INTERVAL_SEC)
        rev_start = now.replace(hour=0, minute=0, second=0, microsecond=0) + \
                    timedelta(seconds=self.start_offset) + \
                    timedelta(seconds=rev_number * INTERVAL_SEC)

        # Window timing
        window_start = rev_start
        window_end = rev_start + timedelta(seconds=DOWNLINK_WINDOW_SEC)
        next_rev_start = rev_start + timedelta(seconds=INTERVAL_SEC)

        # Check if in window
        is_in_window = window_start <= now < window_end
        window_active = is_in_window

        # Countdowns
        if is_in_window:
            seconds_until_window = int((window_end - now).total_seconds())
            seconds_until_next_rev = int((next_rev_start - now).total_seconds())
        else:
            seconds_until_window = int((window_start - now).total_seconds())
            if seconds_until_window < 0:
                seconds_until_window += INTERVAL_SEC
            seconds_until_next_rev = seconds_until_window + DOWNLINK_WINDOW_SEC

        # Progress: 0-100% through current phase
        if is_in_window:
            elapsed = (now - window_start).total_seconds()
            progress = (elapsed / DOWNLINK_WINDOW_SEC) * 100
        else:
            # Time until next window as % of inter-window period
            inter_window = INTERVAL_SEC - DOWNLINK_WINDOW_SEC
            until_window = seconds_until_window
            progress = (1 - (until_window / inter_window)) * 100

        return ScheduleState(
            revs_per_day=REVS_PER_DAY,
            interval_sec=INTERVAL_SEC,
            window_sec=DOWNLINK_WINDOW_SEC,
            current_rev=rev_number,
            window_active=window_active,
            window_start=window_start,
            window_end=window_end,
            next_rev_start=next_rev_start,
            seconds_until_window=max(0, seconds_until_window),
            seconds_until_next_rev=max(0, seconds_until_next_rev),
            is_in_window=is_in_window,
            progress_percent=max(0, min(100, progress))
        )

    def format_countdown(self, seconds: int) -> str:
        """Format seconds as HH:MM:SS or MM:SS."""
        if seconds >= 3600:
            h = seconds // 3600
            m = (seconds % 3600) // 60
            s = seconds % 60
            return f"{h:02d}:{m:02d}:{s:02d}"
        else:
            m = seconds // 60
            s = seconds % 60
            return f"{m:02d}:{s:02d}"

    def get_dashboard_data(self) -> dict:
        """Get formatted data for dashboard."""
        state = self.get_state()

        return {
            "revs_per_day": REVS_PER_DAY,
            "interval_hours": INTERVAL_SEC // 3600,
            "window_minutes": DOWNLINK_WINDOW_SEC // 60,
            "current_revolution": state.current_rev + 1,
            "total_revs_today": REVS_PER_DAY,
            "window_active": state.window_active,
            "is_in_window": state.is_in_window,
            "downlink_countdown": self.format_countdown(state.seconds_until_window),
            "next_rev_countdown": self.format_countdown(state.seconds_until_next_rev),
            "window_start_utc": state.window_start.isoformat() if state.window_start else None,
            "window_end_utc": state.window_end.isoformat() if state.window_end else None,
            "next_rev_utc": state.next_rev_start.isoformat() if state.next_rev_start else None,
            "progress_percent": round(state.progress_percent, 1),
            "phase": "downlink" if state.is_in_window else "orbit",
        }

# Global instance
_scheduler_instance: Optional[ScheduleManager] = None

def get_scheduler() -> ScheduleManager:
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = ScheduleManager()
    return _scheduler_instance

def start_scheduler_thread(socketio=None):
    """Start background thread that emits schedule updates."""
    scheduler = get_scheduler()

    def run():
        while True:
            state = scheduler.get_state()
            scheduler._notify(state)
            # Emit to WebSocket if socketio available
            if socketio:
                try:
                    socketio.emit("schedule:update", scheduler.get_dashboard_data())
                except Exception as e:
                    print(f"[SCHEDULER] Socket emit error: {e}")
            time.sleep(1)  # Update every second

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    print("[SCHEDULER] Started 12-rev/day schedule thread")
    return thread