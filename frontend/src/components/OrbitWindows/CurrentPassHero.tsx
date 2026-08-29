import { Orbit, Clock, Radio, ArrowRight } from 'lucide-react';
import type { RevolutionStatusResponse } from '../../types';

interface CurrentPassHeroProps {
  status: RevolutionStatusResponse | null;
}

export function CurrentPassHero({ status }: CurrentPassHeroProps) {
  const activeRev = status?.revolution;
  const isActive = status?.active && activeRev !== null;
  const timeRemaining = status?.time_remaining ?? 0;
  const totalWindow = activeRev?.window_duration_sec ?? 0;
  const progressPercent = totalWindow > 0
    ? Math.max(0, Math.min(100, Math.round(((totalWindow - timeRemaining) / totalWindow) * 100)))
    : 0;

  const mins = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const secs = String(timeRemaining % 60).padStart(2, '0');
  const countdownFormatted = `${mins}:${secs}`;

  // Time formatters
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--:-- UTC';
    return new Date(isoString).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';
  };

  const aosTime = formatTime(activeRev?.window_start);
  const losTime = formatTime(activeRev?.window_end);

  const tcaTime = activeRev?.window_start && activeRev?.window_end
    ? formatTime(new Date(new Date(activeRev.window_start).getTime() + (totalWindow / 2) * 1000).toISOString())
    : '--:--:-- UTC';

  // SVG Circular Gauge calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 relative overflow-hidden">
      {isActive ? (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Left: Active Revolution & Status */}
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#0D1830] text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Active Contact Pass
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Mission: <strong className="text-slate-200">{activeRev?.mission_id}</strong>
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-2">
                Revolution #{activeRev?.revolution_num}
                <span className="text-xs font-mono font-medium text-cyan-400">
                  [{totalWindow}s Window]
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Direct line-of-sight RF contact with ground station tracking antenna
              </p>
            </div>

            {/* Orbit Timeline Milestones Strip (AOS -> TCA -> LOS) */}
            <div className="pt-1">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400" />
                    AOS (Rise)
                  </div>
                  <div className="font-bold font-mono text-cyan-300 mt-0.5 text-[11px] tabular-nums">{aosTime}</div>
                  <div className="text-[8px] text-slate-500 font-mono">Elev: 5° Rise</div>
                </div>

                <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-center gap-1">
                    <Orbit className="w-3 h-3 text-teal-400" />
                    TCA (Culmination)
                  </div>
                  <div className="font-bold font-mono text-teal-300 mt-0.5 text-[11px] tabular-nums">{tcaTime}</div>
                  <div className="text-[8px] text-teal-400 font-mono">Max: 78° Peak</div>
                </div>

                <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    LOS (Set)
                  </div>
                  <div className="font-bold font-mono text-slate-300 mt-0.5 text-[11px] tabular-nums">{losTime}</div>
                  <div className="text-[8px] text-slate-500 font-mono">Elev: 5° Set</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Circular Live Countdown Gauge */}
          <div className="flex flex-col items-center justify-center shrink-0 p-3 bg-[#050810] rounded border border-[#131E35] min-w-[180px]">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#131E35"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="#0ea5e9"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold font-mono text-white tracking-tight tabular-nums">
                  {countdownFormatted}
                </span>
                <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-wider">
                  Remaining
                </span>
              </div>
            </div>
            <div className="text-[9px] text-slate-400 mt-1.5 text-center">
              Window Progress: <strong className="text-cyan-300 font-mono tabular-nums">{progressPercent}%</strong>
            </div>
          </div>
        </div>
      ) : (
        /* Inactive: Next Pass Countdown */
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-1">
          <div className="space-y-1.5">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
              Orbit Contact Idle
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {status?.next_revolution ? `Next Contact: Revolution #${status.next_revolution.revolution_num}` : 'Next Contact Unavailable'}
            </h2>
            <p className="text-[11px] text-slate-400">
              Satellite is currently traversing eclipse shadow / non-visible orbital segment.
            </p>
          </div>

          <div className="p-3 bg-[#050810] rounded border border-[#131E35] text-center min-w-[200px]">
            <div className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Time Until AOS
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5 tabular-nums">
              {status?.time_until_next === null || status?.time_until_next === undefined ? '—' : `${String(Math.floor(status.time_until_next / 3600)).padStart(2, '0')}:${String(Math.floor((status.time_until_next % 3600) / 60)).padStart(2, '0')}:${String(status.time_until_next % 60).padStart(2, '0')}`}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5 flex items-center justify-center gap-1">
              <span>{status?.next_revolution ? `Next Window: ${status.next_revolution.window_duration_sec}s` : 'No scheduled window data'}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
