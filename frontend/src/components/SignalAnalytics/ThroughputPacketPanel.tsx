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
  const throughputData = telemetry
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
    });

  // Calculate packet types distribution
  const packetTypeCounts: Record<PacketType, number> = {
    DATA: 0,
    ACK: 0,
    TELEMETRY: 0,
    NACK: 0,
    META: 0,
    STATUS: 0,
    DONE: 0,
  };

  telemetry.forEach((t) => {
    if (t.packet_type && packetTypeCounts[t.packet_type] !== undefined) {
      packetTypeCounts[t.packet_type]++;
    } else {
      packetTypeCounts.DATA++;
    }
  });

  const packetDistributionData = [
    { type: 'DATA', count: packetTypeCounts.DATA, color: '#06b6d4' },
    { type: 'ACK', count: packetTypeCounts.ACK, color: '#10b981' },
    { type: 'TELEM', count: packetTypeCounts.TELEMETRY, color: '#14b8a6' },
    { type: 'META', count: packetTypeCounts.META, color: '#8b5cf6' },
    { type: 'NACK', count: packetTypeCounts.NACK, color: '#f43f5e' },
  ];

  const totalPackets = telemetry.length;
  const retransmitCount = retransStats?.total ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Throughput Over Time */}
      <div className="lg:col-span-2 bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
                THROUGHPUT HISTORY
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-900/40">
                  REAL-TIME TX
                </span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Ground station frame ingest and downlink throughput
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <div className="text-[10px] text-slate-400">LIVE BANDWIDTH</div>
              <div className="text-sm font-black text-amber-300">
                {baseRate === null || baseRate === undefined ? 'NO DATA' : formatBps(baseRate)}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughputData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
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
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                fontFamily="JetBrains Mono"
                tickLine={false}
                axisLine={{ stroke: '#1e293b' }}
                tickFormatter={(val) => formatBps(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070D1C',
                  borderColor: '#f59e0b',
                  borderRadius: '0.5rem',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                  color: '#fff',
                }}
                formatter={(val: number) => [formatBps(val), 'Throughput']}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#throughputGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right 1 Col: Packet Delivery Quality & Distribution */}
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-space font-bold text-sm text-white">PACKET QUALITY</h3>
              <p className="text-[11px] font-mono text-slate-400">Delivery and frame distribution</p>
            </div>
          </div>

          {/* Metrics summary list */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-semibold">SEGMENT DELIVERY</span>
              </div>
              <div className="text-base font-mono font-black text-emerald-300">
                {deliveryMetric.percentage === null ? 'NO DATA' : `${deliveryMetric.percentage.toFixed(2)}%`}
              </div>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">{deliveryMetric.confirmed} / {deliveryMetric.attempted} confirmed</div>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-semibold">RETRANSMITS</span>
              </div>
              <div className="text-base font-mono font-black text-amber-300">{retransmitCount} requests</div>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                {retransStats?.pending ?? 0} active NACKs
              </div>
            </div>
          </div>

          {/* Packet Distribution Micro Bar Chart */}
          <div className="text-[11px] font-mono text-slate-300 font-semibold mb-1.5 flex justify-between">
            <span>PACKET TYPES</span>
            <span className="text-slate-400 text-[10px]">{totalPackets} in buffer</span>
          </div>

          <div className="w-full h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packetDistributionData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="type"
                  stroke="#64748b"
                  fontSize={9}
                  fontFamily="JetBrains Mono"
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={9}
                  fontFamily="JetBrains Mono"
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070D1C',
                    borderColor: '#0284c7',
                    borderRadius: '0.5rem',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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
