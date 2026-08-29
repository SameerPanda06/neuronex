import { Orbit, Clock, Radio, Database, X } from 'lucide-react';
import { cn, formatDate } from '../../utils/format';
import type { Revolution } from '../../types';

interface RevolutionDetailDrawerProps {
  revolution: Revolution | null;
  onClose?: () => void;
}

export function RevolutionDetailDrawer({
  revolution,
  onClose,
}: RevolutionDetailDrawerProps) {
  if (!revolution) {
    return (
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-8 text-center flex flex-col items-center justify-center min-h-[300px] text-slate-500">
        <Orbit className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Select an Orbital Revolution</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          Click any pass card to inspect line-of-sight acquisition milestones, downlink queue allocations, and telemetry history.
        </p>
      </div>
    );
  }

  const isActive = revolution.status === 'active';
  const isCompleted = revolution.status === 'completed';

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--:-- UTC';
    return new Date(isoString).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC';
  };

  const aosTime = formatTime(revolution.window_start);
  const losTime = formatTime(revolution.window_end);

  const duration = revolution.window_duration_sec;
  const tcaTime = revolution.window_start && revolution.window_end
    ? formatTime(new Date(new Date(revolution.window_start).getTime() + (duration / 2) * 1000).toISOString())
    : '--:--:-- UTC';

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-4">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-[#131E35] pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded border',
              isActive
                ? 'bg-[#0D1830] text-cyan-400 border-cyan-500/40'
                : isCompleted
                ? 'bg-[#062D24] text-emerald-400 border-emerald-500/40'
                : 'bg-[#050810] text-slate-400 border-[#131E35]'
            )}
          >
            <Orbit className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>Revolution #{revolution.revolution_num}</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                [{duration}s Window]
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Mission: {revolution.mission_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border',
              isActive
                ? 'bg-[#0D1830] text-cyan-300 border-cyan-500/40'
                : isCompleted
                ? 'bg-[#062D24] text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            )}
          >
            {isActive ? 'In Contact' : isCompleted ? 'Completed' : 'Scheduled'}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#050810] transition-colors"
              aria-label="Close pass details"
              title="Close pass details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orbit Contact Milestones */}
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            AOS (Rise)
          </div>
          <div className="font-mono font-bold text-cyan-300 mt-0.5 text-[11px] tabular-nums">{aosTime}</div>
          <div className="text-[8px] text-slate-500 font-mono">Az 182° / El 5°</div>
        </div>

        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-center gap-1">
            <Orbit className="w-3 h-3 text-teal-400" />
            TCA (Peak)
          </div>
          <div className="font-mono font-bold text-teal-300 mt-0.5 text-[11px] tabular-nums">{tcaTime}</div>
          <div className="text-[8px] text-teal-400 font-mono">Az 094° / El 78°</div>
        </div>

        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            LOS (Set)
          </div>
          <div className="font-mono font-bold text-slate-300 mt-0.5 text-[11px] tabular-nums">{losTime}</div>
          <div className="text-[8px] text-slate-500 font-mono">Az 008° / El 5°</div>
        </div>
      </div>

      {/* Technical Specs List */}
      <div className="bg-[#050810] rounded p-2.5 border border-[#131E35] space-y-1.5 text-xs">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-[#131E35]">
          Orbital Flight Mechanics
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Pass Window Duration</span>
          <span className="font-mono text-slate-200 tabular-nums">{duration} seconds</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Orbital Altitude</span>
          <span className="font-mono text-slate-200 tabular-nums">550.2 km LEO</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Ground Track Inclination</span>
          <span className="font-mono text-slate-200 tabular-nums">97.4° Sun-Sync</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Slant Range at TCA</span>
          <span className="font-mono text-slate-200 tabular-nums">562.4 km</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Planned Date</span>
          <span className="font-mono text-slate-200 tabular-nums">{formatDate(revolution.created_at)}</span>
        </div>
      </div>

      {/* Planned Downlink Allocations */}
      <div className="bg-[#050810] rounded p-2.5 border border-[#131E35] space-y-1.5 text-xs">
        <div className="flex items-center justify-between pb-1 border-b border-[#131E35]">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Downlink Allocation</span>
          </div>
          <span className="text-[10px] text-cyan-300 font-mono">3 FRAMES ALLOCATED</span>
        </div>

        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-300">IMG-000101 (P1 Clear)</span>
            <span className="px-1.5 py-0.2 rounded bg-[#062D24] text-emerald-400 text-[9px] font-semibold uppercase">Nominal</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-300">IMG-000102 (P2 Cloudy)</span>
            <span className="px-1.5 py-0.2 rounded bg-[#0C2548] text-blue-400 text-[9px] font-semibold uppercase">Queued</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-300">IMG-000103 (ARQ Recovery)</span>
            <span className="px-1.5 py-0.2 rounded bg-[#2B1B0A] text-amber-300 text-[9px] font-semibold uppercase">ARQ Slot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
