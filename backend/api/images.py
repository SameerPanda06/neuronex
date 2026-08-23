from flask import Blueprint, jsonify, request
from sqlalchemy import desc, func
from models import db, Image, ImageStatus, Classification, Action

images_bp = Blueprint("images", __name__)


@images_bp.route("/images", methods=["GET"])
def list_images():
    """List all images with optional filtering."""
    # Query params
    status = request.args.get("status")  # pending, classified, queued, transmitting, complete, discarded, failed
    classification = request.args.get("classification")  # CLEAR, CLOUDY, NOT_VISIBLE
    mission_id = request.args.get("mission_id")
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))
    sort = request.args.get("sort", "priority")  # priority, created_at, progress
    order = request.args.get("order", "asc")

    query = Image.query

    if status:
        query = query.filter(Image.status == status)
    if classification:
        query = query.filter(Image.classification == classification)
    if mission_id:
        query = query.filter(Image.mission_id == mission_id)

    # Sorting
    sort_column = getattr(Image, sort, Image.priority)
    if order == "desc":
        sort_column = desc(sort_column)
    query = query.order_by(sort_column)

    total = query.count()
    images = query.limit(limit).offset(offset).all()

    return jsonify({
        "images": [img.to_dict() for img in images],
        "total": total,
        "limit": limit,
        "offset": offset
    })


@images_bp.route("/images/<string:image_id>", methods=["GET"])
def get_image(image_id):
    """Get single image details."""
    image = Image.query.get_or_404(image_id)
    return jsonify(image.to_dict())


@images_bp.route("/images/<string:image_id>/progress", methods=["GET"])
def get_image_progress(image_id):
    """Get real-time transmission progress for an image."""
    image = Image.query.get_or_404(image_id)
    return jsonify({
        "image_id": image.id,
        "status": image.status,
        "total_segments": image.total_segments,
        "segments_confirmed": image.segments_confirmed,
        "current_segment": image.current_segment,
        "progress_percent": image.progress_percent,
        "rssi": image.rssi,
        "snr": image.snr,
        "throughput_bps": image.throughput_bps,
        "latency_ms_tx": image.latency_ms_tx,
    })


@images_bp.route("/images/stats", methods=["GET"])
def get_images_stats():
    """Get aggregate statistics."""
    total = Image.query.count()
    by_status = db.session.query(Image.status, func.count(Image.id)).group_by(Image.status).all()
    by_classification = db.session.query(Image.classification, func.count(Image.id)).group_by(Image.classification).all()
    by_action = db.session.query(Image.action, func.count(Image.id)).group_by(Image.action).all()

    # Transmission stats
    transmitting = Image.query.filter(Image.status == ImageStatus.TRANSMITTING.value).count()
    complete = Image.query.filter(Image.status == ImageStatus.COMPLETE.value).count()
    pending = Image.query.filter(Image.status.in_([ImageStatus.PENDING.value, ImageStatus.CLASSIFIED.value, ImageStatus.QUEUED.value])).count()

    return jsonify({
        "total": total,
        "by_status": {k: v for k, v in by_status},
        "by_classification": {k: v for k, v in by_classification},
        "by_action": {k: v for k, v in by_action},
        "transmitting": transmitting,
        "complete": complete,
        "pending": pending,
        "completion_rate": round(complete / total * 100, 1) if total > 0 else 0,
    })