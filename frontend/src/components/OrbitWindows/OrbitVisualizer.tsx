import { Radio } from 'lucide-react';
import type { RevolutionStatusResponse } from '../../types';

interface OrbitVisualizerProps {
  status: RevolutionStatusResponse | null;
}

export function OrbitVisualizer({ status }: OrbitVisualizerProps) {
  const activeRev = status?.revolution;
  const isActive = status?.active && activeRev !== null;
  const timeRemaining = status?.time_remaining ?? 35;
  const totalWindow = activeRev?.window_duration_sec ?? 60;
  const progress = Math.max(0, Math.min(1, (totalWindow - timeRemaining) / totalWindow));

  // Compute satellite orbital angle along the pass arc
  // When active: traverses from angle ~210 deg (AOS) to ~330 deg (LOS)
  // When inactive: smoothly orbits
  const startAngle = 205 * (Math.PI / 180);
  const endAngle = 335 * (Math.PI / 180);
  const currentAngle = isActive ? startAngle + progress * (endAngle - startAngle) : 270 * (Math.PI / 180);

  // Orbit ellipse geometry in 500x300 canvas
  const cx = 250;
  const cy = 150;
  const rx = 180;
  const ry = 90;

  const satX = cx + rx * Math.cos(currentAngle);
  const satY = cy + ry * Math.sin(currentAngle);

  // Ground station location pin (center top of Earth sphere)
  const gsX = 250;
  const gsY = 125;

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between shadow-xl shadow-black/40 font-mono relative overflow-hidden">
      {/* Visual Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-space font-bold text-sm text-white uppercase tracking-wider">
              ORBITAL GEOMETRY & TRACKING
            </h3>
            <p className="text-[10px] text-slate-400">
              LEO 550km Polar Orbit • Ground Station AOS/LOS Tracking Cone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300">INC: 97.4° SSO</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/70 border border-slate-800 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">ALT: 550 KM</span>
          </div>
        </div>
      </div>

      {/* SVG Orbit Visualizer Canvas */}
      <div className="w-full h-64 sm:h-72 my-1 relative flex items-center justify-center">
        <svg
          viewBox="0 0 500 300"
          className="w-full h-full max-h-[300px] overflow-visible select-none"
        >
          <defs>
            {/* Earth Glow Gradient */}
            <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#082f49" stopOpacity="0.8" />
              <stop offset="90%" stopColor="#0369a1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </radialGradient>

            {/* Atmosphere Gradient */}
            <radialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="95%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
            </radialGradient>

            {/* Contact Cone Beam Gradient */}
            <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3">
            <line x1="50" y1="150" x2="450" y2="150" />
            <line x1="250" y1="30" x2="250" y2="270" />
            <circle cx="250" cy="150" r="130" fill="none" />
          </g>

          {/* Earth Body */}
          <g>
            <circle cx="250" cy="150" r="80" fill="url(#earthGlow)" />
            <circle cx="250" cy="150" r="75" fill="url(#atmosphere)" stroke="#0284c7" strokeWidth="1.5" />

            {/* Stylized Longitude/Latitude lines */}
            <ellipse cx="250" cy="150" rx="75" ry="35" fill="none" stroke="#0ea5e9" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.4" />
            <ellipse cx="250" cy="150" rx="35" ry="75" fill="none" stroke="#0ea5e9" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.4" />
            <line x1="175" y1="150" x2="325" y2="150" stroke="#0ea5e9" strokeWidth="0.75" opacity="0.3" />

            {/* Earth Center Core Label */}
            <text x="250" y="175" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="2">
              TERRA (LEO)
            </text>
          </g>

          {/* Orbital Plane Ellipse */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Contact Pass Arc Highlight (active contact sector) */}
          <path
            d={`M ${cx + rx * Math.cos(startAngle)} ${cy + ry * Math.sin(startAngle)} A ${rx} ${ry} 0 0 1 ${cx + rx * Math.cos(endAngle)} ${cy + ry * Math.sin(endAngle)}`}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
            strokeLinecap="round"
            className="shadow-md"
          />

          {/* Contact Cone Beam (from Satellite to Ground Station) */}
          {isActive && (
            <g>
              <polygon
                points={`${satX},${satY} ${gsX - 25},${gsY + 10} ${gsX + 25},${gsY + 10}`}
                fill="url(#beamGradient)"
              />
              <line
                x1={satX}
                y1={satY}
                x2={gsX}
                y2={gsY}
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Ground Station Terminal Pin */}
          <g transform={`translate(${gsX}, ${gsY})`}>
            <circle cx="0" cy="0" r="4" fill="#10b981" />
            <circle cx="0" cy="0" r="10" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" className="animate-ping" />
            <text x="0" y="-12" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
              GS-PRIMARY (13°N)
            </text>
          </g>

          {/* Satellite Node & Marker */}
          <g transform={`translate(${satX}, ${satY})`}>
            {/* Pulsing Aura */}
            <circle cx="0" cy="0" r="14" fill="#06b6d4" opacity="0.2" className="animate-pulse" />
            <circle cx="0" cy="0" r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />

            {/* Satellite Solar Panels */}
            <rect x="-14" y="-3" width="6" height="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.5" rx="1" />
            <rect x="8" y="-3" width="6" height="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.5" rx="1" />

            {/* Satellite Label */}
            <text x="0" y="-16" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
              NEURONEX-1
            </text>
            <text x="0" y="20" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
              {isActive ? 'IN CONTACT' : 'ORBITING'}
            </text>
          </g>

          {/* AOS / LOS Marker labels on the orbit */}
          <g transform={`translate(${cx + rx * Math.cos(startAngle)}, ${cy + ry * Math.sin(startAngle)})`}>
            <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
            <text x="-10" y="15" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">
              AOS
            </text>
          </g>

          <g transform={`translate(${cx + rx * Math.cos(endAngle)}, ${cy + ry * Math.sin(endAngle)})`}>
            <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
            <text x="10" y="15" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">
              LOS
            </text>
          </g>
        </svg>
      </div>

      {/* Orbit Geometry Telemetry Strip */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs text-slate-300">
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-500 block">ORBIT PERIOD</span>
          <strong className="text-cyan-300 font-bold">95.4 min</strong>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-500 block">DAILY PASSES</span>
          <strong className="text-slate-200 font-bold">3 Windows / Day</strong>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-500 block">VELOCITY</span>
          <strong className="text-teal-300 font-bold">7.61 km/s</strong>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-500 block">PASS DURATION</span>
          <strong className="text-emerald-300 font-bold">60.0 sec</strong>
        </div>
      </div>
    </div>
  );
}
