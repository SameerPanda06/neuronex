import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Signal, Radio } from 'lucide-react';
import { getSignalQualityLabel, getSignalQualityClass } from '../../hooks/useTelemetry';
import { cn } from '../../utils/format';
import type { Telemetry } from '../../types';
import { useMemo } from 'react';

interface RssiChartCardProps {
  telemetry: Telemetry[];
  loading?: boolean;
}

export function RssiChartCard({ telemetry, loading }: RssiChartCardProps) {
  // Format data for Recharts (chronological order)
  const chartData = useMemo(() => telemetry
    .slice(0, 35)
    .reverse()
    .filter((t) => t.rssi !== null)
    .map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        time,
        rssi: t.rssi,
        snr: t.snr,
        packet_type: t.packet_type,
        segment: t.segment_num === null ? 'TX' : `#${t.segment_num}`,
      };
    }), [telemetry]);

  const latestRssi = telemetry.find((point) => point.rssi !== null)?.rssi ?? null;

  // Custom technical tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const data = payload[0].payload;
      return (
        <div className="bg-[#070D1A] border border-[#1E2E52] rounded p-2 shadow-xl text-xs z-50">
          <div className="text-[10px] font-mono text-slate-400 border-b border-[#131E35] pb-1 mb-1 flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="px-1 py-0.2 rounded bg-[#0D1830] text-cyan-300 text-[9px] border border-cyan-800/40">
              {data.packet_type}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">RSSI:</span>
            <span className={cn('font-bold font-mono tabular-nums', getSignalQualityClass(val))}>{val} dBm</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-0.5">
            <span className="text-slate-500 text-[10px]">Status:</span>
            <span className="text-slate-300 text-[10px] uppercase font-semibold">{getSignalQualityLabel(val)}</span>
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
          <Signal className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Carrier RSSI Spectrum (dBm)
          </h3>
        </div>

        {/* Live Value & Reference Range Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase">Current:</span>
            <span className={cn('text-xs font-bold font-mono tabular-nums', getSignalQualityClass(latestRssi))}>
              {latestRssi === null ? '—' : `${latestRssi} dBm`}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-[#131E35]" />
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
            <span className="text-emerald-400">&gt;-70 Strong</span>
            <span className="text-cyan-400">&gt;-85 Good</span>
            <span className="text-amber-400">&gt;-100 Fair</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-56 mt-1">
        {loading && chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5 font-mono">
            <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
            <span>Acquiring RF telemetry stream...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
            <Signal className="w-5 h-5 text-slate-600" />
            <span>No telemetry available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rssiAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity="0.3" />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>
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
                domain={[-120, -40]}
                ticks={[-120, -100, -85, -70, -40]}
                stroke="#64748b"
                fontSize={9}
                fontFamily="Cascadia Mono, Consolas, monospace"
                tickLine={false}
                axisLine={{ stroke: '#131E35' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Threshold reference lines */}
              <ReferenceLine
                y={-70}
                stroke="#10b981"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
                label={{ value: 'STRONG (-70)', position: 'insideTopRight', fill: '#10b981', fontSize: 8, opacity: 0.7 }}
              />
              <ReferenceLine
                y={-100}
                stroke="#f59e0b"
                strokeDasharray="2 2"
                strokeOpacity={0.4}
                label={{ value: 'FAIR (-100)', position: 'insideTopRight', fill: '#f59e0b', fontSize: 8, opacity: 0.7 }}
              />
              <Area
                type="monotone"
                dataKey="rssi"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#rssiAreaGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
