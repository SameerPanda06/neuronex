import type { Image } from '../../types';
import { Eye, Radio } from 'lucide-react';

interface ActiveImageCardProps {
  activeImage: Image | null;
}

export function ActiveImageCard({ activeImage }: ActiveImageCardProps) {
  const isStreaming = activeImage !== null && activeImage.status === 'transmitting';
  const confidence = activeImage?.confidence ? `${(activeImage.confidence * 100).toFixed(1)}%` : '—';
  const timeString = activeImage?.classified_at
    ? new Date(activeImage.classified_at).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'
    : '—';

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#131E35]">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Current Downlink Frame
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
              isStreaming
                ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-400/50'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isStreaming ? 'Transmitting' : 'Idle'}
          </span>
        </div>
      </div>

      {activeImage ? (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* SVG Frame Inspection Preview (5 cols) */}
          <div className="sm:col-span-5 relative aspect-square bg-[#050810] rounded border border-[#131E35] overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <radialGradient id="liveEarthGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#0369a1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#082f49" stopOpacity="0.1" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="70" fill="url(#liveEarthGlow)" />
              <path
                d="M60,80 Q90,50 130,70 T160,110 T120,150 T70,130 Z"
                fill="#047857"
                opacity="0.7"
              />
              <line x1="20" y1="100" x2="180" y2="100" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
              <line x1="100" y1="20" x2="100" y2="180" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
            </svg>

            {/* Inset Metadata Badges */}
            <div className="absolute top-1.5 left-1.5 bg-[#050810]/90 px-1 py-0.2 rounded text-[9px] font-mono text-cyan-300 border border-[#131E35]">
              512x512
            </div>
            <div className="absolute bottom-1.5 right-1.5 bg-[#050810]/90 px-1 py-0.2 rounded text-[9px] font-mono text-slate-300 border border-[#131E35]">
              Q{activeImage.jpeg_quality ?? 85}
            </div>
          </div>

          {/* Target Metadata Table (7 cols) */}
          <div className="sm:col-span-7 space-y-1.5 flex flex-col justify-between text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-white">
                {activeImage.id}
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#050810] text-slate-300 border border-[#131E35]">
                Priority P{activeImage.priority}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
                <span className="text-slate-400 text-[11px]">Classification</span>
                <span className="px-1.5 py-0.2 rounded bg-[#062D24] text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold uppercase">
                  {activeImage.classification || 'CLEAR'}
                </span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
                <span className="text-slate-400 text-[11px]">AI Confidence</span>
                <span className="font-mono font-semibold text-white text-[11px] tabular-nums">{confidence}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
                <span className="text-slate-400 text-[11px]">Edge Decision</span>
                <span className="text-cyan-300 font-semibold uppercase text-[11px]">{activeImage.action || 'KEEP'}</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
                <span className="text-slate-400 text-[11px]">Inference Latency</span>
                <span className="font-mono text-slate-200 text-[11px] tabular-nums">{activeImage.latency_ms ?? 24} ms</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
                <span className="text-slate-400 text-[11px]">Acquisition UTC</span>
                <span className="font-mono text-slate-300 text-[10px] tabular-nums">{timeString}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-slate-500">
          <Radio className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">No Active Transmission</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Ground station receiver is standing by for next LEO contact pass</p>
        </div>
      )}
    </div>
  );
}
