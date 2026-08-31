import type { Image } from '../../types';
import { Layers } from 'lucide-react';

interface SegmentMapCardProps {
  activeImage: Image | null;
  missingSegments?: number[];
}

export function SegmentMapCard({ activeImage, missingSegments = [] }: SegmentMapCardProps) {
  const totalSegments = activeImage?.total_segments ?? 40;
  const confirmedSegments = activeImage?.segments_confirmed ?? 0;

  // Generate 40-segment matrix
  const segments = Array.from({ length: totalSegments }, (_, i) => i + 1);

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#131E35]">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Frame Segment Matrix ({totalSegments} Chunks)
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-none bg-emerald-400" />
            <span className="text-slate-300">Received</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-none bg-rose-500" />
            <span className="text-slate-300">NACK Drop</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-none bg-slate-800" />
            <span className="text-slate-500">Pending</span>
          </div>
        </div>
      </div>

      {/* 40-Segment LED Matrix Grid (8 columns x 5 rows) */}
      <div className="grid grid-cols-8 gap-1.5 p-2 rounded bg-[#050810] border border-[#131E35]">
        {segments.map((segNum) => {
          const isReceived = segNum <= confirmedSegments && !missingSegments.includes(segNum);
          const isMissing = missingSegments.includes(segNum);

          return (
            <div
              key={segNum}
              className={`h-7 rounded-none border text-[9px] font-mono font-semibold tabular-nums flex items-center justify-center transition-colors select-none ${
                isMissing
                  ? 'bg-[#2D0A14] text-rose-300 border-rose-500/60'
                  : isReceived
                  ? 'bg-[#062D24] text-emerald-300 border-emerald-500/50'
                  : 'bg-[#080E1E] text-slate-600 border-[#131E35]'
              }`}
              title={`Segment #${segNum}: ${isMissing ? 'CRC Drop' : isReceived ? 'Confirmed' : 'Pending'}`}
            >
              #{segNum}
            </div>
          );
        })}
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
        <div>
          Confirmed: <strong className="text-emerald-400 font-mono tabular-nums">{confirmedSegments}</strong> / {totalSegments} chunks
        </div>
        <div>
          Frame Recovery: <strong className="text-cyan-300 font-mono tabular-nums">
            {totalSegments > 0 ? `${Math.round((confirmedSegments / totalSegments) * 100)}%` : '0%'}
          </strong>
        </div>
      </div>
    </div>
  );
}
