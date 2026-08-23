from flask import Blueprint, jsonify, request
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from models import db, Telemetry, Image

telemetry_bp = Blueprint("telemetry", __name__)


@telemetry_bp.route("/telemetry", methods=["GET"])
def get_latest_telemetry():
    """Get latest telemetry snapshot."""
    # Latest overall
    latest = Telemetry.query.order_by(desc(Telemetry.timestamp)).first()

    # Latest per image (for dashboard cards)
    subquery = db.session.query(
        Telemetry.image_id,
        func.max(Telemetry.timestamp).label("max_ts")
    ).group_by(Telemetry.image_id).subquery()

    latest_per_image = db.session.query(Telemetry).join(
        subquery,
        (Telemetry.image_id == subquery.c.image_id) & (Telemetry.timestamp == subquery.c.max_ts)
    ).all()

    return jsonify({
        "latest_overall": latest.to_dict() if latest else None,
        "latest_per_image": [t.to_dict() for t in latest_per_image]
    })


@telemetry_bp.route("/telemetry/history", methods=["GET"])
def get_telemetry_history():
    """Get time-series telemetry for charts."""
    image_id = request.args.get("image_id")
    mission_id = request.args.get("mission_id")
    hours = int(request.args.get("hours", 24))
    limit = int(request.args.get("limit", 1000))

    since = datetime.utcnow() - timedelta(hours=hours)

    query = Telemetry.query.filter(Telemetry.timestamp >= since)

    if image_id:
        query = query.filter(Telemetry.image_id == image_id)
    if mission_id:
        query = query.filter(Telemetry.mission_id == mission_id)

    telemetry = query.order_by(desc(Telemetry.timestamp)).limit(limit).all()

    # Group by packet type for charting
    by_type = {}
    for t in telemetry:
        if t.packet_type not in by_type:
            by_type[t.packet_type] = []
        by_type[t.packet_type].append(t.to_dict())

    return jsonify({
        "telemetry": [t.to_dict() for t in telemetry],
        "by_type": by_type,
        "count": len(telemetry),
        "since": since.isoformat()
    })


@telemetry_bp.route("/telemetry/signal", methods=["GET"])
def get_signal_quality():
    """Get signal quality metrics (RSSI/SNR) over time."""
    image_id = request.args.get("image_id")
    hours = int(request.args.get("hours", 24))

    since = datetime.utcnow() - timedelta(hours=hours)

    query = Telemetry.query.filter(
        Telemetry.timestamp >= since,
        Telemetry.rssi.isnot(None),
        Telemetry.snr.isnot(None)
    )

    if image_id:
        query = query.filter(Telemetry.image_id == image_id)

    telemetry = query.order_by(Telemetry.timestamp).all()

    # Compute statistics
    rssi_values = [t.rssi for t in telemetry if t.rssi is not None]
    snr_values = [t.snr for t in telemetry if t.snr is not None]

    stats = {}
    if rssi_values:
        stats["rssi"] = {
            "min": min(rssi_values),
            "max": max(rssi_values),
            "avg": round(sum(rssi_values) / len(rssi_values), 1),
            "current": rssi_values[-1] if rssi_values else None
        }
    if snr_values:
        stats["snr"] = {
            "min": min(snr_values),
            "max": max(snr_values),
            "avg": round(sum(snr_values) / len(snr_values), 1),
            "current": snr_values[-1] if snr_values else None
        }

    return jsonify({
        "telemetry": [t.to_dict() for t in telemetry],
        "stats": stats,
        "count": len(telemetry)
    })