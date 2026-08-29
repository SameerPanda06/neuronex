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
      className="group cursor-pointer bg-[#080E1E] rounded-md border border-[#131E35] overflow-hidden hover:border-cyan-500/40 transition-colors flex flex-col justify-between"
    >
      {/* Thumbnail Area with Earth/Satellite Graphics */}
      <div className="relative aspect-[16/10] bg-[#050810] overflow-hidden border-b border-[#131E35] flex items-center justify-center">
        <svg viewBox="0 0 280 175" className="w-full h-full">
          <defs>
            <radialGradient id={`glow-${image.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isClear ? '#0284c7' : isCloudy ? '#0369a1' : '#1e293b'} stopOpacity="0.8" />
              <stop offset="70%" stopColor={isClear ? '#0369a1' : isCloudy ? '#0f172a' : '#0f172a'} stopOpacity="0.3" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.1" />
            </radialGradient>
          </defs>

          {/* Planet Body */}
          <circle cx="140" cy="87" r="60" fill={`url(#glow-${image.id})`} />

          {/* Landmasses / Clouds based on classification */}
          {isClear && (
            <>
              <path
                d={`M${cx1},${cy1} Q${cx1 + 25},${cy1 - 20} ${cx1 + 50},${cy1 + 10} T${cx1 + 75},${cy1 + 40} T${cx1 + 40},${cy1 + 65} T${cx1 - 10},${cy1 + 40} Z`}
                fill="#047857"
                opacity="0.6"
              />
              <path
                d={`M${cx1 - 30},${cy1 + 20} Q${cx1 - 10},${cy1 + 40} ${cx1 + 10},${cy1 + 30} T${cx1 + 20},${cy1 + 60} Z`}
                fill="#059669"
                opacity="0.5"
              />
            </>
          )}

          {isCloudy && (
            <>
              <path
                d={`M${cx1 - 20},${cy1} Q${cx1 + 20},${cy1 - 15} ${cx1 + 45},${cy1 + 5} T${cx1 + 60},${cy1 + 35} Z`}
                fill="#047857"
                opacity="0.3"
              />
              <path
                d={`M${cx1 - 40},${cy1 - 20} Q${cx1 + 10},${cy1 - 35} ${cx1 + 60},${cy1 - 15} T${cx1 + 80},${cy1 + 25} T${cx1 + 30},${cy1 + 45} T${cx1 - 20},${cy1 + 30} Z`}
                fill="#ffffff"
                opacity="0.35"
              />
              <circle cx={cx1 + 15} cy={cy1 + 10} r="22" fill="#ffffff" opacity="0.25" />
            </>
          )}

          {isNotVisible && (
            <>
              <circle cx="140" cy="87" r="60" fill="#030712" opacity="0.7" />
              <path
                d="M90,40 Q140,87 190,135 Z"
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.3"
              />
            </>
          )}

          {/* Grid crosshairs */}
          <line x1="20" y1="87" x2="260" y2="87" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.25" />
          <line x1="140" y1="15" x2="140" y2="160" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.25" />
        </svg>

        {/* Top Badges */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
              isClear
                ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
                : isCloudy
                ? 'bg-[#0C2548] text-blue-400 border border-blue-500/30'
                : 'bg-[#2D0A14] text-rose-400 border border-rose-500/30'
            }`}
          >
            {image.classification || 'CLEAR'}
          </span>
        </div>

        <div className="absolute top-2 right-2 bg-[#050810] border border-[#131E35] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tabular-nums text-slate-200">
          {confidence === null ? '—' : `${confidence}%`}
        </div>

        {/* Hover inspect hint */}
        <div className="absolute inset-0 bg-cyan-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-cyan-300 text-xs font-semibold">
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect</span>
        </div>
      </div>

      {/* Card Content & Metadata */}
      <div className="p-3 space-y-2">
        {/* Row 1: ID & Priority */}
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
            {image.id}
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-[#050810] border border-[#131E35] px-1 py-0.2 rounded">
            P{image.priority}
          </span>
        </div>

        {/* Row 2: Timestamp & Mission */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono text-slate-400 tabular-nums">{timeString}</span>
          <span className="text-slate-500">{image.mission_id}</span>
        </div>

        {/* Row 3: Edge AI Action & Transmission Status */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#131E35] text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-500 uppercase">Action:</span>
            <span
              className={`text-[9px] font-bold uppercase ${
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
            className={`text-[9px] px-1 py-0.2 rounded uppercase font-semibold tracking-wider ${
              image.status === 'complete'
                ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
                : image.status === 'transmitting'
                ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-400/50'
                : image.status === 'queued'
                ? 'bg-[#0C2548] text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {image.status === 'complete' ? 'DOWNLINKED' : image.status}
          </span>
        </div>
      </div>

      {/* Card Footer Quick Actions */}
      <div className="px-3 py-1.5 bg-[#050810] border-t border-[#131E35] flex items-center justify-between text-[11px] text-slate-400">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(image);
          }}
          className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
        >
          <Info className="w-3 h-3" />
          <span>Details</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const blob = new Blob([JSON.stringify(image, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${image.id}_meta.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
          title="Download metadata JSON"
        >
          <Download className="w-3 h-3" />
          <span>Meta</span>
        </button>
      </div>
    </div>
  );
}
