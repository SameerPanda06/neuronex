"""
Schedule API — Downlink window countdown timers for dashboard.
"""
from flask import Blueprint, request, jsonify
from services.scheduler import get_scheduler, ScheduleManager

bp = Blueprint("schedule", __name__, url_prefix="/api/schedule")

@bp.route("/state", methods=["GET"])
def get_schedule_state():
    """Get current schedule state for dashboard."""
    scheduler = get_scheduler()
    return jsonify(scheduler.get_dashboard_data())

@bp.route("/next-revolution", methods=["GET"])
def get_next_revolution():
    """Get next revolution details."""
    scheduler = get_scheduler()
    state = scheduler.get_state()
    return jsonify({
        "current_revolution": state.current_rev + 1,
        "total_revs_today": state.revs_per_day,
        "next_rev_start_utc": state.next_rev_start.isoformat() if state.next_rev_start else None,
        "countdown": scheduler.format_countdown(state.seconds_until_next_rev),
    })

@bp.route("/window", methods=["GET"])
def get_window_state():
    """Get current downlink window state."""
    scheduler = get_scheduler()
    state = scheduler.get_state()
    return jsonify({
        "active": state.window_active,
        "is_in_window": state.is_in_window,
        "window_start_utc": state.window_start.isoformat() if state.window_start else None,
        "window_end_utc": state.window_end.isoformat() if state.window_end else None,
        "downlink_countdown": scheduler.format_countdown(state.seconds_until_window),
        "progress_percent": state.progress_percent,
    })

@bp.route("/config", methods=["GET"])
def get_schedule_config():
    """Get schedule configuration."""
    return jsonify({
        "revs_per_day": 12,
        "interval_hours": 2,
        "window_minutes": 3,
        "first_rev_utc": "00:00",
    })