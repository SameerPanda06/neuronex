# NEURONEX Frontend Demo Runbook

Run commands from `frontend/` on branch `frontend`.

## A. Primary demo — live

```powershell
$env:VITE_DATA_MODE='live'
$env:VITE_API_URL='http://localhost:5000'
$env:VITE_WS_URL='ws://localhost:5000'
npm run dev -- --host 127.0.0.1 --port 3000
```

Confirm the separately managed backend responds at `$env:VITE_API_URL/api/health`. The frontend repository does not define the backend launch command.

## B. Fallback — replay

```powershell
$env:VITE_DATA_MODE='replay'
$env:VITE_REPLAY_SPEED='1'
npm run dev -- --host 127.0.0.1 --port 3000
```

Replay is a deterministic local fallback and **is not live hardware telemetry**. It requires neither backend nor external internet. Refresh to restart the fixture.

## C. Development — mock

```powershell
$env:VITE_DATA_MODE='mock'
npm run dev -- --host 127.0.0.1 --port 3000
```

## 60-second pre-demo checklist

- [ ] Branch is `frontend`.
- [ ] Working tree contains only expected changes.
- [ ] Dependencies are installed with `npm install`/`npm ci` already completed.
- [ ] `npm run build` passes.
- [ ] Intended `VITE_DATA_MODE` is selected before starting Vite.
- [ ] In live mode, `/api/health` succeeds and Socket.IO connects.
- [ ] Mission Control, Live Downlink, AI Imagery, Signal Analytics, Retransmissions, and Orbit Windows open successfully.
- [ ] Browser console has no uncaught errors or React warnings.
- [ ] Laptop charger is connected.
- [ ] Replay mode has been checked without external internet.
