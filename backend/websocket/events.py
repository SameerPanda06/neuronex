"""
WebSocket Event Handlers — Real-time events for dashboard.
"""
import logging
from flask import request
from flask_socketio import emit, join_room, leave_room

logger = logging.getLogger(__name__)


# Room names
ROOM_DASHBOARD = "dashboard"
ROOM_TELEMETRY = "telemetry"
ROOM_QUEUE = "queue"


def register_socketio_events(socketio):
    """Register all SocketIO event handlers."""

    @socketio.on("connect")
    def handle_connect(auth=None):
        logger.info(f"Client connected: {request.sid}")
        join_room(ROOM_DASHBOARD)
        emit("connected", {
            "sid": request.sid,
            "message": "Connected to Neuronex Dashboard",
            "version": "1.0.0"
        })

    @socketio.on("disconnect")
    def handle_disconnect():
        logger.info(f"Client disconnected: {request.sid}")
        leave_room(ROOM_DASHBOARD)

    @socketio.on("join:telemetry")
    def handle_join_telemetry(data=None):
        """Subscribe to real-time telemetry updates."""
        join_room(ROOM_TELEMETRY)
        logger.info(f"Client {request.sid} joined telemetry room")
        emit("telemetry:subscribed", {"room": ROOM_TELEMETRY})

    @socketio.on("leave:telemetry")
    def handle_leave_telemetry(data=None):
        leave_room(ROOM_TELEMETRY)
        emit("telemetry:unsubscribed", {"room": ROOM_TELEMETRY})

    @socketio.on("join:queue")
    def handle_join_queue(data=None):
        """Subscribe to queue updates."""
        join_room(ROOM_QUEUE)
        emit("queue:subscribed", {"room": ROOM_QUEUE})

    @socketio.on("leave:queue")
    def handle_leave_queue(data=None):
        leave_room(ROOM_QUEUE)
        emit("queue:unsubscribed", {"room": ROOM_QUEUE})

    # Client → Server actions
    @socketio.on("retransmit:ack")
    def handle_retransmit_ack(data):
        """Client acknowledges retransmission request."""
        logger.info(f"Retransmit ack from {request.sid}: {data}")
        # Forward to scheduler/serial sender
        emit("retransmit:ack:confirmed", {"received": data}, room=ROOM_DASHBOARD)

    @socketio.on("queue:reorder")
    def handle_queue_reorder(data):
        """Client reorders transmission queue via drag-drop."""
        logger.info(f"Queue reorder from {request.sid}: {data}")
        # Broadcast to all dashboard clients
        emit("queue:reordered", {"queue": data, "by": request.sid}, room=ROOM_DASHBOARD)

    @socketio.on("image:discard")
    def handle_image_discard(data):
        """Client marks image as discarded."""
        logger.info(f"Image discard from {request.sid}: {data}")
        emit("image:discarded", {"received": data}, room=ROOM_DASHBOARD)

    @socketio.on("revolution:trigger")
    def handle_revolution_trigger(data):
        """Client manually triggers revolution (for testing)."""
        logger.info(f"Revolution trigger from {request.sid}: {data}")
        emit("revolution:triggered", {"received": data}, room=ROOM_DASHBOARD)

    @socketio.on("ping")
    def handle_ping(data):
        """Health check ping."""
        emit("pong", {"timestamp": data.get("timestamp") if data else None})


# Helper functions for backend services to emit events
def emit_telemetry_update(socketio, data: dict):
    """Emit telemetry update to telemetry room."""
    socketio.emit("telemetry:update", data, room=ROOM_TELEMETRY)


def emit_image_classified(socketio, data: dict):
    """Emit image classification result."""
    socketio.emit("image:classified", data, room=ROOM_DASHBOARD)


def emit_image_progress(socketio, data: dict):
    """Emit image transmission progress."""
    socketio.emit("image:progress", data, room=ROOM_DASHBOARD)


def emit_retransmit_requested(socketio, data: dict):
    """Emit retransmission request."""
    socketio.emit("retransmit:requested", data, room=ROOM_DASHBOARD)


def emit_revolution_start(socketio, data: dict):
    """Emit revolution start."""
    socketio.emit("revolution:start", data, room=ROOM_DASHBOARD)


def emit_revolution_end(socketio, data: dict):
    """Emit revolution end."""
    socketio.emit("revolution:end", data, room=ROOM_DASHBOARD)


def emit_queue_update(socketio, data: dict):
    """Emit queue update."""
    socketio.emit("queue:update", data, room=ROOM_QUEUE)


def emit_image_status_change(socketio, image_id: str, status: str, **kwargs):
    """Emit image status change."""
    data = {"image_id": image_id, "status": status, **kwargs}
    socketio.emit("image:status", data, room=ROOM_DASHBOARD)