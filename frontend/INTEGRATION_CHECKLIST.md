# NEURONEX Frontend Integration Checklist

This document describes the frontend implementation on the `frontend` branch. The frontend communicates only with the backend REST API and Socket.IO server; it does not directly communicate with Raspberry Pi serial, ESP32, LoRa, or satellite hardware.

## Environment

```powershell
$env:VITE_DATA_MODE='live'
$env:VITE_API_URL='http://localhost:5000'
$env:VITE_WS_URL='ws://localhost:5000'
npm run dev
```

`VITE_API_URL` is the server origin; the frontend adds `/api/...`. The actual socket variable is `VITE_WS_URL`, not `VITE_SOCKET_URL`. Never put credentials or secrets in `VITE_*` variables because Vite exposes them to the browser.

## REST routes currently called

| Priority | Method | Path | Frontend purpose |
|---|---|---|---|
| Critical | GET | `/api/health` | REST reachability and automatic recovery |
| Critical | GET | `/api/images` | Gallery, mission counts, filtered image state |
| Critical | GET | `/api/images/:id` | Image detail/viewer |
| Critical | GET | `/api/images/:id/progress` | Active downlink progress fallback |
| Non-critical | GET | `/api/images/stats` | Aggregate image KPIs |
| Critical | GET | `/api/telemetry` | Latest telemetry snapshot |
| Critical | GET | `/api/telemetry/history` | Telemetry charts |
| Critical | GET | `/api/telemetry/signal` | RSSI/SNR history and statistics |
| Critical | GET | `/api/queue` | Current ordered transmission queue |
| Non-critical | GET | `/api/queue/next` | Next queued image |
| Critical | POST | `/api/queue/reorder` | Persist operator queue order |
| Critical | GET | `/api/retransmissions` | Retransmission list |
| Non-critical | GET | `/api/retransmissions/:id` | Single retransmission detail |
| Critical | POST | `/api/retransmissions/ack` | Acknowledge a retransmission request |
| Critical | POST | `/api/retransmissions/:id/complete` | Mark recovery complete |
| Non-critical | GET | `/api/retransmissions/stats` | Retransmission KPIs |
| Critical | GET | `/api/revolutions` | Pass timeline and history |
| Critical | GET | `/api/revolutions/current` | Current mission/pass snapshot |
| Non-critical | GET | `/api/revolutions/:num` | Single pass detail |
| Non-critical | GET | `/api/revolutions/stats` | Pass KPIs |
| Critical | GET | `/api/revolutions/status` | Active/next pass timing |
| Non-critical | POST | `/api/revolutions/schedule` | DataSource capability; not used by approved screens |
| Non-critical | POST | `/api/revolutions/:num/start` | DataSource capability; not used by approved screens |
| Non-critical | POST | `/api/revolutions/:num/complete` | DataSource capability; not used by approved screens |

Successful JSON responses must place the documented payload directly in the response body.

## Socket.IO server → client events

| Event | Expected payload | Consumers |
|---|---|---|
| `telemetry:update` | `TelemetryUpdateEvent` | Telemetry hooks, Signal Analytics, Mission Control, Live Downlink |
| `image:classified` | `ImageClassifiedEvent` | Image hook and AI Gallery |
| `image:progress` | `ImageProgressEvent` | Image hooks and Live Downlink |
| `image:status` | `{ image_id: string; status: ImageStatus }` | Image hooks |
| `queue:update` | `{ queue: Image[] }` | Queue hook, Mission Control, Live Downlink |
| `queue:reordered` | `{ queue: ReorderRequest[] }` | Queue ordering reconciliation |
| `retransmit:requested` | `RetransmitRequestedEvent` | Retransmission hook/center |
| `retransmit:ack:confirmed` | `{ received: { retransmit_id?, image_id? }, status?, completed_at? }` | Retransmission completion synchronization |
| `revolution:start` | `RevolutionStartEvent` | Revolution hooks, Mission Control, Orbit Windows |
| `revolution:end` | `RevolutionEndEvent` | Revolution hooks and pass completion |

The socket service can forward additional protocol events, but the table above is the application state surface currently consumed by hooks.

## Client → server events

| Event | When emitted | Expected server behavior |
|---|---|---|
| `join:telemetry` | First active telemetry subscriber and after reconnect | Join telemetry room; optional `telemetry:subscribed` confirmation |
| `leave:telemetry` | Last telemetry subscriber unmounts | Leave room; optional `telemetry:unsubscribed` confirmation |
| `join:queue` | First queue subscriber and after reconnect | Join queue room; optional `queue:subscribed` confirmation |
| `leave:queue` | Last queue subscriber unmounts | Leave room; optional `queue:unsubscribed` confirmation |

`retransmit:ack`, `queue:reorder`, `image:discard`, `revolution:trigger`, and `ping` exist as socket service capabilities but are not currently emitted by approved UI hooks. Retransmission acknowledgement and queue reorder currently use REST. Do not require those socket emissions for initial integration success.

## Critical payload fields

- **Telemetry:** `id`, `image_id`, `mission_id`, `packet_type`, nullable segment/RSSI/SNR/latency fields, ISO `timestamp`, nullable `raw_payload`. Socket telemetry additionally requires numeric `progress`.
- **Image:** `id`, `mission_id`, `file_path`, nullable classification/ML fields, `priority`, `status`, segment counters, `progress_percent`, nullable RF/throughput values and timestamps.
- **ImageProgress:** `image_id`, `status`, `total_segments`, `segments_confirmed`, `current_segment`, `progress_percent`, nullable RF/throughput values. Socket `image:progress` uses `id`, `segments_confirmed`, `segments_total`, and `status`.
- **QueueItem:** a complete `Image`; queue order is array order. Reorder requests contain `id` and `priority`.
- **Retransmission:** numeric `id`, `image_id`, `mission_id`, `missing_segments`, `requested_at`, nullable acknowledgement/completion timestamps, `status`.
- **Revolution:** numeric `id` and `revolution_num`, `mission_id`, window timestamps/duration, nullable planned/completed/failed arrays, `status`, and planned/transmitted/confirmed totals.

Zero is valid. Percentages must remain within 0–100. Confirmed segments must not exceed transmitted/planned totals.

## Exact status vocabularies

- Image: `pending`, `classified`, `queued`, `transmitting`, `complete`, `discarded`, `failed`
- Classification: `CLEAR`, `CLOUDY`, `NOT_VISIBLE`, `UNKNOWN`
- Action: `keep`, `defer`, `discard`
- Retransmission: `pending`, `acknowledged`, `completed`
- Revolution: `scheduled`, `active`, `completed`
- Packet: `DATA`, `ACK`, `NACK`, `META`, `STATUS`, `DONE`, `TELEMETRY`

Unknown socket status strings are rejected by the live normalizers.

## Startup order

1. Start the backend and confirm `GET /api/health` succeeds.
2. Start the frontend with `VITE_DATA_MODE=live`.
3. The frontend renders immediately while REST and Socket.IO connect independently.
4. Socket.IO connects and active telemetry/queue rooms join.
5. Screen hooks populate initial state through REST.
6. Backend emits normalized incremental events.
7. If either transport drops, the frontend reports it and retries automatically.

## Two-level integration boundary

1. **Frontend ↔ backend:** validate HTTP responses, Socket.IO connection, rooms, payloads, reconnection, and freshness.
2. **Backend ↔ hardware chain:** separately validate serial/Raspberry Pi/ESP32/LoRa/satellite transport. A green frontend transport state is not proof of hardware health.

## Integration test matrix

| Test | Procedure | Expected result |
|---|---|---|
| 1 | Request `/api/health` | HTTP success; REST becomes connected |
| 2 | Start Socket.IO | Socket becomes connected without duplicate clients |
| 3 | Emit `telemetry:update` | Dashboard telemetry updates and freshness becomes current |
| 4 | Emit `image:progress` | Live Downlink progress updates immediately |
| 5 | Emit `image:classified` | Matching image updates in AI Gallery |
| 6 | Emit `queue:update` | Queue order/content changes without duplicates |
| 7 | Emit `retransmit:requested` | Request appears in Retransmissions |
| 8 | POST retransmission acknowledgement | Row becomes acknowledged/completed; confirmation event reconciles state |
| 9 | Emit `revolution:start` | Mission Control and Orbit Windows show the active pass |
| 10 | Emit `revolution:end` | Pass completes; only IDs in `completed` are marked successful |
| 11 | Stop backend | UI reports `BACKEND OFFLINE` and remains rendered |
| 12 | Restart backend | REST and socket recover automatically; rooms rejoin once |
| 13 | Keep socket open but stop telemetry for >15s | UI reports `STALE TELEMETRY` |
| 14 | Resume telemetry | Freshness returns to current |

## Quick troubleshooting

- **BACKEND OFFLINE:** verify `VITE_API_URL`, CORS, and `GET /api/health`.
- **REST works, no events:** verify `VITE_WS_URL`, Socket.IO transport/CORS, and room handlers.
- **Socket connected, STALE TELEMETRY:** transport is open but `telemetry:update` flow stopped.
- **Images load, progress does not move:** verify `image:progress.id` matches the REST image ID and counters are numeric.
- **Retransmission absent:** verify `retransmit:requested` contains matching `image_id`, `mission_id`, and an array of missing segments.
- **Duplicates after reconnect:** verify the server treats repeated room joins idempotently.

## Replay operator note

Set `VITE_DATA_MODE=replay` for the deterministic local presentation fallback. **Replay is not live hardware telemetry.** There is intentionally no dashboard switch. Return to hardware/backend integration with `VITE_DATA_MODE=live` and restart Vite.

## CONTRACT.md discrepancies

- The implementation uses `VITE_WS_URL`; no `VITE_SOCKET_URL` variable exists.
- Frontend URLs include `/api` themselves, so `VITE_API_URL` should normally be an origin, while `CONTRACT.md` describes an `/api` base.
- `src/types.ts` accepts classification `UNKNOWN`; several `CONTRACT.md` classification examples omit it.
- `src/types.ts` permits nullable image `created_at`/`updated_at`; `CONTRACT.md` describes them as required strings.
- `CONTRACT.md` lists a server `connected` payload event, but live connection state is currently driven by Socket.IO's transport `connect` event rather than consuming that application event.
- `CONTRACT.md` implies socket action emissions are the normal UI path; current queue reorder and retransmission acknowledgement hooks use REST.
