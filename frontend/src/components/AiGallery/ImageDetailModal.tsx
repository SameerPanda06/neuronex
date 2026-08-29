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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#070D1C] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-950/60 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#070D1C]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold font-space text-white tracking-wide">
              {image.id}
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                isClear
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isCloudy
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {image.classification || 'CLEAR'}
            </span>
            <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              Priority P{image.priority}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6">
          {/* Main Visualizer */}
          <div className="relative rounded-xl border border-cyan-500/30 bg-slate-950 aspect-[16/9] overflow-hidden flex items-center justify-center shadow-inner group">
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            >
              <svg viewBox="0 0 480 270" className="w-full h-full">
                <defs>
                  <radialGradient id={`modal-glow-${image.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={isClear ? '#0284c7' : isCloudy ? '#0369a1' : '#1e293b'} stopOpacity="0.95" />
                    <stop offset="70%" stopColor="#0369a1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#082f49" stopOpacity="0.1" />
                  </radialGradient>
                </defs>
                <circle cx="240" cy="135" r="105" fill={`url(#modal-glow-${image.id})`} />
                {/* Detailed geographic landmasses */}
                <path d="M180,95 Q220,70 260,110 T310,90 T330,150 T280,195 T200,180 Z" fill="#059669" opacity="0.7" />
                <path d="M150,125 Q180,160 210,140 T230,200 T180,215 Z" fill="#10b981" opacity="0.6" />
                {isCloudy && (
                  <path d="M190,115 Q240,100 290,130 T255,160 Z" fill="#ffffff" opacity="0.5" />
                )}
                {/* Crosshairs & telemetry reticles */}
                <line x1="30" y1="135" x2="450" y2="135" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.4" />
                <line x1="240" y1="20" x2="240" y2="250" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.4" />
                <circle cx="240" cy="135" r="60" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3 3" fill="none" opacity="0.3" />
              </svg>
            </div>

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-cyan-300 w-12 text-center font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Mission ID</div>
              <div className="font-bold text-white mt-1">{image.mission_id}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">AI Confidence</div>
              <div className="font-bold text-emerald-400 mt-1">{confidence === null ? '—' : `${confidence}%`}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Edge AI Decision</div>
              <div className="font-bold text-cyan-300 mt-1 uppercase">{image.action || 'KEEP'}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">JPEG Quality</div>
              <div className="font-bold text-white mt-1">{image.jpeg_quality === null ? '—' : `Q${image.jpeg_quality}`}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Total Segments</div>
              <div className="font-bold text-white mt-1">{image.total_segments ?? '—'}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Confirmed</div>
              <div className="font-bold text-cyan-400 mt-1">{image.segments_confirmed} segs</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">ML Latency</div>
              <div className="font-bold text-white mt-1">{image.latency_ms === null ? '—' : `${image.latency_ms} ms`}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Captured Time</div>
              <div className="font-bold text-white mt-1 truncate">{capturedTime}</div>
            </div>
          </div>

          {/* Class Probability Breakdown */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Edge-AI Class Probabilities
            </div>
            <div className="space-y-2">
              {probabilities ? (['CLEAR', 'CLOUDY', 'NOT_VISIBLE'] as const).map((cls) => {
                const prob = probabilities[cls] ?? 0;
                const probPct = (prob * 100).toFixed(1);
                return (
                  <div key={cls} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{cls}</span>
                      <span className="font-bold text-white">{probPct}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
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
              }) : <div className="py-4 text-center text-xs font-mono text-slate-500">PROBABILITIES UNAVAILABLE</div>}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#070D1C]/95 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap">
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Metadata JSON</span>
          </button>

          <div className="flex items-center gap-3">
            {isTransmittingOrQueued && onNavigateToTransmission && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToTransmission();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-md shadow-cyan-950 transition-all"
              >
                <Radio className="w-4 h-4" />
                <span>VIEW LIVE DOWNLINK</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-mono font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
