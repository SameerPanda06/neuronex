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
  timeRemaining = 41,
}: QueueAndWindowCardProps) {
  // Filter out the currently transmitting active image from upcoming list
  const upcomingQueue = queue
    .filter((img) => img.id !== activeImageId && img.status !== 'complete')
    .slice(0, 3);

  const fallbackQueue = [
    { id: 'IMG-000088', classification: 'CLEAR', priority: 1 },
    { id: 'IMG-000101', classification: 'CLOUDY', priority: 2 },
    { id: 'IMG-000106', classification: 'CLEAR', priority: 1 },
  ];

  const displayList = upcomingQueue.length > 0 ? upcomingQueue : fallbackQueue;

  const revNum = revolution?.revolution_num ?? 128;
  const mins = String(Math.floor((timeRemaining || 0) / 60)).padStart(2, '0');
  const secs = String((timeRemaining || 0) % 60).padStart(2, '0');
  const countdown = `${mins}:${secs}`;

  const windowStart = revolution?.window_start
    ? new Date(revolution.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '14:36:00';
  const windowEnd = revolution?.window_end
    ? new Date(revolution.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '14:37:00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* 1. Upcoming Transmission Queue */}
      <div className="md:col-span-7 bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upcoming Queue ({displayList.length})</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">PRIORITIZED</span>
        </div>

        <div className="space-y-1.5">
          {displayList.map((item, index) => {
            const isClear = item.classification === 'CLEAR';
            const isCloudy = item.classification === 'CLOUDY';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/50 border border-slate-800/50 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[11px] font-bold">{index + 1}</span>
                  <span className="text-white font-medium">{item.id}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isClear
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isCloudy
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {item.classification || 'CLEAR'}
                  </span>
                </div>
                <span className="text-amber-400 font-bold text-[11px]">
                  P{item.priority}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Orbit Contact Window */}
      <div className="md:col-span-5 bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Revolution #{revNum}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ACTIVE WINDOW
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Contact Window</span>
            <span className="text-slate-200">{windowStart} – {windowEnd} UTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Time Remaining</span>
            <span className="text-emerald-400 font-bold">{countdown} remaining</span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-slate-800/60">
          Downlink window constrained to 60s contact pass
        </div>
      </div>
    </div>
  );
}
