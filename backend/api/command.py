"""
Command API — Ground station commands to satellite (priority, reset, status).
"""
from flask import Blueprint, request, jsonify
from services.protocol import build_cmd_packet, PKT_CMD, CMD_PRIORITY, CMD_RESET, CMD_STATUS_REQ
from services.receiver import get_receiver
import logging

logger = logging.getLogger(__name__)
bp = Blueprint("command", __name__, url_prefix="/api/command")

# In-memory command queue (sent via serial to ESP32 -> LoRa -> Pi)
_command_queue = []

@bp.route("/priority", methods=["POST"])
def set_priority():
    """Set priority bucket on satellite: 1=CLEAR, 2=CLEAR+CLOUDY."""
    data = request.get_json() or {}
    priority = data.get("priority", 1)

    if priority not in (1, 2):
        return jsonify({"error": "priority must be 1 (CLEAR) or 2 (CLEAR+CLOUDY)"}), 400

    # Build PKT_CMD packet (broadcast mission/image)
    # Uses sentinel IDs since it's a broadcast command
    packet = build_cmd_packet("GROUND", "CMD", CMD_PRIORITY, priority)
    _command_queue.append(packet)

    logger.info(f"Queued CMD_PRIORITY={priority}")
    return jsonify({"status": "queued", "priority": priority, "cmd": "PRIORITY"})

@bp.route("/reset", methods=["POST"])
def reset_satellite():
    """Clear ESP32 NVS state (force fresh start)."""
    packet = build_cmd_packet("GROUND", "CMD", CMD_RESET, 0)
    _command_queue.append(packet)
    logger.info("Queued CMD_RESET")
    return jsonify({"status": "queued", "cmd": "RESET"})

@bp.route("/status", methods=["POST"])
def request_status():
    """Request status echo from ESP32."""
    packet = build_cmd_packet("GROUND", "CMD", CMD_STATUS_REQ, 0)
    _command_queue.append(packet)
    logger.info("Queued CMD_STATUS_REQ")
    return jsonify({"status": "queued", "cmd": "STATUS_REQ"})

@bp.route("/queue", methods=["GET"])
def get_queue():
    """Get pending commands."""
    return jsonify({"queued": len(_command_queue)})

def pop_next_command():
    """Pop next command packet for serial transmission."""
    if _command_queue:
        return _command_queue.pop(0)
    return None

def has_pending_commands():
    return len(_command_queue) > 0