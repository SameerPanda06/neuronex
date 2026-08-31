from flask import Blueprint, jsonify, request
from datetime import datetime
from models import db, Retransmission, Image, ImageStatus

retransmit_bp = Blueprint("retransmit", __name__)


@retransmit_bp.route("/retransmissions", methods=["GET"])
def get_retransmissions():
    """Get all pending retransmission requests."""
    status = request.args.get("status")  # pending, acknowledged, completed
    image_id = request.args.get("image_id")
    limit = int(request.args.get("limit", 100))

    query = Retransmission.query

    if status:
        query = query.filter(Retransmission.status == status)
    if image_id:
        query = query.filter(Retransmission.image_id == image_id)

    retransmissions = query.order_by(Retransmission.requested_at.desc()).limit(limit).all()

    return jsonify({
        "retransmissions": [r.to_dict() for r in retransmissions],
        "count": len(retransmissions)
    })


@retransmit_bp.route("/retransmissions/<int:retransmit_id>", methods=["GET"])
def get_retransmission(retransmit_id):
    """Get single retransmission request."""
    retrans = db.get_or_404(Retransmission, retransmit_id)
    return jsonify(retrans.to_dict())


@retransmit_bp.route("/retransmissions/ack", methods=["POST"])
def acknowledge_retransmission():
    """Acknowledge retransmission request (from dashboard or Pi TX)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    retransmit_id = data.get("retransmit_id")
    image_id = data.get("image_id")
    segments = data.get("segments")  # Optional: specific segments to resend

    if not retransmit_id and not image_id:
        return jsonify({"error": "Either retransmit_id or image_id required"}), 400

    if retransmit_id:
        retrans = db.session.get(Retransmission, retransmit_id)
    else:
        # Get latest pending for this image
        retrans = Retransmission.query.filter(
            Retransmission.image_id == image_id,
            Retransmission.status == "pending"
        ).order_by(Retransmission.requested_at.desc()).first()

    if not retrans:
        return jsonify({"error": "Retransmission not found"}), 404

    retrans.status = "acknowledged"
    retrans.acknowledged_at = datetime.utcnow()
    if segments:
        retrans.missing_segments = segments
    db.session.commit()

    # TODO: Forward to Pi TX via serial queue
    # This will be picked up by the serial sender

    return jsonify({
        "retransmission": retrans.to_dict(),
        "message": "Acknowledged, will be sent in next revolution"
    })


@retransmit_bp.route("/retransmissions/<int:retransmit_id>/complete", methods=["POST"])
def complete_retransmission(retransmit_id):
    """Mark retransmission as completed."""
    retrans = db.get_or_404(Retransmission, retransmit_id)
    retrans.status = "completed"
    retrans.completed_at = datetime.utcnow()
    db.session.commit()


    # Check if image is now complete
    image = db.session.get(Image, retrans.image_id)
    if image and image.segments_confirmed >= image.total_segments:
        image.status = ImageStatus.COMPLETE.value
        image.progress_percent = 100.0
        image.completed_at = datetime.utcnow()
        db.session.commit()

    return jsonify({
        "retransmission": retrans.to_dict(),
        "image": image.to_dict() if image else None
    })


@retransmit_bp.route("/retransmissions/stats", methods=["GET"])
def get_retransmission_stats():
    """Get retransmission statistics."""
    total = Retransmission.query.count()
    pending = Retransmission.query.filter(Retransmission.status == "pending").count()
    acknowledged = Retransmission.query.filter(Retransmission.status == "acknowledged").count()
    completed = Retransmission.query.filter(Retransmission.status == "completed").count()

    # Per image
    by_image = db.session.query(
        Retransmission.image_id,
        db.func.count(Retransmission.id)
    ).group_by(Retransmission.image_id).all()

    return jsonify({
        "total": total,
        "pending": pending,
        "acknowledged": acknowledged,
        "completed": completed,
        "by_image": {k: v for k, v in by_image}
    })