# 🚀 Neuronex Dashboard — Frontend Handover Document

**For**: Frontend Developer (Dashboard Visuals)
**From**: Backend Owner (Pi/ESP32/Serial Integration)
**Repo**: `https://github.com/SameerPanda06/neuronex`
**Branch**: `main`

---

## 🎯 Project Overview

**Neuronex** = **Neural Network + Nexus** — An end-to-end satellite downlink system with **edge AI classification** on Raspberry Pi 3B+, adaptive LoRa transmission, and real-time dashboard monitoring.

### The Physical Flow
```
┌─────────────┐    LoRa 433MHz     ┌─────────────┐   USB Serial    ┌─────────────┐
│   Pi 3B+    │ ─────────────────► │   ESP32     │ ──────────────► │   Laptop    │
│  (TX + ML)  │  PKT_DATA/META/    │  (Bridge)   │  0xAA frames    │  (RX + API) │
│             │  PKT_STATUS/NACK   │ + RSSI/SNR  │  + telemetry    │             │
└─────────────┘ ◄───────────────── │             │                 └──────┬──────┘
       ▲                          └─────────────┘                        │
       │  PKT_DONE/ACK/NACK                                              ▼
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

### What Happens on Pi (Edge AI)
1. **1249 images** from cloud-38 dataset stored on Pi
2. **TFLite model** classifies each: `CLEAR` / `CLOUDY` / `NOT_VISIBLE`
3. **Mission rules** decide: `keep` (priority 1, Q85) / `defer` (priority 2, Q60) / `discard` (priority 3, Q40)
4. **3 revolutions/day** × 60-second downlink windows
5. **ARQ protocol**: Only missing segments retransmitted, state persists across revolutions

---

## 🏗️ Architecture — What You're Building Against

### Backend (My Domain — Already Implemented)
| Component | File | Purpose |
|-----------|------|---------|
| **REST API** | `backend/api/*.py` | 20+ endpoints for images, telemetry, queue, retransmissions, revolutions |
| **WebSocket** | `backend/websocket/events.py` | Real-time events (2 Hz telemetry, classification, progress) |
| **Serial Receiver** | `backend/services/receiver.py` | Reads ESP32 USB serial, parses frames, stores to DB, emits WS |
| **Scheduler** | `backend/services/scheduler.py` | Manages 60s × 3/day revolution windows |
| **Protocol** | `backend/services/protocol.py` | PKT_* build/parse, CRC32, serial framing |
| **Database** | `backend/models.py` | SQLite (dev) → PostgreSQL (prod) |

### Frontend (Your Domain — Scaffold Ready)
```
frontend/
├── src/
│   ├── components/          # ← YOUR MAIN WORK AREA
│   │   ├── Layout.tsx       # Sidebar, nav, revolution status
│   │   ├── TransmissionView.tsx   # Live progress bars (transmitting now)
│   │   ├── MLGallery.tsx          # Filterable classification grid
│   │   ├── MetricsPanel.tsx       # RSSI/SNR/Throughput charts (Recharts)
│   │   ├── RetransmissionQueue.tsx # Visual retransmission list
│   │   ├── ImageViewer.tsx        # Full-res modal with metadata
│   │   └── RevolutionTimeline.tsx # Timeline + calendar views
│   ├── hooks/               # Data fetching + WS subscriptions
│   │   ├── useTelemetry.ts
│   │   ├── useImages.ts
│   │   ├── useQueue.ts
│   │   ├── useRetransmissions.ts
│   │   └── useRevolutions.ts
│   ├── services/
│   │   ├── api.ts           # Axios REST client (ready)
│   │   └── socket.ts        # SocketIO client with rooms (ready)
│   └── types.ts             # TypeScript types (from CONTRACT.md)
```

---

## 📡 API Contract — Your Single Source of Truth

**Files to reference**: `CONTRACT.md` + `backend/openapi.yaml` + `frontend/src/types.ts`

### Base URL
```
REST:    http://localhost:5000/api
WS:      ws://localhost:5000/socket.io
```

### REST Endpoints (All return JSON)

#### Images
| Method | Endpoint | Use Case |
|--------|----------|----------|
| GET | `/images?status=transmitting&limit=10` | Live transmission cards |
| GET | `/images?classification=CLEAR` | ML Gallery filter |
| GET | `/images/:id` | ImageViewer modal |
| GET | `/images/:id/progress` | Real-time progress (fallback) |
| GET | `/images/stats` | Dashboard summary cards |

#### Telemetry
| Method | Endpoint | Use Case |
|--------|----------|----------|
| GET | `/telemetry` | Latest signal snapshot |
| GET | `/telemetry/history?hours=24` | Charts (RSSI/SNR over time) |
| GET | `/telemetry/signal?hours=1` | Current signal quality stats |

#### Queue
| Method | Endpoint | Use Case |
|--------|----------|----------|
| GET | `/queue` | Queued images (priority ordered) |
| POST | `/queue/reorder` | Drag-drop reorder |
| GET | `/queue/next` | Next image to transmit |

#### Retransmissions
| Method | Endpoint | Use Case |
|--------|----------|----------|
| GET | `/retransmissions?status=pending` | Missing segments list |
| POST | `/retransmissions/ack` | "Resend these segments" button |
| POST | `/retransmissions/:id/complete` | Mark done |
| GET | `/retransmissions/stats` | Summary cards |

#### Revolutions
| Method | Endpoint | Use Case |
|--------|----------|----------|
| GET | `/revolutions?limit=50` | Timeline view |
| GET | `/revolutions/current` | Active revolution header |
| GET | `/revolutions/status` | Sidebar revolution status |
| GET | `/revolutions/stats` | Success rate cards |

---

## ⚡ WebSocket Events — Real-Time Updates

### Connect & Subscribe
```typescript
// In your component
socketService.connect();
socketService.joinTelemetry();  // For live RSSI/SNR
socketService.joinQueue();      // For queue updates
```

### Server → Client (You Listen)
| Event | Payload | Component |
|-------|---------|-----------|
| `telemetry:update` | `{rssi, snr, latency_ms, throughput_bps, image_id, progress}` | **MetricsPanel**, **TransmissionView** (2 Hz) |
| `image:classified` | `{id, classification, confidence, priority, action}` | **MLGallery** auto-refresh |
| `image:progress` | `{id, segments_confirmed, segments_total, status}` | **TransmissionView** progress bars |
| `retransmit:requested` | `{image_id, missing_segments[]}` | **RetransmissionQueue** alert |
| `revolution:start` | `{revolution_num, window_sec, images_in_window[]}` | **Layout** sidebar, **RevolutionTimeline** |
| `revolution:end` | `{revolution_num, completed[], failed[]}` | **RevolutionTimeline** |
| `queue:update` | `{queue: Image[]}` | **TransmissionView** queued list |
| `image:status` | `{image_id, status}` | Any component |

### Client → Server (You Emit)
```typescript
// Drag-drop queue reorder
socketService.reorderQueue([{id: "IMG-001", priority: 1}, ...]);

// Acknowledge retransmission
socketService.acknowledgeRetransmission({image_id: "IMG-001", segments: [5, 12]});

// Discard image
socketService.discardImage({id: "IMG-001"});
```

---

## 🎨 Design System — Ready to Use

### Colors (Tailwind Classes)
```css
/* Space Theme */
bg-space-900      /* #0a0f1a - Main background */
bg-space-950      /* #050810 - Deeper background */

/* Neuronex Brand */
bg-neuronex-500   /* #0ea5e9 - Primary */
text-neuronex-400 /* #38bdf8 - Secondary text */

/* Signal Quality (semantic) */
text-signal-excellent  /* #22c55e - RSSI ≥ -70 */
text-signal-good       /* #84cc16 - RSSI -70 to -85 */
text-signal-fair       /* #eab308 - RSSI -85 to -100 */
text-signal-poor       /* #f97316 - RSSI -100 to -115 */
text-signal-critical   /* #ef4444 - RSSI < -115 */
```

### Classification Colors
```tsx
// CLEAR → Green
className="bg-green-500/20 text-green-400 border-green-500/30"
// CLOUDY → Yellow
className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
// NOT_VISIBLE → Red
className="bg-red-500/20 text-red-400 border-red-500/30"
```

### Animations
```css
animate-pulse-slow    /* 3s pulse */
animate-spin-slow     /* 2s spin */
animate-slide-in      /* Slide from left */
animate-fade-in       /* Fade in */
```

### Fonts
```tsx
font-space   /* Space Grotesk - headings */
font-mono    /* JetBrains Mono - data, numbers */
```

---

## 🧩 Component Deep Dive — What Exists & How to Extend

### 1. `Layout.tsx` — Shell
**What it has**: Collapsible sidebar, nav, connection status, revolution status, stats summary
**Extend**: Add user menu, theme toggle, notifications bell

### 2. `TransmissionView.tsx` — Live Transmission
**What it has**: Currently transmitting cards with progress bars, RSSI/SNR/Throughput metrics, queued images list
**Extend**: 
- Add animated segment-by-segment progress
- Show LoRa packet timeline
- Add "time remaining in window" countdown

### 3. `MLGallery.tsx` — Classification Grid
**What it has**: Filter tabs (All/CLEAR/CLOUDY/NOT_VISIBLE), search, sort, stat cards, image cards with action buttons
**Extend**:
- **Add thumbnails** — Replace emoji placeholder with actual JPEG preview
- **Confidence distribution chart** — Recharts histogram
- **Batch actions** — Select multiple → discard/reprioritize
- **Image detail drawer** — Slide-in panel on click

### 4. `MetricsPanel.tsx` — Signal Charts
**What it has**: 4 metric cards (RSSI, SNR, Throughput, Packets), 4 Recharts charts (Area RSSI, Line SNR, Bar packet types, Line throughput), raw telemetry table
**Extend**:
- **Waterfall diagram** — Frequency vs time
- **Signal quality heatmap** — By revolution
- **Packet loss rate** — Rolling window
- **Export CSV** button

### 5. `RetransmissionQueue.tsx` — Missing Segments
**What it has**: Status filter tabs, stat cards, expandable rows with segment badges, acknowledge/complete buttons
**Extend**:
- **Visual segment map** — Grid showing received (green) vs missing (red) segments
- **Auto-retry timer** — Countdown until next revolution
- **Bulk acknowledge** — Select multiple retransmissions

### 6. `ImageViewer.tsx` — Full-Res Modal
**What it has**: Zoom controls, metadata grid, class probability bars, download/share actions
**Extend**:
- **Actual JPEG rendering** — Load from `/api/images/:id/file` (not implemented yet)
- **Histogram** — RGB channel distribution
- **Metadata overlay** — GPS, timestamp, satellite attitude
- **Compare mode** — Side-by-side with ground truth

### 7. `RevolutionTimeline.tsx` — Schedule View
**What it has**: Timeline rows with progress, calendar month view, expandable image lists, stats cards
**Extend**:
- **Gantt chart** — Transmission windows vs actual
- **Success rate trend** — Line chart over days
- **Mission selector** — Multi-mission support

---

## 🛠️ Development Workflow

### Start Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

### Start Backend (for integration)
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env → set SERIAL_PORT=COM3 (or /dev/ttyUSB0)
python app.py        # http://localhost:5000
```

### Or Docker (Both)
```bash
cd ..
docker-compose up --build
```

---

## 🎯 Immediate Improvements You Can Make

### Week 1: Visual Polish
1. **Replace emoji placeholders** with real icons (Lucide React already installed)
2. **Add loading skeletons** — Already in `MLGallery.tsx` and `RetransmissionQueue.tsx`
3. **Improve empty states** — Add illustrations, helpful text
4. **Add tooltips** — Hover for segment details, signal explanations
5. **Keyboard shortcuts** — `←/→` zoom in ImageViewer, `Space` pause

### Week 2: Data Visualization
1. **Segment waterfall** — Visual map of received/missing segments per image
2. **RSSI/SNR heatmap** — By time and frequency
3. **Transmission timeline** — Gantt-style revolution view
4. **Confidence calibration plot** — Predicted vs actual

### Week 3: UX Delight
1. **Dark/light theme** — Already CSS variables ready
2. **Command palette** — `Cmd+K` for quick actions
3. **Real-time notifications** — Toast for retransmission requests
4. **Export/Report** — PDF mission summary

---

## 🔌 Backend Integration Points (What I'll Handle)

| Feature | Backend File | Status |
|---------|--------------|--------|
| Serial port config | `backend/.env` | You set `SERIAL_PORT` |
| ESP32 frame parsing | `services/protocol.py` | Done |
| RSSI/SNR extraction | `services/receiver.py` | Done → emits `telemetry:update` |
| Revolution scheduling | `services/scheduler.py` | Done → emits `revolution:start/end` |
| Queue management | `api/queue.py` | Done |
| Retransmission logic | `api/retransmit.py` | Done |
| Image classification log | `services/receiver.py` | Emits `image:classified` on META |

**You don't touch these** — just consume the WebSocket events and REST endpoints.

---

## 📂 Key Files to Bookmark

| File | Why |
|------|-----|
| `CONTRACT.md` | Complete API + WS spec |
| `frontend/src/types.ts` | TypeScript interfaces |
| `frontend/src/hooks/useTelemetry.ts` | Real-time signal hooks |
| `frontend/src/hooks/useImages.ts` | Image data + real-time updates |
| `frontend/tailwind.config.js` | Design tokens |
| `backend/api/*.py` | REST endpoint implementations |
| `backend/services/receiver.py` | Serial → WS bridge logic |

---

## ❓ FAQ

**Q: Do I need the Pi/ESP32 to develop?**
A: No. Backend runs mock data or you can use the REST endpoints directly. WebSocket events fire from backend services.

**Q: How do I test WebSocket events locally?**
A: Run backend (`python app.py`), open browser dev tools → Network → WS, or use `socket.io-client` in console.

**Q: Where are the actual JPEGs?**
A: On Pi at `/home/pi/cloud-38/`. Backend serves metadata only. For ImageViewer, we'll add `/api/images/:id/file` endpoint later.

**Q: Can I change the API?**
A: **Only via CONTRACT.md**. Update `CONTRACT.md` → I update `openapi.yaml` + backend → you update `types.ts` + hooks. PR review required.

**Q: What if WebSocket disconnects?**
A: Hooks have fallback polling (5-30s intervals). `socket.ts` auto-reconnects with exponential backoff.

---

## 🚀 You're Ready!

```bash
# 1. Clone
git clone https://github.com/SameerPanda06/neuronex.git
cd neuronex/frontend

# 2. Install & Run
npm install
npm run dev

# 3. Open http://localhost:3000
# 4. Start building stunning visuals! 🎨
```

**Questions?** Open a GitHub Issue or ping me. The contract is the law — if it's not in `CONTRACT.md`, it doesn't exist.

---

**Good luck — make it look amazing for the judges!** 🏆