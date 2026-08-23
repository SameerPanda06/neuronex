// Metrics Panel - Real-time signal quality charts
import React, { useState } from 'react';
import { useSignalQuality, getSignalQualityClass, getSignalQualityLabel } from '../hooks/useTelemetry';
import { cn, formatBps, formatDate } from '../utils/format';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { Signal, Activity, TrendingUp, TrendingDown, Maximize2 } from 'lucide-react';

export function MetricsPanel() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const { data, loading, error } = useSignalQuality(undefined, timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168);

  const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;

  return (
    <section id="metrics" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-space font-bold text-2xl text-white">Signal Metrics</h2>
          <p className="text-neuronex-400 text-sm">Real-time RSSI, SNR, and throughput from ESP32 telemetry</p>
        </div>

        <div className="flex items-center gap-2">
          {(['1h', '6h', '24h', '7d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                timeRange === range
                  ? 'bg-neuronex-500 text-white'
                  : 'bg-white/5 text-neuronex-300 hover:bg-white/10'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Current Signal Quality Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CurrentMetricCard
          label="RSSI"
          value={data?.stats?.rssi?.current ?? null}
          unit="dBm"
          icon={<Signal className="w-5 h-5" />}
          qualityClass={getSignalQualityClass(data?.stats?.rssi?.current ?? null)}
          qualityLabel={getSignalQualityLabel(data?.stats?.rssi?.current ?? null)}
          trend={data?.stats?.rssi ? {
            min: data.stats.rssi.min,
            max: data.stats.rssi.max,
            avg: data.stats.rssi.avg
          } : null}
        />
        <CurrentMetricCard
          label="SNR"
          value={data?.stats?.snr?.current ?? null}
          unit="dB"
          icon={<Activity className="w-5 h-5" />}
          qualityClass={getSnrQualityClass(data?.stats?.snr?.current ?? null)}
          qualityLabel={getSnrQualityLabel(data?.stats?.snr?.current ?? null)}
          trend={data?.stats?.snr ? {
            min: data.stats.snr.min,
            max: data.stats.snr.max,
            avg: data.stats.snr.avg
          } : null}
        />
        <CurrentMetricCard
          label="Throughput"
          value={data?.telemetry?.[0] ? parseFloat(formatBps(data.telemetry[0].snr || 0)) : null}
          unit="bps"
          icon={<TrendingUp className="w-5 h-5" />}
          qualityClass="text-neuronex-400"
          qualityLabel="Live"
          isThroughput
        />
        <CurrentMetricCard
          label="Packets"
          value={data?.count ?? 0}
          unit="total"
          icon={<TrendingDown className="w-5 h-5" />}
          qualityClass="text-neuronex-400"
          qualityLabel={`${hours}h window`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RSSI Chart */}
        <ChartCard title="RSSI (dBm)" subtitle="Received Signal Strength Indicator" icon={<Signal className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.telemetry?.reverse() || []}>
              <defs>
                <linearGradient id="rssiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff10' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff10' }}
                domain={[-120, -40]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0c4a6e', border: '1px solid #0ea5e9', borderRadius: '8px' }}
                labelFormatter={(value) => formatDate(value)}
                formatter={(value) => [value, 'dBm']}
              />
              <Area
                type="monotone"
                dataKey="rssi"
                stroke="#0ea5e9"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#rssiGradient)"
                connectNulls={true}
              />
              {/* Reference lines */}
              <line y1={0} y2={300} x1={-50} x2={-50} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* SNR Chart */}
        <ChartCard title="SNR (dB)" subtitle="Signal-to-Noise Ratio" icon={<Activity className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.telemetry?.reverse() || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff10' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff10' }}
                domain={[-10, 15]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0c4a6e', border: '1px solid #0ea5e9', borderRadius: '8px' }}
                labelFormatter={(value) => formatDate(value)}
                formatter={(value) => [value, 'dB']}
              />
              <Line
                type="monotone"
                dataKey="snr"
                stroke="#84cc16"
                strokeWidth={2}
                dot={false}
                connectNulls={true}
              />
              <Line y={0} stroke="#64748b" strokeDasharray="3 3" strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Packet Type Distribution */}
        <ChartCard title="Packet Types" subtitle="Distribution by type" icon={<Activity className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(data?.telemetry?.reduce((acc: any, t) => {
              acc[t.packet_type] = (acc[t.packet_type] || 0) + 1;
              return acc;
            }, {}) || {}).map(([type, count]) => ({ type, count })) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="type"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff10' }}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#ffffff10' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0c4a6e', border: '1px solid #0ea5e9', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Throughput Over Time */}
        <ChartCard title="Throughput" subtitle="Data rate over time" icon={<TrendingUp className="w-4 h-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.telemetry?.reverse() || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#ffffff10' }}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#ffffff10' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0c4a6e', border: '1px solid #0ea5e9', borderRadius: '8px' }} />
              <Line
                type="monotone"
                dataKey="snr"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Raw Telemetry Table */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-space font-semibold text-lg text-white">Recent Telemetry Packets</h3>
          <span className="text-xs text-neuronex-400">{data?.count || 0} packets in last {hours}h</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-neuronex-400">
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 font-medium">Image</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Segment</th>
                <th className="p-3 font-medium">RSSI</th>
                <th className="p-3 font-medium">SNR</th>
              </tr>
            </thead>
            <tbody>
              {data?.telemetry?.slice(0, 20).map((t, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 text-xs font-mono text-neuronex-300">{formatDate(t.timestamp)}</td>
                  <td className="p-3 text-xs font-mono text-white">{t.image_id}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-neuronex-300">{t.packet_type}</span>
                  </td>
                  <td className="p-3 text-xs text-neuronex-400">{t.segment_num !== null ? `${t.segment_num}/${t.total_segments}` : '—'}</td>
                  <td className="p-3">
                    <span className={cn('font-mono', getSignalQualityClass(t.rssi))}>
                      {t.rssi !== null ? `${t.rssi} dBm` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={cn('font-mono', getSnrQualityClass(t.snr))}>
                      {t.snr !== null ? `${t.snr.toFixed(1)} dB` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CurrentMetricCard({ label, value, unit, icon, qualityClass, qualityLabel, trend, isThroughput }: any) {
  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-5 hover:border-neuronex-500/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
          <div>
            <p className="text-xs text-neuronex-400">{label}</p>
            <p className="text-xs text-neuronex-500">{unit}</p>
          </div>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', qualityClass)}>
          {qualityLabel}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className={cn('font-space font-bold text-3xl font-mono', qualityClass)}>
            {value !== null && value !== undefined ? (isThroughput ? formatBps(value) : value.toFixed(value < 10 ? 1 : 0)) : '—'}
          </p>
        </div>

        {trend && (
          <div className="text-right text-xs">
            <p className="text-neuronex-400">Min: {trend.min} • Max: {trend.max}</p>
            <p className="text-neuronex-500">Avg: {trend.avg.toFixed(1)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/5 rounded">{icon}</div>
          <div>
            <h3 className="font-space font-semibold text-white">{title}</h3>
            <p className="text-xs text-neuronex-400">{subtitle}</p>
          </div>
        </div>
        <Maximize2 className="w-4 h-4 text-neuronex-500 hover:text-white transition-colors cursor-pointer" />
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function getSnrQualityClass(snr: number | null): string {
  if (snr === null) return 'text-gray-400';
  if (snr >= 10) return 'text-signal-excellent';
  if (snr >= 5) return 'text-signal-good';
  if (snr >= 0) return 'text-signal-fair';
  if (snr >= -5) return 'text-signal-poor';
  return 'text-signal-critical';
}

function getSnrQualityLabel(snr: number | null): string {
  if (snr === null) return 'No Signal';
  if (snr >= 10) return 'Excellent';
  if (snr >= 5) return 'Good';
  if (snr >= 0) return 'Fair';
  if (snr >= -5) return 'Poor';
  return 'Critical';
}