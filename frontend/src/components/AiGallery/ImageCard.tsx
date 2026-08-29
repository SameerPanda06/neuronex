import type { Image } from '../../types';
import { Eye, Download, Info } from 'lucide-react';

interface ImageCardProps {
  image: Image;
  onSelect: (image: Image) => void;
}

export function ImageCard({ image, onSelect }: ImageCardProps) {
  const confidence = image.confidence === null ? null : (image.confidence * 100).toFixed(1);
  const isClear = image.classification === 'CLEAR';
  const isCloudy = image.classification === 'CLOUDY';
  const isNotVisible = image.classification === 'NOT_VISIBLE';

  const timeString = image.classified_at
    ? new Date(image.classified_at).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'
    : '—';

  // Seed variations based on Image ID char codes
  const seed = image.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cx1 = 120 + (seed % 40);
  const cy1 = 70 + ((seed * 3) % 40);

  return (
    <div
      onClick={() => onSelect(image)}
      className="group cursor-pointer bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 overflow-hidden hover:border-cyan-400/60 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-950/40 flex flex-col justify-between"
    >
      {/* Thumbnail Area with Earth/Satellite Graphics */}
      <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden border-b border-slate-800/80 flex items-center justify-center">
        <svg viewBox="0 0 280 175" className="w-full h-full">
          <defs>
            <radialGradient id={`glow-${image.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isClear ? '#0284c7' : isCloudy ? '#0369a1' : '#1e293b'} stopOpacity="0.9" />
              <stop offset="70%" stopColor={isClear ? '#0369a1' : isCloudy ? '#0f172a' : '#0f172a'} stopOpacity="0.4" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.1" />
            </radialGradient>
          </defs>

          {/* Planet Body */}
          <circle cx="140" cy="87" r="65" fill={`url(#glow-${image.id})`} />

          {/* Landmasses / Clouds based on classification */}
          {isClear && (
            <>
              <path
                d={`M${cx1},${cy1} Q${cx1 + 25},${cy1 - 20} ${cx1 + 50},${cy1 + 10} T${cx1 + 75},${cy1 + 40} T${cx1 + 40},${cy1 + 65} T${cx1 - 10},${cy1 + 40} Z`}
                fill="#059669"
                opacity="0.65"
              />
              <path
                d={`M${cx1 - 30},${cy1 + 20} Q${cx1 - 10},${cy1 + 40} ${cx1 + 10},${cy1 + 30} T${cx1 + 20},${cy1 + 60} Z`}
                fill="#10b981"
                opacity="0.55"
              />
            </>
          )}

          {isCloudy && (
            <>
              <path
                d={`M${cx1 - 20},${cy1} Q${cx1 + 20},${cy1 - 15} ${cx1 + 45},${cy1 + 5} T${cx1 + 60},${cy1 + 35} Z`}
                fill="#059669"
                opacity="0.3"
              />
              {/* Dense swirling white cloud cover */}
              <path
                d={`M${cx1 - 40},${cy1 - 20} Q${cx1 + 10},${cy1 - 35} ${cx1 + 60},${cy1 - 15} T${cx1 + 80},${cy1 + 25} T${cx1 + 30},${cy1 + 45} T${cx1 - 20},${cy1 + 30} Z`}
                fill="#ffffff"
                opacity="0.45"
              />
              <circle cx={cx1 + 15} cy={cy1 + 10} r="25" fill="#ffffff" opacity="0.35" />
            </>
          )}

          {isNotVisible && (
            <>
              {/* Dark occlusion / nightside shadow */}
              <circle cx="140" cy="87" r="65" fill="#030712" opacity="0.7" />
              <path
                d="M90,40 Q140,87 190,135 Z"
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.4"
              />
            </>
          )}

          {/* Grid crosshairs */}
          <line x1="20" y1="87" x2="260" y2="87" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <line x1="140" y1="15" x2="140" y2="160" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
        </svg>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm ${
              isClear
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md'
                : isCloudy
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 backdrop-blur-md'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isClear ? 'bg-emerald-400' : isCloudy ? 'bg-blue-400' : 'bg-rose-400'
              }`}
            />
            {image.classification || 'CLEAR'}
          </span>
        </div>

        <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm border border-slate-700/60 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white">
          {confidence === null ? '—' : `${confidence}%`}
        </div>

        {/* Hover inspect hint */}
        <div className="absolute inset-0 bg-cyan-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-cyan-300 text-xs font-mono font-semibold backdrop-blur-[1px]">
          <Eye className="w-4 h-4" />
          <span>INSPECT</span>
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-3.5 space-y-2.5">
        {/* Row 1: ID & Priority */}
        <div className="flex items-center justify-between">
          <span className="font-space font-bold text-sm text-white tracking-wide group-hover:text-cyan-300 transition-colors">
            {image.id}
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded">
            P{image.priority}
          </span>
        </div>

        {/* Row 2: Timestamp & Mission */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{timeString}</span>
          <span className="text-slate-500">{image.mission_id}</span>
        </div>

        {/* Row 3: Edge AI Action & Transmission Status */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Decision:</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                image.action === 'keep'
                  ? 'text-emerald-400'
                  : image.action === 'defer'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {image.action || (isNotVisible ? 'DISCARD' : 'KEEP')}
            </span>
          </div>

          <span
            className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
              image.status === 'complete'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : image.status === 'transmitting'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 animate-pulse'
                : image.status === 'queued'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {image.status === 'complete' ? 'DOWNLINKED' : image.status}
          </span>
        </div>
      </div>

      {/* Card Footer Quick Actions */}
      <div className="px-3.5 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(image);
          }}
          className="flex items-center gap-1 hover:text-cyan-300 transition-colors text-[11px]"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // Deterministic JSON download of image metadata
            const blob = new Blob([JSON.stringify(image, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${image.id}_meta.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1 hover:text-cyan-300 transition-colors text-[11px]"
          title="Download metadata JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Meta</span>
        </button>
      </div>
    </div>
  );
}
