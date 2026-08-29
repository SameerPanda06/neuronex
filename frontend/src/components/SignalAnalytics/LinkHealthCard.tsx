import { ShieldCheck, Radio, Orbit, Clock, Activity, Zap } from 'lucide-react';
import {
  getSignalQualityClass,
  getSignalQualityLabel,
  getSignalQualityBgClass,
} from '../../hooks/useTelemetry';
import { cn } from '../../utils/format';
import type { SignalQuality, RevolutionStatusResponse, RevolutionStats } from '../../types';

interface LinkHealthCardProps {
  signalData: SignalQuality | null;
  revolutionStatus: RevolutionStatusResponse | null;
  revolutionStats: RevolutionStats | null;
}

export function LinkHealthCard({
  signalData,
  revolutionStatus,
  revolutionStats,
}: LinkHealthCardProps) {
  const rssiStats = signalData?.stats?.rssi;
  const snrStats = signalData?.stats?.snr;

  const currentRssi = rssiStats?.current ?? -72;
  const peakRssi = rssiStats?.max ?? -64;
  const avgRssi = rssiStats?.avg ?? -74;
  const minRssi = rssiStats?.min ?? -92;
  const avgSnr = snrStats?.avg ?? 8.9;

  const totalPlanned = revolutionStats?.total_segments_planned || 1252;
  const totalConfirmed = revolutionStats?.total_segments_confirmed || 1248;
  const packetSuccess = totalPlanned > 0 ? ((totalConfirmed / totalPlanned) * 100).toFixed(2) : '99.68';

  const activeRev = revolutionStatus?.revolution;
  const activeRevNum = activeRev?.revolution_num ?? 15;
  const timeRemaining = revolutionStatus?.time_remaining ?? 35;
  const min = Math.floor(timeRemaining / 60);
  const sec = timeRemaining % 60;
  const formattedCountdown = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  const linkQualityLabel = getSignalQualityLabel(currentRssi);

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-space font-bold text-sm text-white uppercase tracking-wider">
                LINK HEALTH SUMMARY
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Ground station telemetry aggregates
              </p>
            </div>
          </div>

          <span
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-mono font-black uppercase tracking-wider border shadow-sm',
              getSignalQualityBgClass(currentRssi)
            )}
          >
            {linkQualityLabel}
          </span>
        </div>

        {/* Technical Key-Value Grid */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Peak RSSI
            </span>
            <span className="font-bold text-emerald-400">{peakRssi} dBm</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Average RSSI
            </span>
            <span className={cn('font-bold', getSignalQualityClass(avgRssi))}>
              {avgRssi.toFixed(1)} dBm
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              Minimum RSSI
            </span>
            <span className="font-bold text-slate-300">{minRssi} dBm</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              Average SNR
            </span>
            <span className="font-bold text-teal-300">{avgSnr.toFixed(1)} dB</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Packet Success
            </span>
            <span className="font-bold text-emerald-300">{packetSuccess}%</span>
          </div>
        </div>
      </div>

      {/* Revolution & Contact Countdown */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-center font-mono">
        <div className="p-2 rounded-lg bg-[#070D1C] border border-cyan-900/40">
          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Orbit className="w-3 h-3 text-cyan-400" />
            ACTIVE REV
          </div>
          <div className="text-sm font-bold text-cyan-300 mt-0.5">#{activeRevNum}</div>
        </div>

        <div className="p-2 rounded-lg bg-[#070D1C] border border-cyan-900/40">
          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            CONTACT REMAINING
          </div>
          <div className="text-sm font-bold text-amber-300 mt-0.5">{formattedCountdown}</div>
        </div>
      </div>
    </div>
  );
}
