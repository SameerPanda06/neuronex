"""
Images API — Query and manage stored images.
"""
from dataclasses import asdict
from flask import Blueprint, request, jsonify, send_file
from services.storage import get_storage
from models import db, Image, ImageStatus, Classification, Action
from sqlalchemy import desc
import logging

logger = logging.getLogger(__name__)
images_bp = Blueprint("images", __name__)


@images_bp.route("", methods=["GET"])
@images_bp.route("/", methods=["GET"])
def list_images():
    """List images with optional filters."""
    mission_id = request.args.get("mission_id")
    classification = request.args.get("classification")
    status = request.args.get("status")
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    query = Image.query

    if mission_id:
        query = query.filter(Image.mission_id == mission_id)
    if classification:
        query = query.filter(Image.classification == classification)
    if status:
        query = query.filter(Image.status == status)

    total = query.count()
    images = query.order_by(desc(Image.created_at)).offset(offset).limit(limit).all()

    return jsonify({
        "images": [img.to_dict() for img in images],
        "total": total,
        "limit": limit,
        "offset": offset
    })


@images_bp.route("/stats", methods=["GET"])
def images_stats():
    """Get aggregate statistics for images."""
    total = Image.query.count()
    by_status = {s.value: Image.query.filter(Image.status == s.value).count() for s in ImageStatus}
    by_classification = {c.value: Image.query.filter(Image.classification == c.value).count() for c in Classification}
    by_action = {a.value: Image.query.filter(Image.action == a.value).count() for a in Action}

    transmitting = by_status.get(ImageStatus.TRANSMITTING.value, 0)
    complete = by_status.get(ImageStatus.COMPLETE.value, 0)
    pending = by_status.get(ImageStatus.PENDING.value, 0) + by_status.get(ImageStatus.QUEUED.value, 0)
    completion_rate = round((complete / total * 100), 1) if total > 0 else 0.0
    avg_progress = db.session.query(db.func.avg(Image.progress_percent)).scalar() or 0.0

    return jsonify({
        "total": total,
        "by_status": by_status,
        "by_classification": by_classification,
        "by_action": by_action,
        "transmitting": transmitting,
        "complete": complete,
        "pending": pending,
        "completion_rate": completion_rate,
        "avg_progress": round(float(avg_progress), 1)
    })


@images_bp.route("/<image_id>", methods=["GET"])
def get_image(image_id):
    """Get image details."""
    image = db.session.get(Image, image_id)
    if not image:
        return jsonify({"error": "Not found"}), 404
    return jsonify(image.to_dict())


@images_bp.route("/<image_id>/progress", methods=["GET"])
def get_image_progress(image_id):
    """Get real-time transmission progress for an image."""
    image = db.session.get(Image, image_id)
    if not image:
        return jsonify({"error": "Not found"}), 404
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
        "latency_ms_tx": image.latency_ms_tx
    })


@images_bp.route("/<image_id>/download", methods=["GET"])
def download_image(image_id):
    """Download reassembled JPEG from local storage."""
    storage = get_storage()
    meta = storage.get_image(image_id)
    if not meta or not meta.local_path:
        return jsonify({"error": "Image not found or not complete"}), 404
    return send_file(meta.local_path, mimetype="image/jpeg", as_attachment=True,
                     download_name=f"{image_id}.jpg")


@images_bp.route("/storage/stats", methods=["GET"])
def storage_stats():
    """Get storage usage statistics."""
    storage = get_storage()
    return jsonify(storage.get_storage_stats())


@images_bp.route("/storage/list", methods=["GET"])
def storage_list():
    """List images from local storage (includes completed JPEGs)."""
    mission_id = request.args.get("mission_id")
    classification = request.args.get("classification")
    limit = int(request.args.get("limit", 100))

    storage = get_storage()
    images = storage.list_images(mission_id=mission_id, classification=classification, limit=limit)

    return jsonify({
        "images": [asdict(img) for img in images],
        "count": len(images)
    })


@images_bp.route("/storage/cleanup", methods=["POST"])
def storage_cleanup():
    """Remove oldest completed images to free space."""
    keep = int(request.args.get("keep", 100))
    storage = get_storage()
    removed = storage.cleanup_old_images(keep_recent=keep)
    return jsonify({"removed": removed, "kept_recent": keep})