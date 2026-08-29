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

  // Approximate missing segments and data saved calculations
  const totalMissingSegs = retransmissions.reduce((sum, item) => sum + item.missing_segments.length, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Pending */}
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">PENDING</span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-amber-300">{pendingCount}</span>
          <span className="text-[10px] font-mono text-slate-400">requests</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">Awaiting ARQ resend</div>
      </div>

      {/* 2. In Progress */}
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">IN PROGRESS</span>
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-cyan-300">{inProgressCount}</span>
          <span className="text-[10px] font-mono text-slate-400">active</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">Recovering downlink</div>
      </div>

      {/* 3. Recovered */}
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">RECOVERED</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-emerald-300">{completedCount}</span>
          <span className="text-[10px] font-mono text-slate-400">completed</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">100% frame reconstructed</div>
      </div>

      {/* 4. Retry Rate */}
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">CHUNKS REQUESTED</span>
          <Zap className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-purple-300">{totalMissingSegs}</span>
          <span className="text-[10px] font-mono text-slate-400">segments</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">Explicit NACK segment IDs</div>
      </div>

      {/* 5. Data Saved */}
      <div className="col-span-2 lg:col-span-1 bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">ARQ REQUESTS</span>
          <Database className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-teal-300">{totalRequests}</span>
          <span className="text-[10px] font-mono text-slate-400">total</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">Selective chunk ARQ</div>
      </div>
    </div>
  );
}
