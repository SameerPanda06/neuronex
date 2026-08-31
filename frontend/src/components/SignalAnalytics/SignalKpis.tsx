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
    ? 'bg-[#062D24] text-emerald-300 border-emerald-500/30'
    : health === 'GOOD'
    ? 'bg-[#0E1B38] text-cyan-300 border-cyan-500/30'
    : health === 'DEGRADED'
    ? 'bg-[#2B1B0A] text-amber-300 border-amber-500/30'
    : health === 'POOR'
    ? 'bg-[#2B0A12] text-rose-300 border-rose-500/30'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. RSSI KPI */}
      <KpiCard
        title="Carrier RSSI"
        icon={<Signal className="w-3.5 h-3.5 text-cyan-400" />}
        value={`${currentRssi !== null ? currentRssi : '—'}`}
        unit={currentRssi === null ? '' : 'dBm'}
        qualityBadge={
          <span className={cn('px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border', getSignalQualityBgClass(currentRssi))}>
            {getSignalQualityLabel(currentRssi)}
          </span>
        }
        stats={[
          { label: 'MIN', value: minRssi === null ? '—' : `${minRssi} dBm` },
          { label: 'MAX', value: maxRssi === null ? '—' : `${maxRssi} dBm` },
          { label: 'AVG', value: avgRssi === null ? '—' : `${avgRssi.toFixed(1)} dBm` },
        ]}
        sparklineData={rssiPoints}
        sparklineColor="#0ea5e9"
        valueColorClass={getSignalQualityClass(currentRssi)}
      />

      {/* 2. SNR KPI */}
      <KpiCard
        title="Signal-to-Noise (SNR)"
        icon={<Activity className="w-3.5 h-3.5 text-teal-400" />}
        value={`${currentSnr !== null ? currentSnr.toFixed(1) : '—'}`}
        unit={currentSnr === null ? '' : 'dB'}
        qualityBadge={
          <span className={cn('px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border', getSnrQualityBgClass(currentSnr))}>
            {getSnrQualityLabel(currentSnr)}
          </span>
        }
        stats={[
          { label: 'MIN', value: minSnr === null ? '—' : `${minSnr.toFixed(1)} dB` },
          { label: 'MAX', value: maxRssi === null ? '—' : `${maxSnr?.toFixed(1)} dB` },
          { label: 'AVG', value: avgSnr === null ? '—' : `${avgSnr.toFixed(1)} dB` },
        ]}
        sparklineData={snrPoints}
        sparklineColor="#14b8a6"
        valueColorClass={getSnrQualityClass(currentSnr)}
      />

      {/* 3. Throughput KPI */}
      <KpiCard
        title="Downlink Rate"
        icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
        value={liveThroughput === null ? 'No Data' : formatBps(liveThroughput)}
        unit=""
        qualityBadge={
          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#2B1B0A] text-amber-300 border border-amber-500/30">
            Live Rate
          </span>
        }
        stats={[
          { label: 'SRC', value: liveThroughput === null ? 'UNAVAIL' : 'PAYLOAD' },
          { label: 'UNIT', value: 'BITS/S' },
          { label: 'STATE', value: liveThroughput === null ? 'WAIT' : 'ACTIVE' },
        ]}
        sparklineData={throughputPoints}
        sparklineColor="#f59e0b"
        valueColorClass="text-white"
      />

      {/* 4. Packet Success KPI */}
      <KpiCard
        icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
        title="Segment Delivery"
        value={successRate === null ? 'No Data' : `${successRate.toFixed(2)}%`}
        unit=""
        qualityBadge={
          <span className={cn('px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border', deliveryBadgeClass)}>
            {health}
          </span>
        }
        stats={[
          { label: 'CONF', value: `${confirmed.toLocaleString()}` },
          { label: 'ATTEMPT', value: `${attempted.toLocaleString()}` },
          { label: 'LOSS', value: `${Math.max(0, attempted - confirmed)} segs` },
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
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between hover:border-[#1E2E52] transition-colors">
      {/* Top Title & Badge */}
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-slate-400">
              {icon}
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {title}
            </h3>
          </div>
          {qualityBadge}
        </div>

        {/* Value and Sparkline Row */}
        <div className="flex items-end justify-between my-2">
          <div>
            <span className={cn('text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums', valueColorClass)}>
              {value}
            </span>
            {unit && <span className="text-xs font-normal text-slate-400 font-mono ml-1">{unit}</span>}
          </div>

          {/* Mini Sparkline */}
          <div className="w-16 h-6 flex items-center justify-end">
            <SvgSparkline data={sparklineData} stroke={sparklineColor} />
          </div>
        </div>
      </div>

      {/* Bottom Sub-stats */}
      <div className="pt-2 border-t border-[#131E35] grid grid-cols-3 gap-1 text-center">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-[#050810] rounded px-1 py-0.5 border border-[#131E35]">
            <div className="text-[8px] uppercase tracking-wide text-slate-500 font-mono">{s.label}</div>
            <div className="text-[9px] font-mono font-semibold text-slate-200 truncate tabular-nums">{s.value}</div>
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
        <div className="w-full h-[1px] bg-slate-800" />
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const width = 64;
  const height = 24;
  const padding = 1;

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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
