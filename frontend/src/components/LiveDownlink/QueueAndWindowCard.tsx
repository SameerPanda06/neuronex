import type { Image, Revolution } from '../../types';
import { Clock, Database } from 'lucide-react';

interface QueueAndWindowCardProps {
  queue: Image[];
  activeImageId?: string;
  revolution: Revolution | null;
  timeRemaining?: number | null;
}

export function QueueAndWindowCard({
  queue = [],
  activeImageId,
  revolution,
  timeRemaining = null,
}: QueueAndWindowCardProps) {
  // Filter out active transmitting image
  const upcomingQueue = queue
    .filter((img) => img.id !== activeImageId && img.status !== 'complete')
    .slice(0, 3);

  const displayList = upcomingQueue;
  const revNum = revolution?.revolution_num ?? null;
  const mins = String(Math.floor((timeRemaining ?? 0) / 60)).padStart(2, '0');
  const secs = String((timeRemaining ?? 0) % 60).padStart(2, '0');
  const countdown = timeRemaining === null ? '—' : `${mins}:${secs}`;

  const windowStart = revolution?.window_start
    ? new Date(revolution.window_start).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '—';
  const windowEnd = revolution?.window_end
    ? new Date(revolution.window_end).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '—';

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* 1. Upcoming Transmission Queue */}
      <div className="md:col-span-7 bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#131E35]">
          <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Upcoming Queue ({displayList.length})</span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">PRIORITIZED</span>
        </div>

        <div className="space-y-1">
          {displayList.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-slate-500 font-mono">EMPTY QUEUE</div>
          ) : (
            displayList.map((item, index) => {
              const isClear = item.classification === 'CLEAR';
              const isCloudy = item.classification === 'CLOUDY';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1 px-2 rounded bg-[#050810] border border-[#131E35] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px] tabular-nums">{index + 1}</span>
                    <span className="text-slate-200 font-mono font-medium text-xs">{item.id}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                        isClear
                          ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
                          : isCloudy
                          ? 'bg-[#0C2548] text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.classification || 'CLEAR'}
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">
                    P{item.priority}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Orbit Contact Window */}
      <div className="md:col-span-5 bg-[#080E1E] rounded-md border border-[#131E35] p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#131E35]">
          <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{revNum === null ? 'Rev —' : `Rev #${revNum}`}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#062D24] text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
            {revolution ? 'In Contact' : 'Standby'}
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Window</span>
            <span className="text-slate-200 text-[11px] font-mono tabular-nums">{windowStart}–{windowEnd} UTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Remaining</span>
            <span className="text-cyan-300 font-bold font-mono text-[11px] tabular-nums">{countdown}</span>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 mt-1.5 pt-1 border-t border-[#131E35]">
          60-second LEO pass window
        </div>
      </div>
    </div>
  );
}
