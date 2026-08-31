import socketio
import time

sio = socketio.Client()

events_received = []

@sio.on("connected")
def on_connected(data):
    events_received.append(("connected", data))
    print(f"[WS] Connected: {data}")

@sio.on("pong")
def on_pong(data):
    events_received.append(("pong", data))
    print(f"[WS] Pong: {data}")

@sio.on("telemetry:subscribed")
def on_telem_sub(data):
    events_received.append(("telemetry:subscribed", data))
    print(f"[WS] Telemetry subscribed: {data}")

@sio.on("queue:subscribed")
def on_queue_sub(data):
    events_received.append(("queue:subscribed", data))
    print(f"[WS] Queue subscribed: {data}")

@sio.on("schedule:update")
def on_sched_update(data):
    events_received.append(("schedule:update", data))

print("Connecting to WebSocket at http://127.0.0.1:5000...")
sio.connect("http://127.0.0.1:5000", transports=["websocket", "polling"])



sio.emit("ping", {"timestamp": time.time()})
sio.emit("join:telemetry", {})
sio.emit("join:queue", {})

# Wait 2 seconds for responses and periodic schedule emissions
time.sleep(2)

sio.disconnect()

event_names = [e[0] for e in events_received]
print(f"Events received: {set(event_names)}")

assert "connected" in event_names, "Missing 'connected' event"
assert "pong" in event_names, "Missing 'pong' event"
assert "telemetry:subscribed" in event_names, "Missing 'telemetry:subscribed' event"
assert "queue:subscribed" in event_names, "Missing 'queue:subscribed' event"
assert "schedule:update" in event_names, "Missing 'schedule:update' event"

print("\n=== Live WebSocket Integration Test PASSED ===")
