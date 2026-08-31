import type { Image } from '../../types';
import { ArrowUpRight, Radio } from 'lucide-react';
import { formatBps } from '../../utils/format';

interface CurrentDownlinkCardProps {
  activeImage: Image | null;
  onNavigate?: () => void;
}

export function CurrentDownlinkCard({
  activeImage,
  onNavigate,
}: CurrentDownlinkCardProps) {
  const isStreaming = activeImage !== null && activeImage.status === 'transmitting';

  // Segment delivery progress calculation
  const totalSegs = activeImage?.total_segments ?? 40;
  const confirmedSegs = activeImage?.segments_confirmed ?? 0;
  const progressPercent = totalSegs > 0 ? Math.round((confirmedSegs / totalSegs) * 100) : 0;

  // Formatting values
  const throughput = activeImage?.throughput_bps ? formatBps(activeImage.throughput_bps) : '—';
  const latency = activeImage?.latency_ms ? `${activeImage.latency_ms} ms` : '—';
  const snr = activeImage?.snr !== null && activeImage?.snr !== undefined ? `${activeImage.snr.toFixed(1)} dB` : '—';
  const rssi = activeImage?.rssi !== null && activeImage?.rssi !== undefined ? `${activeImage.rssi} dBm` : '—';

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#131E35]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Active Downlink Stream
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
                isStreaming
                  ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-400/50'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isStreaming ? 'Transmitting' : 'Idle'}
            </span>

            {onNavigate && (
              <button
                type="button"
                onClick={onNavigate}
                className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
                title="View full Live Downlink"
                aria-label="View full Live Downlink"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {activeImage ? (
          <div className="space-y-3">
            {/* Image Preview & Details Strip */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#050810] p-2.5 rounded border border-[#131E35]">
              {/* Thumbnail Graphic Preview */}
              <div className="relative w-24 h-24 shrink-0 rounded bg-[#080E1E] border border-[#131E35] overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="35" fill="#082f49" opacity="0.8" />
                  <path
                    d="M30,45 Q40,30 60,35 T75,55 T55,75 T35,65 Z"
                    fill="#047857"
                    opacity="0.7"
                  />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
                  <line x1="50" y1="10" x2="50" y2="90" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
                </svg>
                <div className="absolute top-1 left-1 bg-[#050810]/90 px-1 py-0.2 rounded text-[8px] font-mono text-cyan-300">
                  512x512
                </div>
              </div>

              {/* Target Image Details */}
              <div className="flex-1 space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-xs text-white">
                    {activeImage.id}
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-slate-300 bg-[#080E1E] border border-[#131E35] px-1 py-0.2 rounded">
                    Priority P{activeImage.priority}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-[#062D24] text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                    {activeImage.classification || 'CLEAR'}
                  </span>
                  <span className="text-slate-400 font-mono">
                    Quality: Q{activeImage.jpeg_quality ?? 85}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Downlink Progress</span>
                    <span className="font-mono tabular-nums text-cyan-300 font-semibold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#080E1E] rounded-none overflow-hidden border border-[#131E35]">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 4-Cell Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
              <div className="bg-[#050810] p-1.5 rounded border border-[#131E35]">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Carrier RSSI</div>
                <div className="text-xs font-semibold font-mono tabular-nums text-white mt-0.5">{rssi}</div>
              </div>
              <div className="bg-[#050810] p-1.5 rounded border border-[#131E35]">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Carrier SNR</div>
                <div className="text-xs font-semibold font-mono tabular-nums text-emerald-400 mt-0.5">{snr}</div>
              </div>
              <div className="bg-[#050810] p-1.5 rounded border border-[#131E35]">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Rate</div>
                <div className="text-xs font-semibold font-mono tabular-nums text-cyan-300 mt-0.5">{throughput}</div>
              </div>
              <div className="bg-[#050810] p-1.5 rounded border border-[#131E35]">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Inference</div>
                <div className="text-xs font-semibold font-mono tabular-nums text-white mt-0.5">{latency}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">
            <Radio className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">No Active Downlink Stream</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting satellite pass contact window acquisition</p>
          </div>
        )}
      </div>

      {/* Footer link to screen 2 */}
      {onNavigate && (
        <div className="pt-2 mt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Demodulating 40-segment frames</span>
          <button
            type="button"
            onClick={onNavigate}
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium"
          >
            <span>Live Stream Matrix</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
