#!/usr/bin/env python3
"""
Neuronex Backend — Flask + SocketIO API for Satellite Downlink Dashboard.
"""
import os
import sys
import logging
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# Local imports
from config import config
from models import db, Image, Telemetry, Retransmission, Revolution, ImageStatus, Classification, Action

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = config.SECRET_KEY

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins="*")
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

    # Create tables
    with app.app_context():
        db.create_all()
        logger.info("Database initialized")

    # Register blueprints
    from api.images import images_bp
    from api.telemetry import telemetry_bp
    from api.queue import queue_bp
    from api.retransmit import retransmit_bp
    from api.revolutions import revolutions_bp
    from api.command import bp as command_bp
    from api.schedule import bp as schedule_bp

    app.register_blueprint(images_bp, url_prefix="/api")
    app.register_blueprint(telemetry_bp, url_prefix="/api")
    app.register_blueprint(queue_bp, url_prefix="/api")
    app.register_blueprint(retransmit_bp, url_prefix="/api")
    app.register_blueprint(revolutions_bp, url_prefix="/api")
    app.register_blueprint(command_bp)  # already has /api/command prefix
    app.register_blueprint(schedule_bp)  # already has /api/schedule prefix

    # Health check
    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        })

    # Images stats endpoint (needed for dashboard)
    @app.route("/api/images/stats")
    def images_stats():
        from models import Image, ImageStatus, Classification
        total = Image.query.count()
        by_status = {}
        for s in ImageStatus:
            by_status[s.value] = Image.query.filter(Image.status == s.value).count()
        by_classification = {}
        for c in Classification:
            by_classification[c.value] = Image.query.filter(Image.classification == c.value).count()
        avg_progress = db.session.query(db.func.avg(Image.progress_percent)).scalar() or 0
        return jsonify({
            "total": total,
            "by_status": by_status,
            "by_classification": by_classification,
            "avg_progress": round(float(avg_progress), 1)
        })

    # Queue next endpoint (needed for dashboard)
    @app.route("/api/queue/next")
    def queue_next():
        from models import Image, ImageStatus
        next_img = Image.query.filter(
            Image.status.in_([ImageStatus.QUEUED.value, ImageStatus.CLASSIFIED.value])
        ).order_by(Image.priority.asc()).first()
        return jsonify({"image": next_img.to_dict() if next_img else None})

    
    # SocketIO events
    @socketio.on("connect")
    def handle_connect():
        logger.info(f"Client connected: {request.sid}")
        emit("connected", {"sid": request.sid, "timestamp": datetime.utcnow().isoformat()})

    @socketio.on("disconnect")
    def handle_disconnect():
        logger.info(f"Client disconnected: {request.sid}")

    @socketio.on("retransmit:ack")
    def handle_retransmit_ack(data):
        """Client acknowledges/trigger retransmission."""
        logger.info(f"Retransmit ack from client: {data}")
        # TODO: Forward to Pi TX via serial
        emit("retransmit:ack:confirmed", {"received": data}, broadcast=True)

    @socketio.on("queue:reorder")
    def handle_queue_reorder(data):
        """Client reorders transmission queue."""
        logger.info(f"Queue reorder: {data}")
        # TODO: Update queue in database
        emit("queue:reordered", {"queue": data}, broadcast=True)

    @socketio.on("image:discard")
    def handle_image_discard(data):
        """Client marks image as discarded."""
        logger.info(f"Image discard: {data}")
        # TODO: Update image status
        emit("image:discarded", {"received": data}, broadcast=True)

    # Background task: emit telemetry updates
    def emit_telemetry_loop():
        """Background task to emit telemetry to connected clients."""
        import time
        while True:
            try:
                with app.app_context():
                    # Get latest telemetry
                    latest = Telemetry.query.order_by(Telemetry.timestamp.desc()).first()
                    if latest:
                        image = db.session.get(Image,latest.image_id)
                        socketio.emit("telemetry:update", {
                            "image_id": latest.image_id,
                            "mission_id": latest.mission_id,
                            "packet_type": latest.packet_type,
                            "segment_num": latest.segment_num,
                            "total_segments": latest.total_segments,
                            "rssi": latest.rssi,
                            "snr": latest.snr,
                            "latency_ms": latest.latency_ms,
                            "timestamp": latest.timestamp.isoformat(),
                            "progress": image.progress_percent if image else 0,
                        })
            except Exception as e:
                logger.error(f"Telemetry emit error: {e}")
            time.sleep(0.5)  # 2 Hz updates

    # Start background task
    socketio.start_background_task(emit_telemetry_loop)

    # Start scheduler thread (emits schedule state every second)
    from services.scheduler import start_scheduler_thread
    start_scheduler_thread(socketio)

    # Start command sender thread (sends queued PKT_CMD to ESP32 via serial)
    def send_commands_loop():
        import time
        from services.receiver import get_receiver
        from api.command import pop_next_command, has_pending_commands

        while True:
            try:
                if has_pending_commands():
                    cmd_packet = pop_next_command()
                    if cmd_packet:
                        receiver = get_receiver()
                        if receiver and receiver.serial_conn and receiver.serial_conn.is_open:
                            # Send raw command packet (will be framed by ESP32 for LoRa TX)
                            receiver.serial_conn.write(cmd_packet)
                            logger.info(f"Sent CMD to ESP32: {cmd_packet.hex()}")
            except Exception as e:
                logger.error(f"Command send error: {e}")
            time.sleep(0.5)

    socketio.start_background_task(send_commands_loop)

    return app, socketio


app, socketio = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    logger.info(f"Starting Neuronex Backend on port {port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=config.FLASK_DEBUG)