import { useState, useEffect } from 'react';
import { useConnection } from '../../hooks/useConnection';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { Radio, Clock, Orbit } from 'lucide-react';
import { cn } from '../../utils/format';

export function SignalAnalyticsHeader() {
  const { connected, mode, statusText } = useConnection();
  const { status: revStatus } = useRevolutionStatus();
  const [utcTime, setUtcTime] = useState<string>('');

  const isMock = mode === 'mock';
  const isReplay = mode === 'replay';
  const activeRevNum = revStatus?.revolution?.revolution_num ?? null;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().substring(11, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-[#131E35]">
      {/* Title & Description */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#0D1830] border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Signal Analytics
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0D1830] text-cyan-400 border border-cyan-500/30">
              RF Telemetry
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 font-normal mt-0.5">
          Real-time RF link performance, carrier modulation, and SNR telemetry
        </p>
      </div>

      {/* Right Telemetry Status Badges */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        {/* Active Revolution Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070D1A] border border-[#131E35] text-slate-300">
          <Orbit className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[11px]">Pass:</span>
          <span className="text-cyan-300 font-bold font-mono text-[11px] tabular-nums">{activeRevNum === null ? '—' : `Rev #${activeRevNum}`}</span>
        </div>

        {/* UTC Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070D1A] border border-[#131E35] text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-200 font-semibold font-mono tracking-wider text-[11px] tabular-nums">{utcTime || '--:--:-- UTC'}</span>
        </div>

        {/* Connection Mode Indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold tracking-wider text-[11px]',
            isMock
              ? 'bg-[#070D1A] text-cyan-300 border-cyan-500/30'
              : isReplay
              ? 'bg-[#070D1A] text-amber-300 border-amber-500/30'
              : connected
              ? 'bg-[#070D1A] text-emerald-300 border-emerald-500/30'
              : 'bg-[#070D1A] text-rose-300 border-rose-500/30'
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isMock
                ? 'bg-cyan-400'
                : isReplay
                ? 'bg-amber-400'
                : connected
                ? 'bg-emerald-400'
                : 'bg-rose-500'
            )}
          />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
}
