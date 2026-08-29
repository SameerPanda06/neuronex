import { useEffect, useMemo, useState } from 'react';
import { Activity, Database, Radio, RefreshCw, Satellite, Settings2 } from 'lucide-react';
import { useConnection } from '../hooks/useConnection';
import { dataSource } from '../data';
import { runtimeConfig } from '../config/runtime';

interface MissionSnapshot {
  missionId: string | null;
  revolution: number | null;
  queueCount: number;
  imageCount: number;
  retransmissionCount: number;
  rssi: number | null;
  snr: number | null;
}

const emptySnapshot: MissionSnapshot = {
  missionId: null, revolution: null, queueCount: 0, imageCount: 0,
  retransmissionCount: 0, rssi: null, snr: null,
};

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never received';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : 'Invalid timestamp';
}

function ageLabel(value: string | null, freshness: 'current' | 'stale' | 'no_data', now: number): string {
  if (!value) return 'NO DATA';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'UNKNOWN';
  const seconds = Math.max(0, Math.floor((now - parsed) / 1000));
  return `${freshness === 'stale' ? 'STALE — ' : ''}${seconds}s ago`;
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/70 last:border-0">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-xs font-semibold text-slate-200 text-right break-all">{value}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-cyan-900/30 bg-[#0B132B]/75 p-4 shadow-lg shadow-black/10">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-xs font-bold tracking-[0.16em] text-white">{title}</h2>
      </div>
      <dl>{children}</dl>
    </section>
  );
}

export function Diagnostics() {
  const connection = useConnection();
  const [snapshot, setSnapshot] = useState<MissionSnapshot>(emptySnapshot);
  const [snapshotState, setSnapshotState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [images, queue, retransmissions, revolution, telemetry] = await Promise.all([
          dataSource.images.list({ limit: 1 }),
          dataSource.queue.get(),
          dataSource.retransmissions.list({ limit: 1 }),
          dataSource.revolutions.current(),
          dataSource.telemetry.getLatest(),
        ]);
        if (!active) return;
        const latest = telemetry.latest_overall;
        setSnapshot({
          missionId: revolution.current?.mission_id ?? latest?.mission_id ?? images.images[0]?.mission_id ?? null,
          revolution: revolution.current?.revolution_num ?? null,
          queueCount: queue.count,
          imageCount: images.total,
          retransmissionCount: retransmissions.count,
          rssi: latest?.rssi ?? null,
          snr: latest?.snr ?? null,
        });
        setSnapshotState('ready');
      } catch {
        if (active) setSnapshotState('unavailable');
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const networkingApplies = connection.mode === 'live';
  const modeLabel = connection.mode === 'mock' ? 'MOCK' : connection.mode === 'replay' ? 'REPLAY' : 'LIVE';
  const telemetryAge = useMemo(
    () => ageLabel(connection.lastTelemetryAt, connection.telemetryFreshness, now),
    [connection.lastTelemetryAt, connection.telemetryFreshness, now],
  );

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Activity className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-[0.2em]">OPERATOR TOOLING</span>
          </div>
          <h1 className="text-2xl font-black font-space tracking-wide text-white">SYSTEM DIAGNOSTICS</h1>
          <p className="text-xs text-slate-500 mt-1">Frontend-observable integration state only. No direct hardware health claims.</p>
        </div>
        <div className="rounded-lg border border-cyan-800/40 bg-cyan-950/25 px-3 py-2 text-xs font-bold text-cyan-300">
          {connection.statusText}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Section title="RUNTIME" icon={Settings2}>
          <Field label="Data mode" value={modeLabel} />
          <Field label="Mode label" value={connection.statusText} />
          <Field label="Build environment" value={import.meta.env.MODE.toUpperCase()} />
        </Section>

        <Section title="CONNECTIVITY" icon={Radio}>
          <Field label="REST" value={networkingApplies ? connection.restStatus.toUpperCase() : 'N/A'} />
          <Field label="Socket.IO" value={networkingApplies ? connection.socketStatus.toUpperCase() : 'N/A'} />
          <Field label="Overall" value={connection.statusText} />
        </Section>

        <Section title="FRESHNESS" icon={RefreshCw}>
          <Field label="Telemetry" value={connection.telemetryFreshness.replace('_', ' ').toUpperCase()} />
          <Field label="Telemetry age" value={telemetryAge} />
          <Field label="Last telemetry" value={formatTimestamp(connection.lastTelemetryAt)} />
          <Field label="Last image event" value={formatTimestamp(connection.lastImageEventAt)} />
          <Field label="Last REST success" value={networkingApplies ? formatTimestamp(connection.lastSuccessfulRestAt) : 'N/A'} />
        </Section>

        <Section title="MISSION SNAPSHOT" icon={Satellite}>
          <Field label="Snapshot" value={snapshotState.toUpperCase()} />
          <Field label="Mission" value={snapshot.missionId ?? 'Unavailable'} />
          <Field label="Revolution" value={snapshot.revolution === null ? 'Unavailable' : `#${snapshot.revolution}`} />
          <Field label="Queue" value={snapshotState === 'ready' ? snapshot.queueCount : '—'} />
          <Field label="Images" value={snapshotState === 'ready' ? snapshot.imageCount : '—'} />
          <Field label="Retransmissions" value={snapshotState === 'ready' ? snapshot.retransmissionCount : '—'} />
          <Field label="Latest RSSI" value={snapshot.rssi === null ? 'No data' : `${snapshot.rssi} dBm`} />
          <Field label="Latest SNR" value={snapshot.snr === null ? 'No data' : `${snapshot.snr} dB`} />
        </Section>

        <Section title="CONFIGURATION" icon={Database}>
          <Field label="API base URL" value={networkingApplies ? runtimeConfig.apiBaseUrl : 'N/A'} />
          <Field label="Socket base URL" value={networkingApplies ? runtimeConfig.socketUrl : 'N/A'} />
          <Field label="Replay fixture" value={connection.mode === 'replay' ? 'synthetic-mission-v1' : 'N/A'} />
        </Section>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-600">
        The frontend observes the backend API and Socket.IO transport. Raspberry Pi, ESP32, LoRa, and satellite hardware health must be verified through backend-owned diagnostics.
      </p>
    </div>
  );
}
