import type { Image, SignalQuality, RevolutionStatusResponse } from '../../types';
import { Radio, Signal, Clock, Database } from 'lucide-react';
import { formatBps } from '../../utils/format';

interface KpiCardsProps {
  activeImage: Image | null;
  signalData: SignalQuality | null;
  revStatus: RevolutionStatusResponse | null;
  queue: Image[] | null;
}

export function KpiCards({
  activeImage,
  signalData,
  revStatus,
  queue,
}: KpiCardsProps) {
  // 1. Live Throughput / Downlink Status
  const isStreaming = activeImage !== null && activeImage.status === 'transmitting';
  const throughputBps = activeImage?.throughput_bps ?? null;
  const throughputLabel = isStreaming
    ? throughputBps !== null ? formatBps(throughputBps) : 'Active Stream'
    : 'Standby';

  // 2. Link Quality (RSSI & SNR)
  const rssi = signalData?.stats?.rssi?.current ?? null;
  const snr = signalData?.stats?.snr?.current ?? null;

  // Signal Strength bars helper
  const getSignalBars = (val: number | null) => {
    if (val === null) return 0;
    if (val >= -70) return 4;
    if (val >= -85) return 3;
    if (val >= -100) return 2;
    return 1;
  };
  const bars = getSignalBars(rssi);

  // 3. Orbit Window / Revolution
  const activeRev = revStatus?.revolution ?? null;
  const inContact = revStatus?.active ?? false;
  const timeRemaining = revStatus?.time_remaining ?? null;
  const mins = String(Math.floor((timeRemaining ?? 0) / 60)).padStart(2, '0');
  const secs = String((timeRemaining ?? 0) % 60).padStart(2, '0');
  const countdown = timeRemaining === null ? '—' : `${mins}:${secs}`;

  // 4. Transmission Queue
  const queueCount = queue?.length ?? 0;
  const nextP1 = queue?.[0]?.priority === 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Downlink Link Speed */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Downlink Rate</span>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {throughputLabel}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Payload Stream</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
            isStreaming
              ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {isStreaming ? 'Transmitting' : 'Idle'}
          </span>
        </div>
      </div>

      {/* 2. RF Carrier Quality */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Signal (RSSI / SNR)</span>
            <Signal className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between my-1">
            <div className="flex items-baseline">
              <span className="text-xl font-bold font-mono tabular-nums text-white">
                {rssi !== null ? `${rssi}` : '—'}
              </span>
              <span className="text-xs font-normal text-slate-400 font-mono ml-1">dBm</span>
            </div>

            {/* Signal Strength 4-Bar Meter */}
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3, 4].map((barIndex) => (
                <div
                  key={barIndex}
                  className={`w-1 rounded-none transition-all ${
                    barIndex <= bars
                      ? bars >= 3
                        ? 'bg-emerald-400'
                        : bars === 2
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                      : 'bg-slate-800'
                  }`}
                  style={{ height: `${barIndex * 25}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Carrier SNR</span>
          <span className="text-slate-200 font-mono tabular-nums text-[11px]">
            {snr !== null ? `${snr.toFixed(1)} dB` : '—'}
          </span>
        </div>
      </div>

      {/* 3. Orbit Window */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Orbit Pass Contact</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-xl font-bold font-mono tabular-nums text-cyan-300">
              {inContact ? countdown : 'Standby'}
            </span>
            {inContact && <span className="text-xs font-normal text-slate-400 font-mono">rem</span>}
          </div>
        </div>
        <div className="pt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            {activeRev ? `Rev #${activeRev.revolution_num}` : 'Rev —'}
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
            inContact
              ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {inContact ? 'In Contact' : 'Standby'}
          </span>
        </div>
      </div>

      {/* 4. Downlink Queue */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Downlink Queue</span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {queueCount}
            </span>
            <span className="text-xs font-normal text-slate-400 font-mono ml-1">frames</span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Priority Mode</span>
          <span className="text-cyan-300 font-mono text-[11px]">
            {nextP1 ? 'P1 Urgent First' : 'Standard FIFO'}
          </span>
        </div>
      </div>
    </div>
  );
}
