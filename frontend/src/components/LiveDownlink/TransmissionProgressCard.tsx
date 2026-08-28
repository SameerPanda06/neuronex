import type { Image } from '../../types';
import { formatBytes } from '../../utils/format';

interface TransmissionProgressCardProps {
  image: Image | null;
  missingCount?: number;
}

export function TransmissionProgressCard({
  image,
  missingCount = 3,
}: TransmissionProgressCardProps) {
  const progress = image?.progress_percent ?? 73;
  const segmentsConfirmed = image?.segments_confirmed ?? 314;
  const totalSegments = image?.total_segments ?? 430;
  const throughput = image?.throughput_bps ? formatBytes(image.throughput_bps) + '/s' : '4.8 KB/s';
  const latency = image?.latency_ms_tx ?? image?.latency_ms ?? 128;

  // Compute realistic ETA in HH:MM:SS based on remaining segments
  const remainingSegments = Math.max(0, totalSegments - segmentsConfirmed);
  const throughputBps = image?.throughput_bps ?? 4800;
  const avgChunkSizeBytes = image?.chunk_size ?? 128;
  const remainingBytes = remainingSegments * avgChunkSizeBytes;
  const etaSec = throughputBps > 0 ? Math.ceil(remainingBytes / (throughputBps / 8)) : 24;

  const etaHours = String(Math.floor(etaSec / 3600)).padStart(2, '0');
  const etaMins = String(Math.floor((etaSec % 3600) / 60)).padStart(2, '0');
  const etaSecs = String(etaSec % 60).padStart(2, '0');
  const etaFormatted = `${etaHours}:${etaMins}:${etaSecs}`;

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
      {/* Header with Title and Big % */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Transmission Progress
        </div>
        <div className="text-xl font-bold font-mono text-cyan-400">
          {progress}%
        </div>
      </div>

      {/* Progress Bar and Segment Status */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="font-semibold">Segment {segmentsConfirmed} / {totalSegments}</span>
        </div>
        <div className="h-3 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/50 p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500 rounded-full transition-all duration-300 shadow-md shadow-cyan-400/50"
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </div>
      </div>

      {/* Segment Breakdown & RF Link Metric Rows */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
        <div>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Received</div>
          <div className="text-sm font-bold text-white mt-0.5">{segmentsConfirmed}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-400 font-semibold"># Missing</div>
          <div className="text-sm font-bold text-rose-400 mt-0.5 flex items-center gap-1.5">
            <span>{missingCount}</span>
            {missingCount > 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                LOST
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Total</div>
          <div className="text-sm font-bold text-white mt-0.5">{totalSegments}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-800/60 text-xs font-mono">
        <div>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Throughput</div>
          <div className="text-sm font-bold text-slate-200 mt-0.5">{throughput}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Latency</div>
          <div className="text-sm font-bold text-slate-200 mt-0.5">{latency} ms</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-400 font-semibold">ETA</div>
          <div className="text-sm font-bold text-cyan-300 mt-0.5">{etaFormatted}</div>
        </div>
      </div>
    </div>
  );
}
