import type { Revolution } from '../../types';
import { ArrowUpRight, Clock } from 'lucide-react';

interface RevolutionCardProps {
  revolution: Revolution | null;
  inContact: boolean;
  timeRemaining?: number | null;
  onNavigate?: () => void;
}

export function RevolutionCard({
  revolution,
  inContact,
  timeRemaining = null,
  onNavigate,
}: RevolutionCardProps) {
  const revNum = revolution?.revolution_num ?? null;
  const mins = String(Math.floor((timeRemaining ?? 0) / 60)).padStart(2, '0');
  const secs = String((timeRemaining ?? 0) % 60).padStart(2, '0');
  const countdown = timeRemaining === null ? '—' : `${mins}:${secs}`;

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#131E35]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Orbital Contact Window
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
                inContact
                  ? 'bg-[#062D24] text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {inContact ? 'In Contact' : 'Standby'}
            </span>

            {onNavigate && (
              <button
                type="button"
                onClick={onNavigate}
                className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
                title="View full Orbit Windows"
                aria-label="View full Orbit Windows"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Active Pass</div>
            <div className="text-xl font-bold font-mono text-white">
              {revNum === null ? 'Rev —' : `Rev #${revNum}`}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              LEO 550 km Polar Orbit
            </div>
          </div>

          {/* Circular Countdown Tracker */}
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Remaining</div>
            <div className="text-xl font-bold font-mono tabular-nums text-cyan-300">
              {inContact ? countdown : 'Standby'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              60-second window
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 mt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Ground Station Tracking</span>
        <span className="text-cyan-300 font-mono">13.08°N AOS</span>
      </div>
    </div>
  );
}
