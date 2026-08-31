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
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#131E35] last:border-0 text-xs">
      <dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="font-semibold font-mono text-slate-200 text-right break-all tabular-nums text-[11px]">{value}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-[#131E35] bg-[#080E1E] p-3.5 flex flex-col justify-between">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#131E35]">
        <Icon className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
        <h2 className="text-[10px] font-bold tracking-wider text-white uppercase">{title}</h2>
      </div>
      <dl className="space-y-0.5">{children}</dl>
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
    <div className="space-y-4 pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#131E35]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>System Diagnostics</span>
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0D1830] text-cyan-400 border border-cyan-500/30">
              Operator Console
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">Frontend-observable integration status and transport telemetry</p>
        </div>
        <div className="rounded px-2.5 py-1 text-xs font-bold text-cyan-300 bg-[#070D1A] border border-[#1E2E52]">
          {connection.statusText}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Section title="RUNTIME ENVIRONMENT" icon={Settings2}>
          <Field label="Data mode" value={modeLabel} />
          <Field label="Mode label" value={connection.statusText} />
          <Field label="Build environment" value={import.meta.env.MODE.toUpperCase()} />
        </Section>

        <Section title="TRANSPORT CONNECTIVITY" icon={Radio}>
          <Field label="REST Transport" value={networkingApplies ? connection.restStatus.toUpperCase() : 'N/A'} />
          <Field label="Socket.IO Stream" value={networkingApplies ? connection.socketStatus.toUpperCase() : 'N/A'} />
          <Field label="Overall Link State" value={connection.statusText} />
        </Section>

        <Section title="DATA FRESHNESS" icon={RefreshCw}>
          <Field label="Telemetry State" value={connection.telemetryFreshness.replace('_', ' ').toUpperCase()} />
          <Field label="Telemetry Age" value={telemetryAge} />
          <Field label="Last Telemetry Ingest" value={formatTimestamp(connection.lastTelemetryAt)} />
          <Field label="Last Image Event" value={formatTimestamp(connection.lastImageEventAt)} />
          <Field label="Last REST Sync" value={networkingApplies ? formatTimestamp(connection.lastSuccessfulRestAt) : 'N/A'} />
        </Section>

        <Section title="MISSION SNAPSHOT" icon={Satellite}>
          <Field label="Snapshot State" value={snapshotState.toUpperCase()} />
          <Field label="Mission Designation" value={snapshot.missionId ?? 'Unavailable'} />
          <Field label="Orbital Revolution" value={snapshot.revolution === null ? 'Unavailable' : `#${snapshot.revolution}`} />
          <Field label="Downlink Queue" value={snapshotState === 'ready' ? snapshot.queueCount : '—'} />
          <Field label="Acquired Images" value={snapshotState === 'ready' ? snapshot.imageCount : '—'} />
          <Field label="Retransmission ARQ" value={snapshotState === 'ready' ? snapshot.retransmissionCount : '—'} />
          <Field label="Latest Carrier RSSI" value={snapshot.rssi === null ? 'No data' : `${snapshot.rssi} dBm`} />
          <Field label="Latest Carrier SNR" value={snapshot.snr === null ? 'No data' : `${snapshot.snr} dB`} />
        </Section>

        <Section title="CONFIGURATION ENDPOINTS" icon={Database}>
          <Field label="API base URL" value={networkingApplies ? runtimeConfig.apiBaseUrl : 'N/A'} />
          <Field label="Socket base URL" value={networkingApplies ? runtimeConfig.socketUrl : 'N/A'} />
          <Field label="Replay fixture" value={connection.mode === 'replay' ? 'synthetic-mission-v1' : 'N/A'} />
        </Section>
      </div>

      <p className="text-[10px] text-slate-500 pt-2 border-t border-[#131E35]">
        The frontend observes the backend API and Socket.IO transport. Raspberry Pi, ESP32, LoRa, and satellite hardware health must be verified through backend-owned telemetry logs.
      </p>
    </div>
  );
}
