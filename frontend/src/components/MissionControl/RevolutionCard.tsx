import { useRevolutionStatus } from '../../hooks/useRevolutions';

export function RevolutionCard() {
  const { status: revStatus } = useRevolutionStatus();

  const revNum = revStatus?.revolution?.revolution_num ?? null;
  const timeRemaining = revStatus?.time_remaining ?? null;
  const totalWindow = revStatus?.revolution?.window_duration_sec ?? null;
  const pct = totalWindow !== null && totalWindow > 0 && timeRemaining !== null ? Math.max(0, Math.min(100, ((totalWindow - timeRemaining) / totalWindow) * 100)) : 0;

  const timeFormatted = timeRemaining === null ? '—' : `${String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:${String(timeRemaining % 60).padStart(2, '0')}`;

  const windowStart = revStatus?.revolution?.window_start
    ? new Date(revStatus.revolution.window_start).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '—';
  const windowEnd = revStatus?.revolution?.window_end
    ? new Date(revStatus.revolution.window_end).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '—';

  // SVG Circular Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full min-h-[220px]">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
        {revNum === null ? 'Revolution —' : `Revolution #${revNum}`}
      </div>

      <div className="flex flex-col items-center justify-center my-auto py-1">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#1e293b"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#22c55e"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500"
            />
          </svg>
          {/* Inner text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {timeFormatted}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              Remaining
            </span>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] font-mono text-slate-400 border-t border-slate-800/60 pt-2">
        Window: {windowStart} - {windowEnd} UTC
      </div>
    </div>
  );
}
