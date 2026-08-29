import type { SignalQuality } from '../../types';
import { ArrowUpRight, Signal } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useMemo } from 'react';

interface SignalOverviewCardProps {
  signalData: SignalQuality | null;
  onNavigate?: () => void;
}

export function SignalOverviewCard({
  signalData,
  onNavigate,
}: SignalOverviewCardProps) {
  const telemetry = signalData?.telemetry;

  // Format recent 12 points for mini sparkline/area
  const chartData = useMemo(() => (telemetry || [])
    .slice(0, 15)
    .reverse()
    .map((t) => ({
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rssi: t.rssi ?? -110,
    })), [telemetry]);

  const currentRssi = signalData?.stats?.rssi?.current ?? telemetry?.[0]?.rssi ?? null;
  const currentSnr = signalData?.stats?.snr?.current ?? telemetry?.[0]?.snr ?? null;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#131E35]">
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Carrier Signal Health
            </h3>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
              title="View full Signal Analytics"
              aria-label="View full Signal Analytics"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Real-time Values Strip */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Live RSSI</div>
            <div className="text-lg font-bold font-mono tabular-nums text-white">
              {currentRssi !== null ? `${currentRssi} dBm` : '—'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Live SNR</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-400">
              {currentSnr !== null ? `${currentSnr.toFixed(1)} dB` : '—'}
            </div>
          </div>
        </div>

        {/* Mini Chart */}
        <div className="w-full h-24 mt-1">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
              Awaiting telemetry...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="signalMiniGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[-120, -50]} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070D1A',
                    borderColor: '#1E2E52',
                    borderRadius: '0.25rem',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: '#fff',
                  }}
                  formatter={(val: number) => [`${val} dBm`, 'RSSI']}
                />
                <Area
                  type="monotone"
                  dataKey="rssi"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  fill="url(#signalMiniGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 mt-1 border-t border-[#131E35] flex items-center justify-between text-[11px]">
        <span className="text-slate-400">LoRa RF Link</span>
        <span className="text-cyan-300 font-mono tabular-nums">
          433.0 MHz Carrier
        </span>
      </div>
    </div>
  );
}
