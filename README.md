# Neuronex — Satellite Downlink Dashboard

**Edge AI Satellite Downlink System** — Real-time dashboard for monitoring ML-classified image transmission from Pi 3B+ via LoRa/ESP32 bridge.

## Architecture

```
┌─────────────┐    LoRa 433MHz     ┌─────────────┐   USB Serial    ┌─────────────┐
│   Pi 3B+    │ ─────────────────► │   ESP32     │ ──────────────► │   Laptop    │
│  (TX + ML)  │  PKT_DATA/META/    │  (Bridge)   │  0xAA frames    │  (RX + API) │
│             │  PKT_STATUS/NACK   │ + RSSI/SNR  │  + telemetry    │             │
└─────────────┘ ◄───────────────── │             │                 └──────┬──────┘
       ▲                          └─────────────┘                        │
       │  PKT_DONE/ACK/NACK                                            ▼
       │                                                       ┌───────────────────┐
       │                                                       │  Flask + SocketIO │
       │                                                       │  (port 5000)      │
       │                                                       └────────┬──────────┘
       │                                                                ▼
       └──────────────────────────────────────────────────────► ┌───────────────────┐
                                                                │  React + Vite     │
                                                                │  (port 3000)      │
                                                                └───────────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- (For local dev) Python 3.10+, Node 18+, npm

### One-Command Start (Docker)
```bash
git clone <this-repo>
cd neuronex
docker-compose up --build
```
- **Backend API**: http://localhost:5000
- **Frontend Dashboard**: http://localhost:3000
- **WebSocket**: ws://localhost:5000/socket.io

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure serial port, etc.
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Contract (Single Source of Truth)

| File | Purpose |
|------|---------|
| `backend/openapi.yaml` | REST API specification |
| `CONTRACT.md` | WebSocket events + data schemas |
| `shared/types.ts` | TypeScript types (frontend consumes) |

**Rule**: If it's not in the contract, it doesn't exist. Both sides develop against the contract only.

---

## Repository Structure

```
neuronex/
├── backend/                    # Flask + SocketIO (YOUR DOMAIN)
│   ├── app.py                  # Entry point
│   ├── config.py               # Configuration
│   ├── models.py               # SQLAlchemy models
│   ├── openapi.yaml            # REST API spec (YOU MAINTAIN)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── api/
│   │   ├── __init__.py
│   │   ├── images.py           # /api/images
│   │   ├── telemetry.py        # /api/telemetry
│   │   ├── queue.py            # /api/queue
│   │   └── retransmit.py       # /api/retransmissions
│   ├── services/
│   │   ├── __init__.py
│   │   ├── receiver.py         # Background serial listener
│   │   ├── scheduler.py        # Revolution sync (3/day × 60s)
│   │   └── protocol.py         # PKT_* build/parse, CRC32
│   └── websocket/
│       ├── __init__.py
│       └── events.py           # SocketIO event handlers
│
├── frontend/                   # React 18 + Vite + Tailwind (FRIEND'S DOMAIN)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── Dockerfile
│   ├── .env.example
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── types.ts            # Shared types (from contract)
│   │   ├── services/
│   │   │   ├── api.ts          # REST client
│   │   │   └── socket.ts       # SocketIO client
│   │   ├── hooks/
│   │   │   ├── useTelemetry.ts
│   │   │   ├── useImages.ts
│   │   │   └── useQueue.ts
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── TransmissionView.tsx
│   │   │   ├── MLGallery.tsx
│   │   │   ├── MetricsPanel.tsx
│   │   │   ├── RetransmissionQueue.tsx
│   │   │   ├── ImageViewer.tsx
│   │   │   └── RevolutionTimeline.tsx
│   │   └── utils/
│   │       └── format.ts
│   └── public/
│
├── shared/                     # Shared protocol definitions
│   └── lora_protocol.py        # PKT_* constants, CRC32 (Pi ↔ ESP32)
│
├── docker-compose.yml
├── CONTRACT.md                 # WebSocket events + schemas
├── Makefile
└── .gitignore
```

---

## API Endpoints (REST)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/images` | List all images with ML classification |
| GET | `/api/images/:id` | Get image details + metadata |
| GET | `/api/telemetry` | Latest telemetry snapshot |
| GET | `/api/telemetry/history` | Time-series telemetry |
| GET | `/api/queue` | Current transmission queue |
| POST | `/api/queue/reorder` | Reorder queue (drag-drop) |
| GET | `/api/retransmissions` | Pending retransmission requests |
| POST | `/api/retransmissions/ack` | Acknowledge/trigger resend |
| GET | `/api/revolutions` | Revolution schedule & history |
| GET | `/api/health` | Health check |

---

## WebSocket Events (Real-time)

### Server → Client (Dashboard subscribes)
| Event | Payload | Frequency |
|-------|---------|-----------|
| `telemetry:update` | `{rssi, snr, latency_ms, throughput_bps, image_id, progress}` | Every 500ms during TX |
| `image:classified` | `{id, classification, confidence, priority, action}` | On ML decision |
| `image:progress` | `{id, segments_confirmed, segments_total, status}` | Per batch |
| `retransmit:requested` | `{image_id, missing_segments[]}` | When ESP32 NACKs |
| `revolution:start` | `{revolution_num, window_sec, images_in_window[]}` | 3×/day |
| `revolution:end` | `{revolution_num, completed[], pending[]}` | 3×/day |

### Client → Server (Dashboard emits)
| Event | Payload | Purpose |
|-------|---------|---------|
| `retransmit:ack` | `{image_id, segments[]}` | Manual resend trigger |
| `queue:reorder` | `[{id, priority}]` | Drag-drop priority |
| `image:discard` | `{id}` | Mark as discard |

---

## Development Workflow

### You (Backend Owner)
1. Maintain `backend/openapi.yaml` and `CONTRACT.md`
2. Implement API endpoints in `backend/api/`
3. Implement WebSocket events in `backend/websocket/events.py`
4. Run `docker-compose up` for integration testing
5. Review frontend PRs for contract compliance

### Friend (Frontend Owner)
1. Build UI against `CONTRACT.md` and `shared/types.ts`
2. Components in `frontend/src/components/`
3. Hooks in `frontend/src/hooks/`
4. Never call backend directly — use `services/api.ts` + `services/socket.ts`
4. Submit PRs; you review for contract compliance

### Integration
```bash
# Both run:
docker-compose up --build
# Test: Frontend at :3000 talks to Backend at :5000
```

---

## Environment Variables

**Backend (`.env`):**
```env
SERIAL_PORT=/dev/ttyUSB0        # ESP32 serial port
SERIAL_BAUDRATE=115200
DATABASE_URL=sqlite:///neuronex.db
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=change-me-in-production
```

**Frontend (`.env`):**
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

---

## Deployment

### Production (Laptop as Server)
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Pi 3B+ (Transmitter)
```bash
# Separate repo: neuronex-pi
# See neuronex-pi/README.md for Pi deployment
```

---

## License

MIT — Built for satellite downlink demonstration.