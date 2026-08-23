from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from sqlalchemy import desc
from models import db, Revolution, Image, ImageStatus

revolutions_bp = Blueprint("revolutions", __name__)


@revolutions_bp.route("/revolutions", methods=["GET"])
def list_revolutions():
    """List all revolutions with optional filtering."""
    mission_id = request.args.get("mission_id")
    status = request.args.get("status")  # scheduled, active, completed
    limit = int(request.args.get("limit", 50))

    query = Revolution.query

    if mission_id:
        query = query.filter(Revolution.mission_id == mission_id)
    if status:
        query = query.filter(Revolution.status == status)

    revolutions = query.order_by(desc(Revolution.revolution_num)).limit(limit).all()

    return jsonify({
        "revolutions": [r.to_dict() for r in revolutions],
        "count": len(revolutions)
    })


@revolutions_bp.route("/revolutions/current", methods=["GET"])
def get_current_revolution():
    """Get currently active revolution (if any)."""
    active = Revolution.query.filter(Revolution.status == "active").first()
    if not active:
        return jsonify({"current": None, "message": "No active revolution"})

    return jsonify({"current": active.to_dict()})


@revolutions_bp.route("/revolutions/<int:revolution_num>", methods=["GET"])
def get_revolution(revolution_num):
    """Get single revolution details."""
    revolution = Revolution.query.filter(Revolution.revolution_num == revolution_num).first_or_404()
    return jsonify(revolution.to_dict())


@revolutions_bp.route("/revolutions/stats", methods=["GET"])
def get_revolution_stats():
    """Get revolution statistics."""
    total = Revolution.query.count()
    completed = Revolution.query.filter(Revolution.status == "completed").count()
    active = Revolution.query.filter(Revolution.status == "active").count()
    scheduled = Revolution.query.filter(Revolution.status == "scheduled").count()

    # Aggregate transmission stats
    revs = Revolution.query.filter(Revolution.status == "completed").all()
    total_segments_planned = sum(r.total_segments_planned for r in revs)
    total_segments_confirmed = sum(r.total_segments_confirmed for r in revs)

    return jsonify({
        "total_revolutions": total,
        "completed": completed,
        "active": active,
        "scheduled": scheduled,
        "total_segments_planned": total_segments_planned,
        "total_segments_confirmed": total_segments_confirmed,
        "overall_success_rate": round(total_segments_confirmed / total_segments_planned * 100, 1) if total_segments_planned > 0 else 0,
    })


@revolutions_bp.route("/revolutions/schedule", methods=["POST"])
def schedule_revolution():
    """Schedule a new revolution (called by Pi TX or scheduler)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    mission_id = data.get("mission_id")
    revolution_num = data.get("revolution_num")
    window_start = data.get("window_start")  # ISO format
    images_planned = data.get("images_planned", [])  # [{"id": "...", "priority": 1}, ...]

    if not mission_id or not revolution_num or not window_start:
        return jsonify({"error": "Missing required fields"}), 400

    window_start_dt = datetime.fromisoformat(window_start.replace("Z", "+00:00"))
    window_end_dt = window_start_dt + timedelta(seconds=60)

    # Calculate total segments
    total_segments = 0
    for img_plan in images_planned:
        img = Image.query.get(img_plan["id"])
        if img and img.total_segments:
            total_segments += img.total_segments

    revolution = Revolution(
        revolution_num=revolution_num,
        mission_id=mission_id,
        window_start=window_start_dt,
        window_end=window_end_dt,
        window_duration_sec=60,
        images_planned=images_planned,
        total_segments_planned=total_segments,
        status="scheduled"
    )

    db.session.add(revolution)
    db.session.commit()

    return jsonify({"revolution": revolution.to_dict()}), 201


@revolutions_bp.route("/revolutions/<int:revolution_num>/start", methods=["POST"])
def start_revolution(revolution_num):
    """Mark revolution as started."""
    revolution = Revolution.query.filter(Revolution.revolution_num == revolution_num).first_or_404()
    revolution.status = "active"
    revolution.started_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"revolution": revolution.to_dict()})


@revolutions_bp.route("/revolutions/<int:revolution_num>/complete", methods=["POST"])
def complete_revolution(revolution_num):
    """Mark revolution as completed."""
    data = request.get_json() or {}
    revolution = Revolution.query.filter(Revolution.revolution_num == revolution_num).first_or_404()

    revolution.status = "completed"
    revolution.completed_at = datetime.utcnow()
    revolution.images_completed = data.get("images_completed", [])
    revolution.images_failed = data.get("images_failed", [])
    revolution.total_segments_transmitted = data.get("total_segments_transmitted", 0)
    revolution.total_segments_confirmed = data.get("total_segments_confirmed", 0)

    db.session.commit()

    return jsonify({"revolution": revolution.to_dict()})