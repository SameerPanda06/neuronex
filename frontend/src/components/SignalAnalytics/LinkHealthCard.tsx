import { ShieldCheck, Radio, Orbit, Clock, Activity, Zap } from 'lucide-react';
import {
  getSignalQualityClass,
  getSignalQualityLabel,
  getSignalQualityBgClass,
} from '../../hooks/useTelemetry';
import { cn } from '../../utils/format';
import type { SignalQuality, RevolutionStatusResponse } from '../../types';
import type { DeliveryMetric } from '../../lib/missionMetrics';

interface LinkHealthCardProps {
  signalData: SignalQuality | null;
  revolutionStatus: RevolutionStatusResponse | null;
  deliveryMetric: DeliveryMetric;
}

export function LinkHealthCard({
  signalData,
  revolutionStatus,
  deliveryMetric,
}: LinkHealthCardProps) {
  const rssiStats = signalData?.stats?.rssi;
  const snrStats = signalData?.stats?.snr;

  const currentRssi = rssiStats?.current ?? null;
  const peakRssi = rssiStats?.max ?? null;
  const avgRssi = rssiStats?.avg ?? null;
  const minRssi = rssiStats?.min ?? null;
  const avgSnr = snrStats?.avg ?? null;

  const activeRev = revolutionStatus?.revolution;
  const activeRevNum = activeRev?.revolution_num ?? null;
  const timeRemaining = revolutionStatus?.time_remaining ?? null;
  const min = timeRemaining === null ? 0 : Math.floor(timeRemaining / 60);
  const sec = timeRemaining === null ? 0 : timeRemaining % 60;
  const formattedCountdown = timeRemaining === null ? '—' : `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  const linkQualityLabel = getSignalQualityLabel(currentRssi);

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#131E35]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              RF Link Health
            </h3>
          </div>

          <span
            className={cn(
              'px-2 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider border',
              getSignalQualityBgClass(currentRssi)
            )}
          >
            {linkQualityLabel}
          </span>
        </div>

        {/* Technical Key-Value Grid */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              Peak RSSI
            </span>
            <span className="font-semibold font-mono text-emerald-400 tabular-nums text-[11px]">{peakRssi === null ? '—' : `${peakRssi} dBm`}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              Average RSSI
            </span>
            <span className={cn('font-semibold font-mono tabular-nums text-[11px]', getSignalQualityClass(avgRssi))}>
              {avgRssi === null ? '—' : `${avgRssi.toFixed(1)} dBm`}
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-slate-500" />
              Minimum RSSI
            </span>
            <span className="font-semibold font-mono text-slate-300 tabular-nums text-[11px]">{minRssi === null ? '—' : `${minRssi} dBm`}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-teal-400" />
              Average SNR
            </span>
            <span className="font-semibold font-mono text-teal-300 tabular-nums text-[11px]">{avgSnr === null ? '—' : `${avgSnr.toFixed(1)} dB`}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              Segment Delivery
            </span>
            <span className="font-semibold font-mono text-emerald-300 tabular-nums text-[11px]">
              {deliveryMetric.percentage === null ? 'No Data' : `${deliveryMetric.percentage.toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Revolution & Contact Countdown */}
      <div className="mt-3 pt-2.5 border-t border-[#131E35] grid grid-cols-2 gap-2 text-center">
        <div className="p-1.5 rounded bg-[#050810] border border-[#131E35]">
          <div className="text-[9px] uppercase tracking-wide text-slate-500 flex items-center justify-center gap-1">
            <Orbit className="w-3 h-3 text-cyan-400" />
            Pass
          </div>
          <div className="text-xs font-bold font-mono text-cyan-300 mt-0.5">{activeRevNum === null ? '—' : `#${activeRevNum}`}</div>
        </div>

        <div className="p-1.5 rounded bg-[#050810] border border-[#131E35]">
          <div className="text-[9px] uppercase tracking-wide text-slate-500 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Remaining
          </div>
          <div className="text-xs font-bold font-mono text-slate-200 mt-0.5 tabular-nums">{formattedCountdown}</div>
        </div>
      </div>
    </div>
  );
}
