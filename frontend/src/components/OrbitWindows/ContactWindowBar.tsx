import { cn } from '../../utils/format';

interface ContactWindowBarProps {
  progressPercent: number;
  totalDurationSec: number;
  timeRemainingSec?: number;
  isActive: boolean;
}

export function ContactWindowBar({
  progressPercent,
  totalDurationSec,
  timeRemainingSec = 0,
  isActive,
}: ContactWindowBarProps) {
  const mins = String(Math.floor(timeRemainingSec / 60)).padStart(2, '0');
  const secs = String(timeRemainingSec % 60).padStart(2, '0');
  const countdownFormatted = `${mins}:${secs}`;

  return (
    <div className="space-y-1">
      {/* Visual Progress Track */}
      <div className="w-full h-2 bg-[#050810] rounded-none overflow-hidden border border-[#131E35] relative">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isActive ? 'bg-cyan-400' : 'bg-slate-700'
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Track Footnote Metrics */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
        <span>AOS (0s)</span>
        {isActive && (
          <span className="text-cyan-300 font-bold tabular-nums">
            {countdownFormatted} REMAINING ({progressPercent}%)
          </span>
        )}
        <span>LOS ({totalDurationSec}s)</span>
      </div>
    </div>
  );
}
