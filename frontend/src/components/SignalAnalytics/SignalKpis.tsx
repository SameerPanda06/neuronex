import React from 'react';
import {
  Signal,
  Activity,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import {
  getSignalQualityClass,
  getSignalQualityLabel,
  getSignalQualityBgClass,
  getSnrQualityClass,
  getSnrQualityLabel,
  getSnrQualityBgClass,
} from '../../hooks/useTelemetry';
import { cn, formatBps } from '../../utils/format';
import type { SignalQuality } from '../../types';
import type { DeliveryMetric } from '../../lib/missionMetrics';

interface SignalKpisProps {
  signalData: SignalQuality | null;
  deliveryMetric: DeliveryMetric;
  activeThroughput?: number | null;
}

export function SignalKpis({ signalData, deliveryMetric, activeThroughput }: SignalKpisProps) {
  const telemetry = signalData?.telemetry || [];

  // RSSI
  const rssiStats = signalData?.stats?.rssi;
  const currentRssi = rssiStats?.current ?? telemetry[0]?.rssi ?? null;
  const minRssi = rssiStats?.min ?? null;
  const maxRssi = rssiStats?.max ?? null;
  const avgRssi = rssiStats?.avg ?? null;
  const rssiPoints = telemetry.flatMap((t) => t.rssi === null ? [] : [t.rssi]).slice(0, 15).reverse();

  // SNR
  const snrStats = signalData?.stats?.snr;
  const currentSnr = snrStats?.current ?? telemetry[0]?.snr ?? null;
  const minSnr = snrStats?.min ?? null;
  const maxSnr = snrStats?.max ?? null;
  const avgSnr = snrStats?.avg ?? null;
  const snrPoints = telemetry.flatMap((t) => t.snr === null ? [] : [t.snr]).slice(0, 15).reverse();

  // Throughput
  const liveThroughput = activeThroughput ?? null;
  const throughputPoints: number[] = [];

  // Packet Success
  const { attempted, confirmed, percentage: successRate, health } = deliveryMetric;
  const deliveryBadgeClass = health === 'OPTIMAL'
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : health === 'GOOD'
    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
    : health === 'DEGRADED'
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : health === 'POOR'
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : 'bg-slate-800/60 text-slate-400 border-slate-700';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. RSSI KPI */}
      <KpiCard
        title="RSSI"
        subtitle="Received Signal Strength"
        icon={<Signal className="w-4 h-4 text-cyan-400" />}
        value={`${currentRssi !== null ? currentRssi : '—'}`}
        unit={currentRssi === null ? '' : 'dBm'}
        qualityBadge={
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border', getSignalQualityBgClass(currentRssi))}>
            {getSignalQualityLabel(currentRssi)}
          </span>
        }
        stats={[
          { label: 'MIN', value: minRssi === null ? '—' : `${minRssi} dBm` },
          { label: 'MAX', value: maxRssi === null ? '—' : `${maxRssi} dBm` },
          { label: 'AVG', value: avgRssi === null ? '—' : `${avgRssi.toFixed(1)} dBm` },
        ]}
        sparklineData={rssiPoints}
        sparklineColor="#06b6d4"
        valueColorClass={getSignalQualityClass(currentRssi)}
      />

      {/* 2. SNR KPI */}
      <KpiCard
        title="SNR"
        subtitle="Signal-to-Noise Ratio"
        icon={<Activity className="w-4 h-4 text-teal-400" />}
        value={`${currentSnr !== null ? currentSnr.toFixed(1) : '—'}`}
        unit={currentSnr === null ? '' : 'dB'}
        qualityBadge={
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border', getSnrQualityBgClass(currentSnr))}>
            {getSnrQualityLabel(currentSnr)}
          </span>
        }
        stats={[
          { label: 'MIN', value: minSnr === null ? '—' : `${minSnr.toFixed(1)} dB` },
          { label: 'MAX', value: maxSnr === null ? '—' : `${maxSnr.toFixed(1)} dB` },
          { label: 'AVG', value: avgSnr === null ? '—' : `${avgSnr.toFixed(1)} dB` },
        ]}
        sparklineData={snrPoints}
        sparklineColor="#14b8a6"
        valueColorClass={getSnrQualityClass(currentSnr)}
      />

      {/* 3. Throughput KPI */}
      <KpiCard
        title="THROUGHPUT"
        subtitle="RF Link Data Rate"
        icon={<Zap className="w-4 h-4 text-amber-400" />}
        value={liveThroughput === null ? 'NO DATA' : formatBps(liveThroughput)}
        unit=""
        qualityBadge={
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
            LIVE RATE
          </span>
        }
        stats={[
          { label: 'SOURCE', value: liveThroughput === null ? 'UNAVAILABLE' : 'ACTIVE IMAGE' },
          { label: 'UNIT', value: 'BITS / SEC' },
          { label: 'STATE', value: liveThroughput === null ? 'WAITING' : 'LIVE' },
        ]}
        sparklineData={throughputPoints}
        sparklineColor="#f59e0b"
        valueColorClass="text-white"
      />

      {/* 4. Packet Success KPI */}
      <KpiCard
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        title="SEGMENT DELIVERY"
        subtitle="Confirmed / Attempted"
        value={successRate === null ? 'NO DATA' : `${successRate.toFixed(2)}%`}
        unit=""
        qualityBadge={
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border', deliveryBadgeClass)}>
            {health}
          </span>
        }
        stats={[
          { label: 'CONFIRMED', value: `${confirmed.toLocaleString()}` },
          { label: 'ATTEMPTED', value: `${attempted.toLocaleString()}` },
          { label: 'UNCONFIRMED', value: `${Math.max(0, attempted - confirmed)} segs` },
        ]}
        sparklineData={successRate === null ? [] : [successRate, successRate]}
        sparklineColor="#10b981"
        valueColorClass="text-emerald-400"
      />
    </div>
  );
}

interface KpiCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  value: string;
  unit?: string;
  qualityBadge: React.ReactNode;
  stats: { label: string; value: string }[];
  sparklineData: number[];
  sparklineColor: string;
  valueColorClass: string;
}

function KpiCard({
  title,
  subtitle,
  icon,
  value,
  unit,
  qualityBadge,
  stats,
  sparklineData,
  sparklineColor,
  valueColorClass,
}: KpiCardProps) {
  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-200 shadow-lg shadow-black/40">
      {/* Top Title & Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
              {icon}
            </div>
            <div>
              <h3 className="text-xs font-space font-bold text-slate-200 uppercase tracking-wider">
                {title}
              </h3>
              <p className="text-[10px] font-mono text-slate-400">{subtitle}</p>
            </div>
          </div>
          {qualityBadge}
        </div>

        {/* Value and Sparkline Row */}
        <div className="flex items-end justify-between my-3">
          <div>
            <span className={cn('text-2xl lg:text-3xl font-black font-mono tracking-tight', valueColorClass)}>
              {value}
            </span>
            {unit && <span className="text-xs font-mono text-slate-400 ml-1.5">{unit}</span>}
          </div>

          {/* Mini Sparkline */}
          <div className="w-20 h-8 flex items-center justify-end">
            <SvgSparkline data={sparklineData} stroke={sparklineColor} />
          </div>
        </div>
      </div>

      {/* Bottom Sub-stats */}
      <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-center">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-slate-950/40 rounded px-1 py-0.5 border border-slate-800/40">
            <div className="text-[9px] font-mono text-slate-400">{s.label}</div>
            <div className="text-[10px] font-mono font-bold text-slate-200 truncate">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SvgSparkline({ data, stroke }: { data: number[]; stroke: string }) {
  if (!data || data.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full h-[1px] bg-slate-700" />
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const width = 80;
  const height = 30;
  const padding = 2;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((d - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
