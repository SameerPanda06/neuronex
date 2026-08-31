import type { Image } from '../../types';
import { ArrowUpRight, Database } from 'lucide-react';

interface QueueCardProps {
  queuedImages: Image[];
  queueCount: number;
  activeImageId?: string;
  onNavigate?: () => void;
}

export function QueueCard({
  queuedImages,
  queueCount,
  activeImageId,
  onNavigate,
}: QueueCardProps) {
  // Filter out active transmitting image
  const displayQueue = queuedImages
    .filter((img) => img.id !== activeImageId && img.status !== 'complete')
    .slice(0, 3);

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#131E35]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Transmission Queue
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#050810] text-cyan-300 border border-[#131E35] tabular-nums">
              {queueCount} Queued
            </span>

            {onNavigate && (
              <button
                type="button"
                onClick={onNavigate}
                className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
                title="View full Downlink Queue"
                aria-label="View full Downlink Queue"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Queue Items List */}
        <div className="space-y-1.5 mt-2">
          {displayQueue.length === 0 ? (
            <div className="py-7 text-center text-[10px] text-slate-500 font-mono">
              Queue empty (all frames downlinked)
            </div>
          ) : (
            displayQueue.map((item, index) => {
              const isP1 = item.priority === 1;
              const isClear = item.classification === 'CLEAR';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded bg-[#050810] border border-[#131E35] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px] tabular-nums">
                      {index + 1}
                    </span>
                    <span className="font-mono font-medium text-xs text-white">
                      {item.id}
                    </span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                        isClear
                          ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#0C2548] text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {item.classification || 'CLEAR'}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                      isP1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    P{item.priority}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 mt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Scheduling Policy</span>
        <span className="text-cyan-300 font-mono">Priority First</span>
      </div>
    </div>
  );
}
