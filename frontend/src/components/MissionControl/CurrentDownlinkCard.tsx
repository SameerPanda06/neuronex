import { useImages } from '../../hooks/useImages';
import { formatBytes } from '../../utils/format';
import { Satellite } from 'lucide-react';

export function CurrentDownlinkCard() {
  const { images } = useImages({ status: 'transmitting', limit: 1 });
  const activeImage = images.find((img) => img.status === 'transmitting');

  if (!activeImage) {
    return (
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between shadow-lg shadow-black/40 h-full min-h-[220px]">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Current Downlink
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
          <Satellite className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
          <p className="text-sm font-medium text-slate-300">No Active Downlink Transmission</p>
          <p className="text-xs text-slate-500 mt-0.5">Awaiting next pass / revolution window</p>
        </div>
      </div>
    );
  }

  const progress = activeImage.progress_percent || 0;
  const segmentsConfirmed = activeImage.segments_confirmed || 0;
  const totalSegments = activeImage.total_segments || 100;
  const rssi = activeImage.rssi ?? -67;
  const snr = activeImage.snr ?? 11.2;
  const throughput = activeImage.throughput_bps ? formatBytes(activeImage.throughput_bps) + '/s' : '4.8 KB/s';
  const latency = activeImage.latency_ms_tx ?? activeImage.latency_ms ?? 128;

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3">
        Current Downlink
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Thumbnail Preview */}
        <div className="md:col-span-4 relative rounded-lg overflow-hidden border border-cyan-500/20 bg-slate-950 aspect-[4/3] flex items-center justify-center group shadow-inner">
          {/* Earth/Satellite visual simulation */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 flex items-center justify-center">
            <svg viewBox="0 0 200 150" className="w-full h-full opacity-60">
              <defs>
                <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#0369a1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#082f49" stopOpacity="0.1" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="75" r="55" fill="url(#earthGlow)" />
              {/* Landmass silhouettes */}
              <path d="M70,55 Q85,45 105,60 T130,50 T140,80 T115,100 T80,95 Z" fill="#059669" opacity="0.5" />
              <path d="M60,70 Q75,85 85,75 T95,110 T70,115 Z" fill="#10b981" opacity="0.4" />
              {/* Scanline grid overlay */}
              <line x1="10" y1="75" x2="190" y2="75" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
              <line x1="100" y1="10" x2="100" y2="140" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
            </svg>
          </div>

          {/* Corner target reticles */}
          <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-400/80" />
          <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-400/80" />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-400/80" />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-400/80" />

          <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-cyan-300 bg-black/60 px-1 rounded backdrop-blur-sm">
            AI CLASSIFIED
          </div>
        </div>

        {/* Transmission Details */}
        <div className="md:col-span-8 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold font-space text-white tracking-wide">
                {activeImage.id}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {activeImage.classification || 'CLEAR'}
              </span>
            </div>
            <span className="text-xs font-semibold font-mono text-amber-400">
              Priority P{activeImage.priority}
            </span>
          </div>

          {/* Progress Bar & Label */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono text-slate-300 font-semibold">
                Segment {segmentsConfirmed} / {totalSegments}
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {progress}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
          </div>

          {/* Metrics 4-Col Grid */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">RSSI</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{rssi} dBm</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">SNR</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{snr} dB</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Throughput</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{throughput}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Latency</div>
              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{latency} ms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
