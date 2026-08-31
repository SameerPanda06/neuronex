import type { Image } from '../../types';
import { Zap, Clock, HardDrive } from 'lucide-react';
import { formatBps } from '../../utils/format';

interface TransmissionProgressCardProps {
  activeImage: Image | null;
}

export function TransmissionProgressCard({ activeImage }: TransmissionProgressCardProps) {
  const totalSegs = activeImage?.total_segments ?? 40;
  const confirmedSegs = activeImage?.segments_confirmed ?? 0;
  const progressPercent = totalSegs > 0 ? Math.round((confirmedSegs / totalSegs) * 100) : 0;

  // Rate & elapsed
  const throughput = activeImage?.throughput_bps ? formatBps(activeImage.throughput_bps) : '—';
  const remainingSegs = Math.max(0, totalSegs - confirmedSegs);
  const estSecondsRemaining = remainingSegs * 1.5;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#131E35]">
        <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Frame Ingest Progress</span>
        </div>
        <span className="text-xs font-bold font-mono tabular-nums text-cyan-300">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-[#050810] rounded-none overflow-hidden border border-[#131E35]">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{confirmedSegs} of {totalSegs} chunks received</span>
          <span className="font-mono text-slate-300 tabular-nums">{remainingSegs} remaining</span>
        </div>
      </div>

      {/* 2-Column Telemetry Sub-stats */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#131E35] text-xs">
        <div className="flex items-center gap-2 p-1.5 rounded bg-[#050810] border border-[#131E35]">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Throughput</div>
            <div className="font-mono font-bold text-white text-[11px] tabular-nums">{throughput}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded bg-[#050810] border border-[#131E35]">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Est. Completion</div>
            <div className="font-mono font-bold text-amber-300 text-[11px] tabular-nums">
              {confirmedSegs === totalSegs ? 'Complete' : `${estSecondsRemaining.toFixed(0)}s`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
