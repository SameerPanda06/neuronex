from flask import Blueprint, jsonify, request
from sqlalchemy import asc
from models import db, Image, ImageStatus

queue_bp = Blueprint("queue", __name__)


@queue_bp.route("/queue", methods=["GET"])
def get_queue():
    """Get current transmission queue ordered by priority."""
    # Images that are classified and ready to transmit, or currently transmitting
    queue_images = Image.query.filter(
        Image.status.in_([
            ImageStatus.CLASSIFIED.value,
            ImageStatus.QUEUED.value,
            ImageStatus.TRANSMITTING.value
        ])
    ).order_by(asc(Image.priority), asc(Image.created_at)).all()

    return jsonify({
        "queue": [img.to_dict() for img in queue_images],
        "count": len(queue_images)
    })


@queue_bp.route("/queue/reorder", methods=["POST"])
def reorder_queue():
    """Reorder transmission queue (drag-drop from dashboard)."""
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"error": "Expected list of {id, priority}"}), 400

    updated = []
    for item in data:
        image_id = item.get("id")
        priority = item.get("priority")
        if not image_id or priority is None:
            continue

        image = Image.query.get(image_id)
        if image and image.status in [ImageStatus.CLASSIFIED.value, ImageStatus.QUEUED.value]:
            image.priority = priority
            image.status = ImageStatus.QUEUED.value
            updated.append(image.to_dict())

    db.session.commit()
    return jsonify({"updated": updated, "count": len(updated)})


@queue_bp.route("/queue/next", methods=["GET"])
def get_next_image():
    """Get next image to transmit (highest priority)."""
    next_image = Image.query.filter(
        Image.status.in_([ImageStatus.CLASSIFIED.value, ImageStatus.QUEUED.value])
    ).order_by(asc(Image.priority), asc(Image.created_at)).first()

    if not next_image:
        return jsonify({"next": None, "message": "No images in queue"})

    return jsonify({"next": next_image.to_dict()})