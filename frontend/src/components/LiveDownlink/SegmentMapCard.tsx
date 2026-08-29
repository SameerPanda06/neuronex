import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SegmentMapCardProps {
  currentSegment: number;
  totalSegments: number;
  missingSegments: number[];
}

export function SegmentMapCard({
  currentSegment = 314,
  totalSegments = 430,
  missingSegments = [],
}: SegmentMapCardProps) {
  const pageSize = 40; // 4 rows of 10 columns

  // Calculate default start page window centered around current segment
  const initialWindowStart = Math.max(
    1,
    Math.min(
      Math.floor((currentSegment - 1) / pageSize) * pageSize + 1,
      Math.max(1, totalSegments - pageSize + 1)
    )
  );

  const [windowStart, setWindowStart] = useState<number>(initialWindowStart);

  const windowEnd = Math.min(totalSegments, windowStart + pageSize - 1);
  const segmentsInView = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i
  );

  const handlePrev = () => setWindowStart((prev) => Math.max(1, prev - pageSize));
  const handleNext = () =>
    setWindowStart((prev) =>
      Math.min(Math.max(1, totalSegments - pageSize + 1), prev + pageSize)
    );
  const handleJumpToCurrent = () => {
    const target = Math.max(1, Math.floor((currentSegment - 1) / pageSize) * pageSize + 1);
    setWindowStart(target);
  };

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
      {/* Header & Status Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Segment Map
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
            Window {windowStart} – {windowEnd} of {totalSegments}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400" />
            <span className="text-slate-300">Received</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
            <span className="text-slate-300">Transmitting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/50 border border-rose-400" />
            <span className="text-slate-300">Missing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700" />
            <span className="text-slate-400">Queued</span>
          </div>
        </div>
      </div>

      {/* Grid of Segment Blocks (10 columns) */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 my-2">
        {segmentsInView.map((segNum) => {
          const isMissing = missingSegments.includes(segNum);
          const isCurrent = segNum === currentSegment;
          const isReceived = segNum < currentSegment && !isMissing;
          const isQueued = segNum > currentSegment && !isMissing;

          let stateClass = 'bg-slate-800/40 text-slate-500 border-slate-700/40';
          if (isCurrent) {
            stateClass =
              'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-sm shadow-cyan-400/60 font-bold scale-[1.03] z-10';
          } else if (isMissing) {
            stateClass =
              'bg-rose-500/25 text-rose-300 border-rose-500/80 font-bold shadow-sm shadow-rose-950';
          } else if (isReceived) {
            stateClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-medium';
          } else if (isQueued) {
            stateClass = 'bg-slate-900/50 text-slate-500 border-slate-800/60';
          }

          return (
            <div
              key={segNum}
              className={`h-9 flex items-center justify-center rounded border text-xs font-mono transition-all duration-150 select-none ${stateClass}`}
              title={`Segment #${segNum} — ${
                isCurrent
                  ? 'Transmitting (Current)'
                  : isMissing
                  ? 'Missing (Packet Loss)'
                  : isReceived
                  ? 'Received & Confirmed'
                  : 'Queued'
              }`}
            >
              {segNum}
            </div>
          );
        })}
      </div>

      {/* Window Controls */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-800/60 text-xs font-mono">
        <button
          type="button"
          onClick={handlePrev}
          disabled={windowStart <= 1}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev {pageSize}</span>
        </button>

        <button
          type="button"
          onClick={handleJumpToCurrent}
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 text-[11px] transition-colors"
        >
          Jump to Active (#{currentSegment})
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={windowEnd >= totalSegments}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        >
          <span>Next {pageSize}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
