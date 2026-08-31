// SignalAnalytics — Real-time RSSI/SNR signal quality dashboard with charts
import React, { useState, useEffect } from 'react';
import { useLatestTelemetry, useTelemetryHistory } from '../hooks/useTelemetry';
import { telemetryApi } from '../services/api';
import { cn, formatBps } from '../utils/format';
import {
  Signal, Activity, BarChart3, TrendingUp,
  AlertTriangle, CheckCircle, ArrowDown, ArrowUp
} from 'lucide-react';

export default function SignalAnalytics() {
  const { data: telemetryData, loading } = useLatestTelemetry();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await telemetryApi.history({ hours: 1, limit: 200 });
        setHistoryData(res.data?.data || []);
      } catch (e) {
        console.error('Failed to fetch history:', e);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const latest = telemetryData?.latest_overall;

  const getSignalQuality = (rssi: number, snr: number) => {
    if (rssi >= -70 && snr >= 10) return { quality: 'Excellent', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (rssi >= -85 && snr >= 5) return { quality: 'Good', color: 'text-lime-400', bg: 'bg-lime-500/20' };
    if (rssi >= -100 && snr >= 0) return { quality: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rssi >= -115 && snr >= -5) return { quality: 'Poor', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { quality: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const rssi = latest?.rssi ?? -90;
  const snr = latest?.snr ?? 5;
  const sig = getSignalQuality(rssi, snr);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-space font-bold text-2xl text-white">Signal Analytics</h2>
        <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium', sig.bg, sig.color)}>
          {sig.quality}
        </div>
      </div>

      {/* Signal Quality Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SignalCard
          label="RSSI"
          value={`${rssi} dBm`}
          sub="Signal Strength"
          quality={rssi >= -85 ? 'good' : rssi >= -100 ? 'fair' : 'poor'}
          icon={<Signal className="w-5 h-5" />}
        />
        <SignalCard
          label="SNR"
          value={`${snr} dB`}
          sub="Signal-to-Noise Ratio"
          quality={snr >= 5 ? 'good' : snr >= 0 ? 'fair' : 'poor'}
          icon={<Activity className="w-5 h-5" />}
        />
        <SignalCard
          label="Throughput"
          value={latest?.latency_ms ? `${latest.latency_ms.toFixed(1)} ms` : '—'}
          sub="Packet Latency"
          quality="good"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* RSSI/SNR History Chart */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-neuronex-400" />
          Signal History (Last Hour)
        </h3>
        {historyLoading ? (
          <div className="h-48 bg-space-800 rounded animate-pulse" />
        ) : (
          <SignalChart data={historyData} />
        )}
      </div>

      {/* Packet Distribution */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4">Packet Types</h3>
        <div className="grid grid-cols-4 gap-4">
          <PacketStat type="DATA" count={historyData.filter(p => p.packet_type === 'DATA').length} color="blue" />
          <PacketStat type="META" count={historyData.filter(p => p.packet_type === 'META').length} color="purple" />
          <PacketStat type="STATUS" count={historyData.filter(p => p.packet_type === 'STATUS').length} color="green" />
          <PacketStat type="ACK" count={historyData.filter(p => p.packet_type === 'ACK').length} color="cyan" />
        </div>
      </div>
    </div>
  );
}

function SignalCard({ label, value, sub, quality, icon }: {
  label: string; value: string; sub: string;
  quality: 'good' | 'fair' | 'poor'; icon: React.ReactNode;
}) {
  const colors = {
    good: 'text-green-400 bg-green-500/20',
    fair: 'text-yellow-400 bg-yellow-500/20',
    poor: 'text-red-400 bg-red-500/20',
  };
  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-5">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colors[quality])}>{icon}</div>
      <p className="text-neuronex-400 text-xs mb-1">{label}</p>
      <p className="text-white font-mono font-bold text-2xl">{value}</p>
      <p className="text-neuronex-400 text-xs mt-1">{sub}</p>
    </div>
  );
}

function SignalChart({ data }: { data: any[] }) {
  const rssiData = data.map(d => d.rssi || 0);
  const snrData = data.map(d => d.snr || 0);
  const maxRssi = Math.max(...rssiData, -40);
  const minRssi = Math.min(...rssiData, -120);
  const maxSnr = Math.max(...snrData, 20);
  const minSnr = Math.min(...snrData, -5);

  const chartH = 180;
  const chartW = 800;
  const toY = (val: number, min: number, max: number) => ((max - val) / (max - min)) * chartH;

  return (
    <div className="relative" style={{ height: chartH + 40 }}>
      <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={0} y1={chartH * p} x2={chartW} y2={chartH * p} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {/* RSSI line */}
        {rssiData.length > 1 && (
          <polyline
            points={rssiData.map((v, i) => `${(i / (rssiData.length - 1)) * chartW},${toY(v, minRssi, maxRssi)}`).join(' ')}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />
        )}
        {/* SNR line */}
        {snrData.length > 1 && (
          <polyline
            points={snrData.map((v, i) => `${(i / (snrData.length - 1)) * chartW},${toY(v, minSnr, maxSnr)}`).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
          />
        )}
      </svg>
      <div className="flex justify-center gap-6 mt-2">
        <span className="flex items-center gap-1 text-xs"><span className="w-3 h-0.5 bg-green-500 rounded" /> RSSI</span>
        <span className="flex items-center gap-1 text-xs"><span className="w-3 h-0.5 bg-blue-500 rounded" /> SNR</span>
      </div>
    </div>
  );
}

function PacketStat({ type, count, color }: { type: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    green: 'text-green-400 bg-green-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/20',
  };
  return (
    <div className="text-center">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2', colors[color])}>
        <span className="font-mono font-bold text-lg text-white">{count}</span>
      </div>
      <p className="text-neuronex-400 text-xs">{type}</p>
    </div>
  );
}