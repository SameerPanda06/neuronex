import { Orbit, Clock, ChevronRight } from 'lucide-react';
import { ContactWindowBar } from './ContactWindowBar';
import { cn } from '../../utils/format';
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
  activeProgressPercent = 0,
}: RevolutionCardItemProps) {
  const isActive = revolution.status === 'active';
  const isCompleted = revolution.status === 'completed';

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--:-- UTC';
    return new Date(isoString).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';
  };

  const windowStart = formatTime(revolution.window_start);
  const windowEnd = formatTime(revolution.window_end);

  const duration = revolution.window_duration_sec;
  const progress = isActive ? activeProgressPercent : isCompleted ? 100 : 0;

  return (
    <div
      onClick={() => onSelect(revolution)}
      className={cn(
        'p-3.5 rounded-md border transition-colors cursor-pointer group bg-[#080E1E]',
        isSelected
          ? 'border-cyan-500/50 bg-[#0E1B38]/60'
          : 'border-[#131E35] hover:border-[#1E2E52]'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#131E35]">
        {/* Pass ID & Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded border',
              isActive
                ? 'bg-[#0D1830] text-cyan-400 border-cyan-500/40'
                : isCompleted
                ? 'bg-[#062D24] text-emerald-400 border-emerald-500/40'
                : 'bg-[#050810] text-slate-400 border-[#131E35]'
            )}
          >
            <Orbit className="w-3.5 h-3.5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                Revolution #{revolution.revolution_num}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border',
                  isActive
                    ? 'bg-[#0D1830] text-cyan-300 border-cyan-500/40'
                    : isCompleted
                    ? 'bg-[#062D24] text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                )}
              >
                {isActive ? 'In Contact' : isCompleted ? 'Completed' : 'Scheduled'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Mission: {revolution.mission_id}</span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tabular-nums">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{windowStart}</span>
              <span className="text-slate-600">→</span>
              <span>{windowEnd}</span>
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
              Duration: {duration}s
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-2.5">
        <ContactWindowBar
          progressPercent={progress}
          totalDurationSec={duration}
          timeRemainingSec={isActive ? Math.round((1 - activeProgressPercent / 100) * duration) : 0}
          isActive={isActive}
        />
      </div>
    </div>
  );
}
