import { Orbit, Clock, Calendar } from 'lucide-react';
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
  const days = [
    { name: 'Monday', date: 'Oct 24', count: 4 },
    { name: 'Tuesday', date: 'Oct 25', count: 3 },
    { name: 'Wednesday (Today)', date: 'Oct 26', count: 4, isToday: true },
    { name: 'Thursday', date: 'Oct 27', count: 3 },
  ];

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-[#131E35] pb-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Orbital Contact Calendar (4-Day Schedule)
          </h3>
        </div>
        <div className="text-[10px] text-slate-400">
          Tracking Station: <strong className="text-cyan-300">LEO-1 Ground Node</strong>
        </div>
      </div>

      {/* Calendar Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {days.map((day, idx) => {
          // Slice revolutions for demo
          const dayRevs = revolutions.slice(idx * 2, idx * 2 + 3);

          return (
            <div
              key={day.name}
              className={cn(
                'rounded border p-3 flex flex-col justify-between space-y-2.5',
                day.isToday
                  ? 'bg-[#0E1B38]/50 border-cyan-500/40'
                  : 'bg-[#050810] border-[#131E35]'
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-[#131E35] pb-1.5">
                <div>
                  <div className={cn('text-xs font-bold', day.isToday ? 'text-cyan-300' : 'text-white')}>
                    {day.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{day.date}</div>
                </div>
                <span className="px-1.5 py-0.2 rounded bg-[#080E1E] text-slate-300 border border-[#131E35] text-[9px] font-mono tabular-nums">
                  {day.count} passes
                </span>
              </div>

              {/* Passes for this day */}
              <div className="space-y-1.5">
                {dayRevs.map((rev) => {
                  const isSelected = selectedId === rev.id;
                  const isActive = rev.status === 'active';

                  return (
                    <div
                      key={rev.id}
                      onClick={() => onSelect(rev)}
                      className={cn(
                        'p-2 rounded border text-xs cursor-pointer transition-colors space-y-1',
                        isSelected
                          ? 'bg-[#0E1B38] border-cyan-400 text-white'
                          : 'bg-[#080E1E] border-[#131E35] hover:border-[#1E2E52] text-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 font-bold font-mono text-[11px]">
                          <Orbit className="w-3 h-3 text-cyan-400" />
                          <span>Rev #{rev.revolution_num}</span>
                        </div>
                        <span
                          className={cn(
                            'text-[8px] font-semibold px-1 py-0.2 rounded uppercase',
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400'
                          )}
                        >
                          {rev.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>14:30–14:31</span>
                        </div>
                        <span>{rev.window_duration_sec}s</span>
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
