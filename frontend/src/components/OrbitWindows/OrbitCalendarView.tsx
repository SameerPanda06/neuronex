import { Orbit } from 'lucide-react';
import { cn } from '../../utils/format';
import type { Revolution } from '../../types';

interface OrbitCalendarViewProps {
  revolutions: Revolution[];
  selectedId: number | null;
  onSelect: (rev: Revolution) => void;
}

export function OrbitCalendarView({
  revolutions,
  selectedId,
  onSelect,
}: OrbitCalendarViewProps) {
  // Group revolutions by Date
  const revolutionsByDate = revolutions.reduce((acc, rev) => {
    const date = new Date(rev.window_start).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(rev);
    return acc;
  }, {} as Record<string, Revolution[]>);

  const dates = Object.keys(revolutionsByDate);
  const today = new Date().toDateString();

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div>
          <h3 className="font-space font-bold text-sm text-white uppercase tracking-wider">
            ORBIT CALENDAR (3 PASSES / DAY)
          </h3>
          <p className="text-[10px] text-slate-400">Daily ground station culmination windows</p>
        </div>
        <span className="text-[10px] text-cyan-300 font-bold">
          LEO REPEAT CYCLE: 24H
        </span>
      </div>

      <div className="space-y-4">
        {dates.map((dateStr) => {
          const revs = revolutionsByDate[dateStr];
          const isToday = dateStr === today;

          return (
            <div key={dateStr} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', isToday ? 'bg-cyan-400' : 'bg-slate-600')} />
                  <span>{dateStr}</span>
                  {isToday && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      TODAY
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{revs.length} Windows</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {revs.map((rev) => {
                  const isSelected = selectedId === rev.id;
                  const isActive = rev.status === 'active';
                  const isCompleted = rev.status === 'completed';

                  const timeStr = new Date(rev.window_start).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  });

                  return (
                    <div
                      key={rev.id}
                      onClick={() => onSelect(rev)}
                      className={cn(
                        'p-3 rounded-lg border transition-all cursor-pointer font-mono text-xs flex flex-col justify-between space-y-2',
                        isSelected
                          ? 'bg-[#070D1C] border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/40',
                        isActive && 'ring-1 ring-cyan-500/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {isActive && <Orbit className="w-3 h-3 text-cyan-400 animate-spin-slow" />}
                          REV #{rev.revolution_num}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase px-1.5 py-0.2 rounded',
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          )}
                        >
                          {rev.status}
                        </span>
                      </div>

                      <div className="text-slate-300 text-[11px]">
                        AOS: <strong className="text-cyan-300">{timeStr} UTC</strong>
                      </div>

                      <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                        <span>Duration: {rev.window_duration_sec}s</span>
                        <span>{rev.total_segments_confirmed} segs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
