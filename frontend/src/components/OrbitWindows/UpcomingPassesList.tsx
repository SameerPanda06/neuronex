import { Orbit, Calendar, ArrowRight } from 'lucide-react';
import { formatDate } from '../../utils/format';
import type { Revolution } from '../../types';

interface UpcomingPassesListProps {
  revolutions: Revolution[];
  onSelect: (rev: Revolution) => void;
}

export function UpcomingPassesList({
  revolutions,
  onSelect,
}: UpcomingPassesListProps) {
  const scheduled = revolutions.filter((r) => r.status === 'scheduled');

  if (scheduled.length === 0) return null;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#131E35] pb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Upcoming Passes ({scheduled.length})
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">NEXT 24 HOURS</span>
      </div>

      <div className="space-y-1">
        {scheduled.slice(0, 3).map((rev) => (
          <div
            key={rev.id}
            onClick={() => onSelect(rev)}
            className="flex items-center justify-between p-2 rounded bg-[#050810] border border-[#131E35] hover:border-cyan-500/40 transition-colors cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              <Orbit className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-white text-xs">Rev #{rev.revolution_num}</span>
              <span className="text-slate-400 text-[10px] font-mono tabular-nums">{formatDate(rev.window_start)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-mono text-[10px] tabular-nums">{rev.window_duration_sec}s contact</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
