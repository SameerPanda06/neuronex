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

interface SnrChartCardProps {
  telemetry: Telemetry[];
  loading?: boolean;
}

export function SnrChartCard({ telemetry, loading }: SnrChartCardProps) {
  // Format data for Recharts
  const chartData = telemetry
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
    });

  const snrValues = telemetry.map((t) => t.snr).filter((v): v is number => v !== null);
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
        <div className="bg-[#070D1C] border border-teal-500/40 rounded-lg p-2.5 shadow-xl font-mono text-xs z-50">
          <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 text-[9px] border border-teal-800/40">
              {data.packet_type}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">SNR:</span>
            <span className={cn('font-bold', getSnrQualityClass(val))}>{val} dB</span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-0.5">
            <span className="text-slate-400 text-[10px]">Quality:</span>
            <span className="text-slate-200 text-[10px] uppercase">{getSnrQualityLabel(val)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
              SNR TELEMETRY (dB)
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-teal-900/40">
                SIGNAL MARGIN
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Signal-to-Noise Ratio over contact timeline
            </p>
          </div>
        </div>

        {/* Min / Max / Avg / Current Callouts */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-500">MIN: <strong className="text-slate-300 font-bold">{minSnr === null ? '—' : minSnr.toFixed(1)}</strong></span>
            <span className="text-slate-500">MAX: <strong className="text-slate-300 font-bold">{maxSnr === null ? '—' : maxSnr.toFixed(1)}</strong></span>
            <span className="text-slate-500">AVG: <strong className="text-teal-400 font-bold">{avgSnr === null ? '—' : avgSnr.toFixed(1)}</strong></span>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400">CURRENT</div>
            <div className={cn('text-sm font-black', getSnrQualityClass(latestSnr))}>
              {latestSnr === null ? '—' : `${latestSnr.toFixed(1)} dB`}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 mt-2">
        {loading && chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
            <Radio className="w-6 h-6 animate-pulse text-teal-400" />
            <span>ACQUIRING SNR TELEMETRY...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
            <Activity className="w-6 h-6 text-slate-600" />
            <span>NO TELEMETRY AVAILABLE</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={10}
                fontFamily="JetBrains Mono"
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[-10, 16]}
                ticks={[-10, -5, 0, 5, 10, 15]}
                stroke="#64748b"
                fontSize={10}
                fontFamily="JetBrains Mono"
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Noise floor and thresholds */}
              <ReferenceLine
                y={0}
                stroke="#64748b"
                strokeDasharray="3 3"
                label={{ value: 'NOISE FLOOR (0 dB)', position: 'insideBottomRight', fill: '#64748b', fontSize: 9, opacity: 0.6 }}
              />
              <ReferenceLine
                y={10}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
                label={{ value: 'EXCELLENT (10 dB)', position: 'insideTopRight', fill: '#10b981', fontSize: 9, opacity: 0.6 }}
              />
              <Line
                type="monotone"
                dataKey="snr"
                stroke="#14b8a6"
                strokeWidth={2.2}
                dot={{ r: 2, fill: '#14b8a6', stroke: '#070D1C', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: '#2dd4bf', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
