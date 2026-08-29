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

interface RssiChartCardProps {
  telemetry: Telemetry[];
  loading?: boolean;
}

export function RssiChartCard({ telemetry, loading }: RssiChartCardProps) {
  // Format data for Recharts (chronological order)
  const chartData = telemetry
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
    });

  const latestRssi = telemetry.find((point) => point.rssi !== null)?.rssi ?? null;

  // Custom technical tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const data = payload[0].payload;
      return (
        <div className="bg-[#070D1C] border border-cyan-500/40 rounded-lg p-2.5 shadow-xl font-mono text-xs z-50">
          <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[9px] border border-cyan-800/40">
              {data.packet_type}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">RSSI:</span>
            <span className={cn('font-bold', getSignalQualityClass(val))}>{val} dBm</span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-0.5">
            <span className="text-slate-400 text-[10px]">Status:</span>
            <span className="text-slate-200 text-[10px] uppercase">{getSignalQualityLabel(val)}</span>
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
          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Signal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
              RSSI TELEMETRY (dBm)
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-cyan-900/40">
                LORA RF
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Received Signal Strength Indicator over contact timeline
            </p>
          </div>
        </div>

        {/* Live Value & Reference Range Badges */}
        <div className="flex items-center gap-2 font-mono">
          <div className="text-right">
            <div className="text-[10px] text-slate-400">CURRENT</div>
            <div className={cn('text-sm font-black', getSignalQualityClass(latestRssi))}>
              {latestRssi === null ? '—' : `${latestRssi} dBm`}
            </div>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> &gt;-70 Strong
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> &gt;-85 Good
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> &gt;-100 Fair
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 mt-2">
        {loading && chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
            <Radio className="w-6 h-6 animate-pulse text-cyan-400" />
            <span>ACQUIRING RF TELEMETRY STREAM...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
            <Signal className="w-6 h-6 text-slate-600" />
            <span>NO TELEMETRY AVAILABLE</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rssiAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                domain={[-120, -40]}
                ticks={[-120, -100, -85, -70, -40]}
                stroke="#64748b"
                fontSize={10}
                fontFamily="JetBrains Mono"
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Threshold reference lines */}
              <ReferenceLine
                y={-70}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
                label={{ value: 'STRONG (-70)', position: 'insideTopRight', fill: '#10b981', fontSize: 9, opacity: 0.6 }}
              />
              <ReferenceLine
                y={-100}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                label={{ value: 'FAIR (-100)', position: 'insideTopRight', fill: '#f59e0b', fontSize: 9, opacity: 0.6 }}
              />
              <Area
                type="monotone"
                dataKey="rssi"
                stroke="#06b6d4"
                strokeWidth={2.2}
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
