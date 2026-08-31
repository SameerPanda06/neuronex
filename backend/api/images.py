"""
Images API — Query and manage stored images.
"""
from flask import Blueprint, request, jsonify, send_file
from services.storage import get_storage
from models import db, Image, ImageStatus
from sqlalchemy import desc
import logging

logger = logging.getLogger(__name__)
images_bp = Blueprint("images", __name__)

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

@images_bp.route("/<image_id>", methods=["GET"])
def get_image(image_id):
    """Get image details."""
    image = db.session.get(Image, image_id)
    if not image:
        return jsonify({"error": "Not found"}), 404
    return jsonify(image.to_dict())

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

# Need to import asdict for storage_list
from dataclasses import asdict