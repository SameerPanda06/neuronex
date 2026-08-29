import { useState, useEffect } from 'react';
import { useConnection } from '../../hooks/useConnection';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { RotateCcw, Clock, Orbit } from 'lucide-react';
import { cn } from '../../utils/format';

export function RetransmissionHeader() {
  const { connected, mode, statusText } = useConnection();
  const { status: revStatus } = useRevolutionStatus();
  const [utcTime, setUtcTime] = useState<string>('');

  const isMock = mode === 'mock';
  const activeRevNum = revStatus?.revolution?.revolution_num ?? null;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800/80">
      {/* Title & Description */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-space tracking-wide text-white uppercase flex items-center gap-2">
              RETRANSMISSION CENTER
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                SELECTIVE ARQ
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Selective recovery of lost downlink segments
            </p>
          </div>
        </div>
      </div>

      {/* Right Badges */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono">
        {/* Active Pass Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B132B] border border-cyan-900/40 text-slate-300 shadow-sm">
          <Orbit className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span className="text-slate-400">PASS:</span>
          <span className="text-cyan-300 font-bold">{activeRevNum === null ? '—' : `REV #${activeRevNum}`}</span>
        </div>

        {/* UTC Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B132B] border border-cyan-900/40 text-slate-300 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-slate-200 font-semibold tracking-wider">{utcTime || '--:--:-- UTC'}</span>
        </div>

        {/* Connection Mode */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold tracking-wider text-[11px] shadow-sm',
            isMock
              ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40'
              : connected
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isMock
                ? 'bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse'
                : connected
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                : 'bg-rose-500'
            )}
          />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
}
