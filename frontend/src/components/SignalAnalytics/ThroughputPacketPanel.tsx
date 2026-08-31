import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Zap, Layers, CheckCircle2, AlertOctagon } from 'lucide-react';
import { formatBps } from '../../utils/format';
import type { Telemetry, RetransmissionStats, PacketType } from '../../types';
import type { DeliveryMetric } from '../../lib/missionMetrics';
import { useMemo } from 'react';

interface ThroughputPacketPanelProps {
  telemetry: Telemetry[];
  deliveryMetric: DeliveryMetric;
  retransStats: RetransmissionStats | null;
  activeThroughput?: number | null;
}

export function ThroughputPacketPanel({
  telemetry,
  deliveryMetric,
  retransStats,
  activeThroughput,
}: ThroughputPacketPanelProps) {
  // Derive throughput time-series points
  const baseRate = activeThroughput ?? null;
  const throughputData = useMemo(() => telemetry
    .slice(0, 30)
    .reverse()
    .map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const rate = baseRate;
      return {
        time,
        rate,
        rateFormatted: formatBps(rate),
      };
    }), [telemetry, baseRate]);

  // Calculate packet types distribution
  const packetDistributionData = useMemo(() => {
    const counts: Record<PacketType, number> = { DATA: 0, ACK: 0, TELEMETRY: 0, NACK: 0, META: 0, STATUS: 0, DONE: 0 };
    telemetry.forEach((item) => { counts[item.packet_type] += 1; });
    return [
      { type: 'DATA', count: counts.DATA, color: '#0ea5e9' },
      { type: 'ACK', count: counts.ACK, color: '#10b981' },
      { type: 'TELEM', count: counts.TELEMETRY, color: '#14b8a6' },
      { type: 'META', count: counts.META, color: '#6366f1' },
      { type: 'NACK', count: counts.NACK, color: '#f43f5e' },
    ];
  }, [telemetry]);

  const totalPackets = telemetry.length;
  const retransmitCount = retransStats?.total ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left 2 Cols: Throughput Over Time */}
      <div className="lg:col-span-2 bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[#131E35]">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Ingest & Downlink Throughput
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400 uppercase">Live Rate:</span>
            <span className="text-xs font-bold font-mono text-amber-300 tabular-nums">
              {baseRate === null || baseRate === undefined ? 'No Data' : formatBps(baseRate)}
            </span>
          </div>
        </div>

        <div className="w-full h-48 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughputData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
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
              />
              <YAxis
                stroke="#64748b"
                fontSize={9}
                fontFamily="Cascadia Mono, Consolas, monospace"
                tickLine={false}
                axisLine={{ stroke: '#131E35' }}
                tickFormatter={(val) => formatBps(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070D1A',
                  borderColor: '#1E2E52',
                  borderRadius: '0.25rem',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#fff',
                }}
                formatter={(val: number) => [formatBps(val), 'Throughput']}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#throughputGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right 1 Col: Packet Delivery Quality & Distribution */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#131E35]">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white">Packet Distribution</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono tabular-nums">{totalPackets} FRAMES</span>
          </div>

          {/* Metrics summary list */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
              <div className="flex items-center gap-1 text-emerald-400 mb-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[9px] font-semibold uppercase">Delivery</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-300 tabular-nums">
                {deliveryMetric.percentage === null ? 'No Data' : `${deliveryMetric.percentage.toFixed(2)}%`}
              </div>
              <div className="text-[8px] text-slate-400 mt-0.5 font-mono tabular-nums">{deliveryMetric.confirmed} / {deliveryMetric.attempted}</div>
            </div>

            <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
              <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                <AlertOctagon className="w-3 h-3" />
                <span className="text-[9px] font-semibold uppercase">Retransmits</span>
              </div>
              <div className="text-sm font-bold font-mono text-amber-300 tabular-nums">{retransmitCount} reqs</div>
              <div className="text-[8px] text-slate-400 mt-0.5 font-mono">
                {retransStats?.pending ?? 0} active NACKs
              </div>
            </div>
          </div>

          {/* Packet Distribution Micro Bar Chart */}
          <div className="w-full h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packetDistributionData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#131E35" vertical={false} />
                <XAxis
                  dataKey="type"
                  stroke="#64748b"
                  fontSize={8}
                  fontFamily="Cascadia Mono, Consolas, monospace"
                  tickLine={false}
                  axisLine={{ stroke: '#131E35' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={8}
                  fontFamily="Cascadia Mono, Consolas, monospace"
                  tickLine={false}
                  axisLine={{ stroke: '#131E35' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070D1A',
                    borderColor: '#1E2E52',
                    borderRadius: '0.25rem',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {packetDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
