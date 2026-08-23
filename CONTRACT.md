# Neuronex Dashboard Contract

**Single Source of Truth** for frontend-backend communication.
Frontend builds against this contract; backend implements this contract.

---

## REST API Endpoints

Base URL: `http://localhost:5000/api`

### Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/images` | List all images with filtering |
| GET | `/images/:id` | Get single image details |
| GET | `/images/:id/progress` | Get real-time transmission progress |
| GET | `/images/stats` | Get aggregate statistics |

**Query Parameters for `/images`:**
- `status`: Filter by status (`pending`, `classified`, `queued`, `transmitting`, `complete`, `discarded`, `failed`)
- `classification`: Filter by ML classification (`CLEAR`, `CLOUDY`, `NOT_VISIBLE`)
- `mission_id`: Filter by mission
- `limit`: Max results (default 100)
- `offset`: Pagination offset
- `sort`: Sort field (`priority`, `created_at`, `confidence`)
- `order`: `asc` or `desc`

### Telemetry

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/telemetry` | Latest telemetry snapshot |
| GET | `/telemetry/history` | Time-series telemetry for charts |
| GET | `/telemetry/signal` | RSSI/SNR signal quality over time |

### Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/queue` | Current transmission queue (priority ordered) |
| POST | `/queue/reorder` | Reorder queue (drag-drop) |
| GET | `/queue/next` | Next image to transmit |

### Retransmissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/retransmissions` | Pending retransmission requests |
| GET | `/retransmissions/:id` | Single retransmission details |
| POST | `/retransmissions/ack` | Acknowledge/trigger resend |
| POST | `/retransmissions/:id/complete` | Mark completed |
| GET | `/retransmissions/stats` | Retransmission statistics |

### Revolutions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/revolutions` | List all revolutions |
| GET | `/revolutions/current` | Currently active revolution |
| GET | `/revolutions/:num` | Single revolution details |
| GET | `/revolutions/stats` | Revolution statistics |
| POST | `/revolutions/schedule` | Schedule new revolution |
| POST | `/revolutions/:num/start` | Mark started |
| POST | `/revolutions/:num/complete` | Mark completed |
| GET | `/revolutions/status` | Current revolution status |

---

## WebSocket Events (SocketIO)

Namespace: `/` (default)

### Server → Client (Frontend Subscribes)

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ sid, timestamp }` | Connection established |
| `telemetry:update` | `TelemetryUpdateEvent` | Real-time signal update (2 Hz) |
| `image:classified` | `ImageClassifiedEvent` | ML classification complete |
| `image:progress` | `ImageProgressEvent` | Transmission progress update |
| `retransmit:requested` | `RetransmitRequestedEvent` | ESP32 requests missing segments |
| `revolution:start` | `RevolutionStartEvent` | Revolution window opened |
| `revolution:end` | `RevolutionEndEvent` | Revolution window closed |
| `queue:update` | `{ queue: Image[] }` | Queue reordered |
| `image:status` | `{ image_id, status }` | Image status changed |

### Client → Server (Frontend Emits)

| Event | Payload | Description |
|-------|---------|-------------|
| `join:telemetry` | `{}` | Subscribe to telemetry updates |
| `leave:telemetry` | `{}` | Unsubscribe from telemetry |
| `join:queue` | `{}` | Subscribe to queue updates |
| `leave:queue` | `{}` | Unsubscribe from queue |
| `retransmit:ack` | `RetransmitAckEvent` | Acknowledge retransmission |
| `queue:reorder` | `QueueReorderEvent[]` | Reorder transmission queue |
| `image:discard` | `ImageDiscardEvent` | Mark image as discarded |
| `revolution:trigger` | `{}` | Manually trigger revolution (testing) |
| `ping` | `{ timestamp }` | Health check |

---

## Data Schemas

### Image
```typescript
interface Image {
  id: string;                    // "IMG-000001"
  mission_id: string;            // "NEX-000001"
  file_path: string;
  classification: "CLEAR" | "CLOUDY" | "NOT_VISIBLE" | null;
  confidence: number | null;     // 0.0 - 1.0
  all_probabilities: Record<string, number> | null;
  latency_ms: number | null;     // ML inference time
  classified_at: string | null;  // ISO timestamp
  action: "keep" | "defer" | "discard" | null;
  priority: number;              // Lower = higher priority
  jpeg_quality: number | null;   // 40-85
  status: "pending" | "classified" | "queued" | "transmitting" | "complete" | "discarded" | "failed";
  total_segments: number | null;
  segments_confirmed: number;
  current_segment: number;
  chunk_size: number | null;
  rssi: number | null;           // dBm
  snr: number | null;            // dB
  throughput_bps: number | null;
  latency_ms_tx: number | null;
  progress_percent: number;      // 0-100
  created_at: string;
  updated_at: string;
  transmitted_at: string | null;
  completed_at: string | null;
}
```

### TelemetryUpdateEvent
```typescript
interface TelemetryUpdateEvent {
  image_id: string;
  mission_id: string;
  packet_type: "DATA" | "ACK" | "NACK" | "META" | "STATUS" | "DONE" | "TELEMETRY";
  segment_num: number | null;
  total_segments: number | null;
  rssi: number | null;       // dBm
  snr: number | null;        // dB
  latency_ms: number | null;
  timestamp: string;         // ISO
  progress: number;          // 0-100
}
```

### ImageClassifiedEvent
```typescript
interface ImageClassifiedEvent {
  id: string;
  mission_id: string;
  classification: "CLEAR" | "CLOUDY" | "NOT_VISIBLE";
  confidence: number;
  priority: number;
  action: "keep" | "defer" | "discard";
}
```

### ImageProgressEvent
```typescript
interface ImageProgressEvent {
  id: string;
  segments_confirmed: number;
  segments_total: number;
  status: ImageStatus;
}
```

### RetransmitRequestedEvent
```typescript
interface RetransmitRequestedEvent {
  image_id: string;
  mission_id: string;
  missing_segments: number[];  // e.g., [1, 5, 12, 45]
}
```

### RevolutionStartEvent
```typescript
interface RevolutionStartEvent {
  revolution_num: number;
  mission_id: string;
  window_sec: number;          // 60
  images_in_window: { id: string; priority: number }[];
  started_at: string;          // ISO
}
```

### RevolutionEndEvent
```typescript
interface RevolutionEndEvent {
  revolution_num: number;
  mission_id: string;
  completed: string[];         // image IDs
  failed: string[];            // image IDs
  total_segments_transmitted: number;
  total_segments_confirmed: number;
  ended_at: string;            // ISO
}
```

### RetransmitAckEvent (Client → Server)
```typescript
interface RetransmitAckEvent {
  image_id: string;
  segments: number[];          // Specific segments to resend
}
```

### QueueReorderEvent (Client → Server)
```typescript
interface QueueReorderEvent {
  id: string;
  priority: number;
}
```

### ImageDiscardEvent (Client → Server)
```typescript
interface ImageDiscardEvent {
  id: string;
}
```

---

## Signal Quality Thresholds

| Quality | RSSI (dBm) | SNR (dB) | Color |
|---------|------------|----------|-------|
| Excellent | ≥ -70 | ≥ 10 | Green (`#22c55e`) |
| Good | -70 to -85 | 5 to 10 | Lime (`#84cc16`) |
| Fair | -85 to -100 | 0 to 5 | Yellow (`#eab308`) |
| Poor | -100 to -115 | -5 to 0 | Orange (`#f97316`) |
| Critical | < -115 | < -5 | Red (`#ef4444`) |

---

## Protocol Constants (Shared)

```python
PROTOCOL_VERSION = 1
HEADER_FORMAT = "!B B 6s 6s H H H 16s"
HEADER_SIZE = 36

PKT_DATA = 0
PKT_ACK = 1
PKT_NACK = 2
PKT_META = 3
PKT_STATUS = 4
PKT_DONE = 5
PKT_TELEMETRY = 6

FRAME_START = 0xAA
MAX_PAYLOAD = 255
```

---

## Revolution Schedule

- **Window Duration**: 60 seconds
- **Revolutions Per Day**: 3
- **Total Daily Downlink**: 180 seconds
- **LoRa Config**: SF7, BW125, CR5, 433MHz, Sync 0x12

---

## Frontend Implementation Notes

1. **Connect on mount**: `socketService.connect()`
2. **Join rooms**: `joinTelemetry()`, `joinQueue()`
3. **Subscribe to events**: Use `socketService.on(event, callback)`
4. **Emit actions**: Use `socketService.emit(event, data)`
5. **Fallback polling**: REST endpoints polled as backup (5-30s intervals)
6. **Optimistic UI**: Update local state immediately, sync with server response

---

## Backend Implementation Notes

1. **Maintain `openapi.yaml`** as source of truth for REST
2. **Emit WebSocket events** from serial receiver & scheduler
3. **Validate all inputs** against schemas
4. **Return 400 for invalid requests**, 404 for not found
5. **Use SQLite** for development, PostgreSQL for production
6. **Run background tasks** with eventlet workers