import { useQueue } from '../../hooks/useQueue';

interface QueueCardProps {
  onViewAll?: () => void;
}

export function QueueCard({ onViewAll }: QueueCardProps) {
  const { queue } = useQueue();

  const displayQueue = (queue && queue.length > 0) ? queue.slice(0, 4) : [
    { id: 'IMG-000094', classification: 'CLEAR', priority: 1, progress_percent: 73 },
    { id: 'IMG-000088', classification: 'CLEAR', priority: 1, progress_percent: 20 },
    { id: 'IMG-000101', classification: 'CLOUDY', priority: 2, progress_percent: 0 },
    { id: 'IMG-000085', classification: 'CLEAR', priority: 1, progress_percent: 0 },
  ];

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full min-h-[220px]">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
        Transmission Queue
      </div>

      <div className="space-y-1.5 flex-1">
        {displayQueue.map((item, idx) => {
          const isClear = item.classification === 'CLEAR';
          const isCloudy = item.classification === 'CLOUDY';
          return (
            <div
              key={item.id || idx}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-xs font-mono"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500 text-[11px] w-3">{idx + 1}</span>
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

              <div className="flex items-center gap-3">
                <span className="text-amber-400/90 text-[11px]">
                  P{item.priority ?? 1}
                </span>
                <span className="text-slate-300 font-semibold text-[11px] w-8 text-right">
                  {item.progress_percent ?? 0}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2 mt-1 border-t border-slate-800/60">
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View All
        </button>
      </div>
    </div>
  );
}
