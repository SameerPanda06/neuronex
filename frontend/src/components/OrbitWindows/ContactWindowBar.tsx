import { Radio, Orbit, Clock } from 'lucide-react';
import { cn } from '../../utils/format';

interface ContactWindowBarProps {
  status: 'active' | 'completed' | 'scheduled' | string;
  progressPercent?: number;
  windowStart?: string | null;
  windowEnd?: string | null;
  durationSec?: number;
}

export function ContactWindowBar({
  status,
  progressPercent = 0,
  windowStart,
  windowEnd,
  durationSec = 60,
}: ContactWindowBarProps) {
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  const formatTime = (iso?: string | null) => {
    if (!iso) return '--:--:--';
    return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const aos = formatTime(windowStart);
  const los = formatTime(windowEnd);

  return (
    <div className="space-y-1.5 font-mono text-xs">
      {/* Visual Track Bar */}
      <div className="relative w-full h-3.5 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden flex items-center">
        {/* Progress Fill */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isActive
              ? 'bg-gradient-to-r from-cyan-600 via-cyan-400 to-teal-400 animate-pulse'
              : isCompleted
              ? 'bg-emerald-500/80 w-full'
              : 'bg-transparent w-0'
          )}
          style={isActive ? { width: `${progressPercent}%` } : undefined}
        />

        {/* TCA Marker tick (center) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-700 -translate-x-1/2" />

        {/* Active Satellite Position Indicator pin */}
        {isActive && (
          <div
            className="absolute top-0 bottom-0 w-3 h-3 bg-white rounded-full -translate-x-1/2 border-2 border-cyan-400 shadow-md shadow-cyan-400 flex items-center justify-center transition-all"
            style={{ left: `${Math.max(4, Math.min(96, progressPercent))}%` }}
          >
            <span className="w-1 h-1 bg-cyan-950 rounded-full" />
          </div>
        )}
      </div>

      {/* Axis Labels: AOS -> TCA -> LOS */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span>AOS: <strong className="text-slate-200">{aos}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-teal-400 font-semibold">
          <Orbit className="w-3 h-3" />
          <span>TCA PEAK</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>LOS: <strong className="text-slate-200">{los}</strong> ({durationSec}s)</span>
        </div>
      </div>
    </div>
  );
}
