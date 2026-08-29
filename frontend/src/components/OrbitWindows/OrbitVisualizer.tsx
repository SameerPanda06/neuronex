import { Globe, Radio, Compass } from 'lucide-react';
import type { RevolutionStatusResponse } from '../../types';

interface OrbitVisualizerProps {
  status: RevolutionStatusResponse | null;
}

export function OrbitVisualizer({ status }: OrbitVisualizerProps) {
  const activeRev = status?.revolution;
  const inContact = status?.active && activeRev !== null;
  const timeRemaining = status?.time_remaining ?? 0;
  const totalWindow = activeRev?.window_duration_sec ?? 60;
  const passProgress = totalWindow > 0 ? (totalWindow - timeRemaining) / totalWindow : 0.5;

  // Compute satellite position along orbital path (SVG coordinates)
  // Path starts top-left, curves down to bottom-right across Earth
  const satX = 100 + passProgress * 300;
  const satY = 160 - Math.sin(passProgress * Math.PI) * 90;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#131E35] pb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Orbital Pass Visualizer & Ground Track
          </h3>
        </div>

        {/* Orbit State Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[10px] text-slate-400">Trajectory:</span>
          <span className="px-2 py-0.2 rounded bg-[#0D1830] text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-semibold">
            LEO 550 km Polar (97.4° Inclination)
          </span>
        </div>
      </div>

      {/* SVG Canvas for Orbit Schematic */}
      <div className="relative aspect-[21/9] bg-[#050810] rounded border border-[#131E35] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 500 200" className="w-full h-full">
          <defs>
            <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#0369a1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.0" />
            </radialGradient>
            <linearGradient id="groundCone" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="20" y1="100" x2="480" y2="100" stroke="#131E35" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="250" y1="10" x2="250" y2="190" stroke="#131E35" strokeWidth="1" strokeDasharray="4 4" />

          {/* Earth Body Arc */}
          <circle cx="250" cy="220" r="140" fill="url(#earthGlow)" />
          <circle cx="250" cy="220" r="140" stroke="#1E2E52" strokeWidth="1.5" fill="none" />

          {/* Ground Station Antenna Location */}
          <circle cx="250" cy="80" r="3.5" fill="#10b981" />
          <circle cx="250" cy="80" r="10" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.6" />
          <text x="250" y="70" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            GS (LEO-1)
          </text>

          {/* Ground Station Tracking Cone (when in contact) */}
          {inContact && (
            <polygon
              points={`250,80 ${satX - 25},${satY} ${satX + 25},${satY}`}
              fill="url(#groundCone)"
            />
          )}

          {/* Satellite Orbit Ground Track Path */}
          <path
            d="M 60 180 Q 250 30 440 180"
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray={inContact ? 'none' : '4 4'}
            fill="none"
            opacity="0.8"
          />

          {/* Satellite Icon & Marker */}
          <g transform={`translate(${satX}, ${satY})`}>
            {/* Pulsing ring if in contact */}
            {inContact && (
              <circle cx="0" cy="0" r="12" stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.7">
                <animate attributeName="r" values="6;16" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx="0" cy="0" r="5" fill="#0ea5e9" stroke="#fff" strokeWidth="1.5" />
            <rect x="-8" y="-1.5" width="4" height="3" fill="#38bdf8" />
            <rect x="4" y="-1.5" width="4" height="3" fill="#38bdf8" />

            <text x="0" y="-10" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Cascadia Mono, Consolas, monospace">
              NEURONEX-1
            </text>
          </g>
        </svg>

        {/* Inset Coordinate Readout */}
        <div className="absolute bottom-2 left-2.5 flex items-center gap-2 text-[9px] bg-[#050810]/90 px-2 py-1 rounded border border-[#131E35] font-mono">
          <Compass className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">LAT: <strong className="text-slate-200 tabular-nums">13.08° N</strong></span>
          <span className="text-slate-400">LON: <strong className="text-slate-200 tabular-nums">80.27° E</strong></span>
          <span className="text-slate-400">ALT: <strong className="text-cyan-300 tabular-nums">550.2 km</strong></span>
        </div>

        {/* Live Tracking Status */}
        <div className="absolute top-2 right-2.5 flex items-center gap-1.5 text-[9px] bg-[#050810]/90 px-2 py-1 rounded border border-[#131E35]">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-300 font-semibold uppercase">
            {inContact ? 'Antenna Az/El Locked' : 'Searching Horizon'}
          </span>
        </div>
      </div>
    </div>
  );
}
