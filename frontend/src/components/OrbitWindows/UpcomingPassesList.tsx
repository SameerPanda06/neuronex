import { Calendar, Clock, Orbit } from 'lucide-react';
import { formatDate } from '../../utils/format';
import type { Revolution } from '../../types';

interface UpcomingPassesListProps {
  revolutions: Revolution[];
  onSelect: (rev: Revolution) => void;
}

export function UpcomingPassesList({ revolutions, onSelect }: UpcomingPassesListProps) {
  const upcoming = revolutions.filter((r) => r.status === 'scheduled');

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 space-y-4 shadow-xl shadow-black/40 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-space font-bold text-sm text-white uppercase tracking-wider">
              UPCOMING PASSES
            </h3>
            <p className="text-[10px] text-slate-400">Scheduled 60-second contact windows</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-teal-300 border border-teal-900/40 font-bold">
          {upcoming.length} SCHEDULED
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs">
          <Orbit className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p>No further revolutions scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((rev) => (
            <div
              key={rev.id}
              onClick={() => onSelect(rev)}
              className="p-3 rounded-lg bg-[#070D1C] border border-slate-800/80 hover:border-cyan-500/40 transition-colors cursor-pointer group flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    REV #{rev.revolution_num}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-bold">
                    PLANNED
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{formatDate(rev.window_start)}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-cyan-400 font-bold">{rev.window_duration_sec}s</div>
                <div className="text-[9px] text-slate-500">Duration</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
