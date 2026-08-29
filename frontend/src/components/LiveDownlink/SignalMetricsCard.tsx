import type { SignalQuality } from '../../types';
import { Signal, Radio } from 'lucide-react';

interface SignalMetricsCardProps {
  signalData: SignalQuality | null;
}

export function SignalMetricsCard({ signalData }: SignalMetricsCardProps) {
  const rssi = signalData?.stats?.rssi?.current ?? null;
  const snr = signalData?.stats?.snr?.current ?? null;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#131E35]">
        <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
          <Signal className="w-3 h-3 text-cyan-400" />
          <span>RF Demodulation Telemetry</span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono">LORA SF7 / 125 KHZ</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {/* RSSI */}
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Carrier RSSI</div>
          <div className="text-base font-bold font-mono tabular-nums text-white mt-0.5">
            {rssi !== null ? `${rssi}` : '—'}
          </div>
          <div className="text-[9px] text-slate-500 font-mono">dBm</div>
        </div>

        {/* SNR */}
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Carrier SNR</div>
          <div className="text-base font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
            {snr !== null ? `${snr.toFixed(1)}` : '—'}
          </div>
          <div className="text-[9px] text-slate-500 font-mono">dB</div>
        </div>

        {/* Frequency */}
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Frequency</div>
          <div className="text-base font-bold font-mono tabular-nums text-cyan-300 mt-0.5">
            433.0
          </div>
          <div className="text-[9px] text-slate-500 font-mono">MHz</div>
        </div>

        {/* Ingest Packets */}
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">Link State</div>
          <div className="text-base font-bold font-mono text-slate-200 mt-0.5 flex items-center justify-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-xs">LOCKED</span>
          </div>
          <div className="text-[9px] text-slate-500 font-mono">CRC OK</div>
        </div>
      </div>
    </div>
  );
}
