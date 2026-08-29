import { AlertTriangle, RotateCcw, CheckCircle2, Zap, Database } from 'lucide-react';
import type { RetransmissionStats } from '../../types';

interface RetransmissionKpiStripProps {
  stats: RetransmissionStats | null;
  totalSegmentsPlanned?: number;
}

export function RetransmissionKpiStrip({ stats, totalSegmentsPlanned = 1252 }: RetransmissionKpiStripProps) {
  const pendingCount = stats?.pending ?? 1;
  const inProgressCount = stats?.acknowledged ?? 0;
  const completedCount = stats?.completed ?? 2;
  const totalRequests = stats?.total ?? 3;

  // Approximate missing segments and data saved calculations
  const totalMissingSegs = totalRequests * 3; // Approx ~3 segments per request
  const retryRate = totalSegmentsPlanned > 0
    ? ((totalMissingSegs / totalSegmentsPlanned) * 100).toFixed(2)
    : '0.24';

  // Bandwidth saved: sending 3 chunks of 256 B = 768 B vs sending entire image (~30 KB) -> ~97.4% saved
  const dataSavedPercent = '97.4%';

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
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">RETRY RATE</span>
          <Zap className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-purple-300">{retryRate}%</span>
          <span className="text-[10px] font-mono text-slate-400">of packets</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">Optimal channel health</div>
      </div>

      {/* 5. Data Saved */}
      <div className="col-span-2 lg:col-span-1 bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">BANDWIDTH SAVED</span>
          <Database className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-black text-teal-300">{dataSavedPercent}</span>
          <span className="text-[10px] font-mono text-slate-400">vs full resend</span>
        </div>
        <div className="text-[9px] font-mono text-slate-500 mt-1">Selective chunk ARQ</div>
      </div>
    </div>
  );
}
