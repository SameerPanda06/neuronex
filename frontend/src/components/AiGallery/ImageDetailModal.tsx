import { useEffect, useState } from 'react';
import type { Image } from '../../types';
import { X, Download, Radio, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageDetailModalProps {
  image: Image | null;
  onClose: () => void;
  onNavigateToTransmission?: () => void;
}

export function ImageDetailModal({
  image,
  onClose,
  onNavigateToTransmission,
}: ImageDetailModalProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  const isClear = image.classification === 'CLEAR';
  const isCloudy = image.classification === 'CLOUDY';

  const confidence = image.confidence === null ? null : (image.confidence * 100).toFixed(1);
  const capturedTime = image.classified_at
    ? new Date(image.classified_at).toLocaleString()
    : '—';

  const probabilities = image.all_probabilities;

  const isTransmittingOrQueued =
    image.status === 'transmitting' || image.status === 'queued';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="image-detail-title" className="bg-[#070D1A] border border-[#1E2E52] rounded-md w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#131E35] flex items-center justify-between sticky top-0 bg-[#070D1A]/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div id="image-detail-title" className="font-mono text-base font-bold text-white tracking-wide">
              {image.id}
            </div>
            <span
              className={`px-2 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                isClear
                  ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
                  : isCloudy
                  ? 'bg-[#0C2548] text-blue-400 border border-blue-500/30'
                  : 'bg-[#2D0A14] text-rose-400 border border-rose-500/30'
              }`}
            >
              {image.classification || 'CLEAR'}
            </span>
            <span className="text-[10px] font-mono text-slate-300 bg-[#050810] px-1.5 py-0.2 rounded border border-[#131E35]">
              Priority P{image.priority}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded bg-[#050810] hover:bg-[#0E1B38] text-slate-400 hover:text-white border border-[#131E35] transition-colors"
            aria-label="Close image details"
            title="Close image details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          {/* Main Visualizer */}
          <div className="relative rounded bg-[#050810] border border-[#131E35] aspect-[16/9] overflow-hidden flex items-center justify-center">
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            >
              <svg viewBox="0 0 480 270" className="w-full h-full">
                <defs>
                  <radialGradient id={`modal-glow-${image.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={isClear ? '#0284c7' : isCloudy ? '#0369a1' : '#1e293b'} stopOpacity="0.8" />
                    <stop offset="70%" stopColor="#0369a1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#082f49" stopOpacity="0.05" />
                  </radialGradient>
                </defs>
                <circle cx="240" cy="135" r="95" fill={`url(#modal-glow-${image.id})`} />
                <path d="M180,95 Q220,70 260,110 T310,90 T330,150 T280,195 T200,180 Z" fill="#047857" opacity="0.6" />
                <path d="M150,125 Q180,160 210,140 T230,200 T180,215 Z" fill="#059669" opacity="0.5" />
                {isCloudy && (
                  <path d="M190,115 Q240,100 290,130 T255,160 Z" fill="#ffffff" opacity="0.4" />
                )}
                <line x1="30" y1="135" x2="450" y2="135" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                <line x1="240" y1="20" x2="240" y2="250" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                <circle cx="240" cy="135" r="55" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" fill="none" opacity="0.2" />
              </svg>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-[#050810]/90 p-1 rounded border border-[#131E35]">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="p-1 rounded hover:bg-[#0E1B38] text-slate-300 hover:text-white"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-cyan-300 w-10 text-center font-bold tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1 rounded hover:bg-[#0E1B38] text-slate-300 hover:text-white"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1 rounded hover:bg-[#0E1B38] text-slate-300 hover:text-white"
                title="Reset Zoom"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">Mission ID</div>
              <div className="font-semibold text-white mt-0.5">{image.mission_id}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">AI Confidence</div>
              <div className="font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">{confidence === null ? '—' : `${confidence}%`}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">Edge Decision</div>
              <div className="font-semibold text-cyan-300 mt-0.5 uppercase">{image.action || 'KEEP'}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">JPEG Quality</div>
              <div className="font-mono font-semibold text-white mt-0.5 tabular-nums">{image.jpeg_quality === null ? '—' : `Q${image.jpeg_quality}`}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">Total Segments</div>
              <div className="font-mono font-semibold text-white mt-0.5 tabular-nums">{image.total_segments ?? '—'}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">Confirmed</div>
              <div className="font-mono font-semibold text-cyan-400 mt-0.5 tabular-nums">{image.segments_confirmed} segs</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">ML Latency</div>
              <div className="font-mono font-semibold text-white mt-0.5 tabular-nums">{image.latency_ms === null ? '—' : `${image.latency_ms} ms`}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">Captured Time</div>
              <div className="font-mono text-slate-300 mt-0.5 truncate text-[11px] tabular-nums">{capturedTime}</div>
            </div>
          </div>

          {/* Class Probability Breakdown */}
          <div className="p-3 rounded bg-[#080E1E] border border-[#131E35] space-y-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Edge-AI Inference Probabilities
            </div>
            <div className="space-y-1.5">
              {probabilities ? (['CLEAR', 'CLOUDY', 'NOT_VISIBLE'] as const).map((cls) => {
                const prob = probabilities[cls] ?? 0;
                const probPct = (prob * 100).toFixed(1);
                return (
                  <div key={cls} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 text-[11px]">{cls}</span>
                      <span className="font-mono font-semibold text-white text-[11px] tabular-nums">{probPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#050810] border border-[#131E35] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          cls === 'CLEAR'
                            ? 'bg-emerald-400'
                            : cls === 'CLOUDY'
                            ? 'bg-blue-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.max(2, parseFloat(probPct))}%` }}
                      />
                    </div>
                  </div>
                );
              }) : <div className="py-2 text-center text-xs text-slate-500 font-mono">PROBABILITIES UNAVAILABLE</div>}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-3.5 border-t border-[#131E35] bg-[#070D1A]/95 flex items-center justify-between gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(image, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${image.id}_meta.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#050810] hover:bg-[#0E1B38] text-slate-300 text-xs border border-[#131E35] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <div className="flex items-center gap-2">
            {isTransmittingOrQueued && onNavigateToTransmission && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToTransmission();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0E1B38] text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>View Live Stream</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#050810] hover:bg-[#0E1B38] text-white text-xs border border-[#131E35] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
