import { Orbit, Clock, Radio, ArrowRight } from 'lucide-react';
import type { RevolutionStatusResponse } from '../../types';

interface CurrentPassHeroProps {
  status: RevolutionStatusResponse | null;
}

export function CurrentPassHero({ status }: CurrentPassHeroProps) {
  const activeRev = status?.revolution;
  const isActive = status?.active && activeRev !== null;
  const timeRemaining = status?.time_remaining ?? (isActive ? 35 : 0);
  const totalWindow = activeRev?.window_duration_sec ?? 60;
  const progressPercent = Math.max(0, Math.min(100, Math.round(((totalWindow - timeRemaining) / totalWindow) * 100)));

  const mins = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const secs = String(timeRemaining % 60).padStart(2, '0');
  const countdownFormatted = `${mins}:${secs}`;

  // Time formatters
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--:-- UTC';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';
  };

  const aosTime = formatTime(activeRev?.window_start);
  const losTime = formatTime(activeRev?.window_end);

  // Compute TCA as midpoint
  const tcaTime = activeRev?.window_start && activeRev?.window_end
    ? formatTime(new Date(new Date(activeRev.window_start).getTime() + (totalWindow / 2) * 1000).toISOString())
    : '14:36:30 UTC';

  // SVG Circular Gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 shadow-xl shadow-black/40 font-mono relative overflow-hidden">
      {/* Background glowing ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {isActive ? (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Active Revolution & Status */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-cyan-950">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                ACTIVE CONTACT PASS
              </span>
              <span className="text-xs text-slate-400">
                Target: <strong className="text-slate-200">NEURONEX-1 (LEO 550km)</strong>
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-space font-black text-white tracking-wide flex items-baseline gap-2">
                REVOLUTION #{activeRev?.revolution_num ?? 15}
                <span className="text-xs font-mono font-medium text-teal-400">
                  [{totalWindow}s WINDOW]
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Direct line-of-sight RF contact with ground station tracking antenna
              </p>
            </div>

            {/* Orbit Timeline Milestones Strip (AOS -> TCA -> LOS) */}
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#070D1C] p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400" />
                    AOS (ACQUISITION)
                  </div>
                  <div className="font-bold text-cyan-300 mt-0.5">{aosTime}</div>
                  <div className="text-[9px] text-slate-400">Elev: 5° Rise</div>
                </div>

                <div className="bg-[#070D1C] p-2.5 rounded-lg border border-cyan-900/50">
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <Orbit className="w-3 h-3 text-teal-400" />
                    TCA (CULMINATION)
                  </div>
                  <div className="font-bold text-teal-300 mt-0.5">{tcaTime}</div>
                  <div className="text-[9px] text-teal-400">Max Elev: 78° Peak</div>
                </div>

                <div className="bg-[#070D1C] p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    LOS (LOSS OF SIGNAL)
                  </div>
                  <div className="font-bold text-slate-300 mt-0.5">{losTime}</div>
                  <div className="text-[9px] text-slate-400">Elev: 5° Set</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Circular Live Countdown Gauge */}
          <div className="flex flex-col items-center justify-center shrink-0 p-4 bg-[#070D1C]/80 rounded-xl border border-cyan-900/40 min-w-[200px]">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#1e293b"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#06b6d4"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 shadow-sm"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-mono font-black text-white tracking-tight">
                  {countdownFormatted}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                  Remaining
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 text-center">
              Window Progress: <strong className="text-cyan-300">{progressPercent}%</strong>
            </div>
          </div>
        </div>
      ) : (
        /* Inactive: Next Pass Countdown */
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
          <div className="space-y-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider">
              ORBIT CONTACT IDLE
            </span>
            <h2 className="text-2xl font-space font-bold text-white">
              NEXT CONTACT: REVOLUTION #{status?.next_revolution?.revolution_num ?? 16}
            </h2>
            <p className="text-xs text-slate-400">
              Satellite is currently traversing eclipse shadow / non-visible orbital segment.
            </p>
          </div>

          <div className="p-4 bg-[#070D1C] rounded-xl border border-slate-800 text-center min-w-[220px]">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              TIME UNTIL AOS
            </div>
            <div className="text-2xl font-mono font-black text-amber-300 mt-1">
              01:48:32
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1">
              <span>Next Window: 60s</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
