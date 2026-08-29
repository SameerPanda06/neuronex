import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Activity, Radio } from 'lucide-react';
import { getSnrQualityLabel, getSnrQualityClass } from '../../hooks/useTelemetry';
import { cn } from '../../utils/format';
import type { Telemetry } from '../../types';
import { useMemo } from 'react';

interface SnrChartCardProps {
  telemetry: Telemetry[];
  loading?: boolean;
}

export function SnrChartCard({ telemetry, loading }: SnrChartCardProps) {
  // Format data for Recharts
  const chartData = useMemo(() => telemetry
    .slice(0, 35)
    .reverse()
    .filter((t) => t.snr !== null)
    .map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        time,
        snr: parseFloat(Number(t.snr).toFixed(1)),
        packet_type: t.packet_type,
      };
    }), [telemetry]);

  const snrValues = useMemo(
    () => telemetry.map((t) => t.snr).filter((v): v is number => v !== null),
    [telemetry],
  );
  const latestSnr = snrValues[0] ?? null;
  const minSnr = snrValues.length > 0 ? Math.min(...snrValues) : null;
  const maxSnr = snrValues.length > 0 ? Math.max(...snrValues) : null;
  const avgSnr =
    snrValues.length > 0 ? snrValues.reduce((a, b) => a + b, 0) / snrValues.length : null;

  // Custom technical tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const data = payload[0].payload;
      return (
        <div className="bg-[#070D1A] border border-[#1E2E52] rounded p-2 shadow-xl text-xs z-50">
          <div className="text-[10px] font-mono text-slate-400 border-b border-[#131E35] pb-1 mb-1 flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="px-1 py-0.2 rounded bg-[#0D1830] text-teal-300 text-[9px] border border-teal-800/40">
              {data.packet_type}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">SNR:</span>
            <span className={cn('font-bold font-mono tabular-nums', getSnrQualityClass(val))}>{val} dB</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-0.5">
            <span className="text-slate-500 text-[10px]">Quality:</span>
            <span className="text-slate-300 text-[10px] uppercase font-semibold">{getSnrQualityLabel(val)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[#131E35]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-teal-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Signal-to-Noise Ratio (dB)
          </h3>
        </div>

        {/* Min / Max / Avg / Current Callouts */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-[#050810] px-2 py-0.5 rounded border border-[#131E35] font-mono">
            <span className="text-slate-500">MIN: <strong className="text-slate-300 tabular-nums">{minSnr === null ? '—' : minSnr.toFixed(1)}</strong></span>
            <span className="text-slate-500">MAX: <strong className="text-slate-300 tabular-nums">{maxSnr === null ? '—' : maxSnr.toFixed(1)}</strong></span>
            <span className="text-slate-500">AVG: <strong className="text-teal-400 tabular-nums">{avgSnr === null ? '—' : avgSnr.toFixed(1)}</strong></span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase">Current:</span>
            <span className={cn('text-xs font-bold font-mono tabular-nums', getSnrQualityClass(latestSnr))}>
              {latestSnr === null ? '—' : `${latestSnr.toFixed(1)} dB`}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-56 mt-1">
        {loading && chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5 font-mono">
            <Radio className="w-5 h-5 animate-pulse text-teal-400" />
            <span>Acquiring SNR telemetry...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
            <Activity className="w-5 h-5 text-slate-600" />
            <span>No telemetry available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#131E35" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={9}
                fontFamily="Cascadia Mono, Consolas, monospace"
                tickLine={false}
                axisLine={{ stroke: '#131E35' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[-10, 16]}
                ticks={[-10, -5, 0, 5, 10, 15]}
                stroke="#64748b"
                fontSize={9}
                fontFamily="Cascadia Mono, Consolas, monospace"
                tickLine={false}
                axisLine={{ stroke: '#131E35' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Noise floor and thresholds */}
              <ReferenceLine
                y={0}
                stroke="#64748b"
                strokeDasharray="2 2"
                label={{ value: 'NOISE FLOOR (0 dB)', position: 'insideBottomRight', fill: '#64748b', fontSize: 8, opacity: 0.6 }}
              />
              <ReferenceLine
                y={10}
                stroke="#10b981"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
                label={{ value: 'EXCELLENT (10 dB)', position: 'insideTopRight', fill: '#10b981', fontSize: 8, opacity: 0.7 }}
              />
              <Line
                type="monotone"
                dataKey="snr"
                stroke="#14b8a6"
                strokeWidth={1.5}
                dot={{ r: 1.5, fill: '#14b8a6', stroke: '#070D1A', strokeWidth: 1 }}
                activeDot={{ r: 4, fill: '#2dd4bf', stroke: '#fff', strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
