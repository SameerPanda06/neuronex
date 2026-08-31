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
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000", "*"]}}, supports_credentials=True)
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

    app.register_blueprint(images_bp, url_prefix="/api/images")
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

    # Register SocketIO events & rooms
    from websocket.events import register_socketio_events
    register_socketio_events(socketio)

    # Initialize Serial Receiver (handles hardware failure gracefully)
    from services.receiver import init_receiver
    receiver = init_receiver(config.SERIAL_PORT, config.SERIAL_BAUDRATE, socketio, app)
    receiver.start()

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
                        image = db.session.get(Image, latest.image_id)
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
                        }, room="telemetry")
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
                        recv = get_receiver()
                        if recv and recv.serial_conn and recv.serial_conn.is_open:
                            # Send raw command packet (will be framed by ESP32 for LoRa TX)
                            recv.serial_conn.write(cmd_packet)
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
    socketio.run(app, host="0.0.0.0", port=port, debug=config.FLASK_DEBUG, allow_unsafe_werkzeug=True)