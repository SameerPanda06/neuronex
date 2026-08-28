import type { Image } from '../../types';
import { Satellite } from 'lucide-react';

interface ActiveImageCardProps {
  image: Image | null;
}

export function ActiveImageCard({ image }: ActiveImageCardProps) {
  if (!image) {
    return (
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between shadow-lg shadow-black/40 h-full min-h-[300px]">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Active Image
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
          <Satellite className="w-12 h-12 mb-3 opacity-30 text-cyan-400" />
          <p className="text-sm font-medium text-slate-300">Waiting For Next Downlink</p>
          <p className="text-xs text-slate-500 mt-1">Satellite payload will start at next pass window</p>
        </div>
      </div>
    );
  }

  const confidence = image.confidence ? (image.confidence * 100).toFixed(1) : '96.4';
  const capturedTime = image.classified_at
    ? new Date(image.classified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'
    : '14:34:55 UTC';
  const resolution = '1024 × 1024';
  const jpegQuality = image.jpeg_quality ?? 82;

  const isClear = image.classification === 'CLEAR';
  const isCloudy = image.classification === 'CLOUDY';

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3">
        Active Image
      </div>

      {/* Satellite Earth Image Preview */}
      <div className="relative rounded-lg overflow-hidden border border-cyan-500/30 bg-slate-950 aspect-[16/10] flex items-center justify-center shadow-inner group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 flex items-center justify-center">
          <svg viewBox="0 0 320 200" className="w-full h-full opacity-70">
            <defs>
              <radialGradient id="earthGlow2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                <stop offset="65%" stopColor="#0369a1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#082f49" stopOpacity="0.1" />
              </radialGradient>
            </defs>
            <circle cx="160" cy="100" r="75" fill="url(#earthGlow2)" />
            {/* Coastal geography contours */}
            <path d="M120,70 Q145,55 170,80 T200,65 T215,105 T180,135 T135,125 Z" fill="#059669" opacity="0.6" />
            <path d="M105,90 Q125,115 140,100 T155,145 T120,155 Z" fill="#10b981" opacity="0.5" />
            {/* Cloud coverage wisps */}
            <path d="M130,85 Q160,75 190,95 T170,115 Z" fill="#ffffff" opacity="0.25" />
            {/* Orbital telemetry grid */}
            <line x1="20" y1="100" x2="300" y2="100" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.5" />
            <line x1="160" y1="20" x2="160" y2="180" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.5" />
            <circle cx="160" cy="100" r="45" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 2" fill="none" opacity="0.3" />
          </svg>
        </div>

        {/* Reticle brackets */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

        <div className="absolute bottom-2 left-2.5 text-[10px] font-mono font-semibold text-cyan-300 bg-black/70 px-1.5 py-0.5 rounded border border-cyan-500/30 backdrop-blur-sm">
          EARTH OBSERVATION PAYLOAD
        </div>
      </div>

      {/* Image ID and Badges */}
      <div className="flex items-center justify-between mt-4 pb-3 border-b border-slate-800/80 flex-wrap gap-2">
        <div>
          <span className="text-lg font-bold font-space text-white tracking-wide">
            {image.id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
              isClear
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : isCloudy
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {image.classification || 'CLEAR'}
          </span>
          <span className="text-xs font-mono font-bold text-amber-400">
            Priority P{image.priority}
          </span>
        </div>
      </div>

      {/* Metadata Attributes */}
      <div className="space-y-2 text-xs font-mono pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Mission</span>
          <span className="text-slate-200 font-semibold">{image.mission_id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Captured</span>
          <span className="text-slate-200 font-semibold">{capturedTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">AI Confidence</span>
          <span className="text-emerald-400 font-semibold">{confidence}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Resolution</span>
          <span className="text-slate-200 font-semibold">{resolution}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">JPEG Quality</span>
          <span className="text-slate-200 font-semibold">{jpegQuality}%</span>
        </div>
      </div>
    </div>
  );
}
