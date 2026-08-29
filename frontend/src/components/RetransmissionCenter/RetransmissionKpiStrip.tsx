import { AlertTriangle, RotateCcw, CheckCircle2, Zap, Database } from 'lucide-react';
import type { Retransmission } from '../../types';
import { deriveRetransmissionStats } from '../../lib/missionMetrics';

interface RetransmissionKpiStripProps {
  retransmissions: Retransmission[];
}

export function RetransmissionKpiStrip({ retransmissions }: RetransmissionKpiStripProps) {
  const stats = deriveRetransmissionStats(retransmissions);
  const pendingCount = stats.pending;
  const inProgressCount = stats.acknowledged;
  const completedCount = stats.completed;
  const totalRequests = stats.total;

  const totalMissingSegs = retransmissions.reduce((sum, item) => sum + item.missing_segments.length, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
      {/* 1. Pending */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[9px] uppercase tracking-wide font-semibold">Pending ARQ</span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-amber-300 tabular-nums">{pendingCount}</span>
          <span className="text-[10px] text-slate-400 font-mono">requests</span>
        </div>
        <div className="text-[9px] text-slate-500">Awaiting link slot</div>
      </div>

      {/* 2. In Progress */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[9px] uppercase tracking-wide font-semibold">In Flight</span>
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-cyan-300 tabular-nums">{inProgressCount}</span>
          <span className="text-[10px] text-slate-400 font-mono">active</span>
        </div>
        <div className="text-[9px] text-slate-500">Demodulating chunks</div>
      </div>

      {/* 3. Recovered */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[9px] uppercase tracking-wide font-semibold">Recovered</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">{completedCount}</span>
          <span className="text-[10px] text-slate-400 font-mono">completed</span>
        </div>
        <div className="text-[9px] text-slate-500">CRC verified 100%</div>
      </div>

      {/* 4. Retry Rate */}
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[9px] uppercase tracking-wide font-semibold">Dropped Chunks</span>
          <Zap className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-slate-200 tabular-nums">{totalMissingSegs}</span>
          <span className="text-[10px] text-slate-400 font-mono">segments</span>
        </div>
        <div className="text-[9px] text-slate-500">Selective resend</div>
      </div>

      {/* 5. Data Saved */}
      <div className="col-span-2 lg:col-span-1 bg-[#080E1E] rounded-md border border-[#131E35] p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[9px] uppercase tracking-wide font-semibold">Total ARQ Log</span>
          <Database className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-teal-300 tabular-nums">{totalRequests}</span>
          <span className="text-[10px] text-slate-400 font-mono">total</span>
        </div>
        <div className="text-[9px] text-slate-500">97.5% bandwidth saved</div>
      </div>
    </div>
  );
}
