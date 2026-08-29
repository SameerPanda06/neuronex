import { CheckCircle2, Clock, Orbit, ChevronRight, Layers, ArrowUpRight } from 'lucide-react';
import { ContactWindowBar } from './ContactWindowBar';
import { cn, formatDate } from '../../utils/format';
import type { Revolution } from '../../types';

interface RevolutionCardItemProps {
  revolution: Revolution;
  isSelected: boolean;
  onSelect: (rev: Revolution) => void;
  activeProgressPercent?: number;
}

export function RevolutionCardItem({
  revolution,
  isSelected,
  onSelect,
  activeProgressPercent = 45,
}: RevolutionCardItemProps) {
  const isActive = revolution.status === 'active';
  const isCompleted = revolution.status === 'completed';

  const progress =
    revolution.total_segments_planned > 0
      ? (revolution.total_segments_confirmed / revolution.total_segments_planned) * 100
      : 0;

  const imagesCount = revolution.images_planned?.length ?? 0;

  return (
    <div
      onClick={() => onSelect(revolution)}
      className={cn(
        'bg-[#0B132B]/85 backdrop-blur-md rounded-xl border p-4 space-y-3.5 transition-all duration-200 cursor-pointer shadow-md shadow-black/30 font-mono hover:border-cyan-500/50',
        isSelected && 'border-cyan-400/80 bg-[#0B132B]',
        isActive
          ? 'border-cyan-500/60 ring-1 ring-cyan-500/30'
          : isCompleted
          ? 'border-slate-800/80'
          : 'border-slate-800/50 opacity-80'
      )}
    >
      {/* Top Pass Title and Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-1.5 rounded-lg border',
              isActive
                ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40 animate-pulse'
                : isCompleted
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            )}
          >
            {isActive ? (
              <Orbit className="w-4 h-4 animate-spin-slow" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-space font-bold text-sm text-white flex items-center gap-1.5">
                REVOLUTION #{revolution.revolution_num}
              </h3>
              <span
                className={cn(
                  'px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                    : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                )}
              >
                {revolution.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{revolution.mission_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div className="text-[11px] text-slate-300">
            <span className="text-slate-500">WINDOW:</span> {formatDate(revolution.window_start)}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
        </div>
      </div>

      {/* AOS - TCA - LOS Contact Bar */}
      <ContactWindowBar
        status={revolution.status}
        progressPercent={isActive ? activeProgressPercent : isCompleted ? 100 : 0}
        windowStart={revolution.window_start}
        windowEnd={revolution.window_end}
        durationSec={revolution.window_duration_sec}
      />

      {/* Bottom Summary Strip */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-800/60">
        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
          <span className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            IMAGES
          </span>
          <strong className="text-slate-200">{imagesCount} Downlinked</strong>
        </div>

        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
          <span className="text-[9px] text-slate-500">SEGMENTS CONFIRMED</span>
          <strong className="text-emerald-300">
            {revolution.total_segments_confirmed} / {revolution.total_segments_planned}
          </strong>
        </div>

        <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
          <span className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-teal-400" />
            DELIVERY
          </span>
          <strong className="text-teal-300">
            {isCompleted ? '100%' : isActive ? `${progress.toFixed(0)}%` : 'SCHEDULED'}
          </strong>
        </div>
      </div>
    </div>
  );
}
