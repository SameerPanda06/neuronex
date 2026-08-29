import { AlertTriangle, CheckCircle2, RotateCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/format';

interface SegmentRecoveryVisualizerProps {
  missingSegments: number[];
  status: 'pending' | 'acknowledged' | 'completed' | string;
  totalSegments?: number;
  imageId?: string;
}

export function SegmentRecoveryVisualizer({
  missingSegments,
  status,
  totalSegments = 120,
  imageId = 'IMG-000101',
}: SegmentRecoveryVisualizerProps) {
  const isRecovering = status === 'acknowledged';
  const isCompleted = status === 'completed';

  const steps = [
    {
      id: 'detected',
      label: '1. LOSS DETECTED',
      active: true,
      done: true,
      detail: `${missingSegments.length} lost segments tagged`,
    },
    {
      id: 'requested',
      label: '2. SELECTIVE NACK',
      active: true,
      done: isRecovering || isCompleted,
      detail: 'ARQ packet queued',
    },
    {
      id: 'recovering',
      label: '3. RE-TRANSMITTING',
      active: isRecovering || isCompleted,
      done: isCompleted,
      detail: isRecovering ? 'Ingesting missing chunks' : isCompleted ? 'Chunks received' : 'Pending link slot',
    },
    {
      id: 'recovered',
      label: '4. RECONSTRUCTED',
      active: isCompleted,
      done: isCompleted,
      detail: isCompleted ? '100% frame validated' : 'Awaiting confirmation',
    },
  ];

  return (
    <div className="bg-[#070D1C] rounded-xl border border-slate-800/90 p-4 space-y-4 font-mono">
      {/* Visual Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold font-space text-slate-200 uppercase tracking-wider">
            Selective Recovery Pipeline
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Target: <span className="text-cyan-300 font-bold">{imageId}</span> ({missingSegments.length} / {totalSegments} chunks)
        </div>
      </div>

      {/* Recovery Pipeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all duration-200',
              step.done
                ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300'
                : step.active
                ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300 animate-pulse'
                : 'bg-slate-950/40 border-slate-800/50 text-slate-500'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold tracking-wider">{step.label}</span>
              {step.done ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : step.active ? (
                <RotateCcw className="w-3 h-3 text-cyan-400 animate-spin-slow" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              )}
            </div>
            <div className="text-[9px] opacity-80">{step.detail}</div>
          </div>
        ))}
      </div>

      {/* Target Segments Micro Grid */}
      <div>
        <div className="text-[10px] text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
          <span>SELECTIVE RESEND SEGMENT MAP:</span>
          <span className="text-[9px] text-slate-500">Only highlighted chunks are retransmitted</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/70">
          {missingSegments.map((seg) => (
            <div
              key={seg}
              className={cn(
                'px-2.5 py-1.5 rounded-md border text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all',
                isCompleted
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : isRecovering
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : isRecovering ? (
                <RotateCcw className="w-3 h-3 text-cyan-400 animate-spin" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              )}
              <span>SEG #{seg}</span>
              <span className="text-[9px] opacity-70">
                {isCompleted ? 'RECOVERED' : isRecovering ? 'IN FLIGHT' : 'NACK'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transmission Efficiency Metric Strip */}
      <div className="p-2.5 rounded-lg bg-teal-950/20 border border-teal-500/30 flex items-center justify-between text-xs text-teal-300">
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
          <span>Bandwidth consumed: <strong>{(missingSegments.length * 0.25).toFixed(2)} KB</strong> vs <strong>{(totalSegments * 0.25).toFixed(2)} KB</strong> whole-image resend</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 font-bold border border-teal-500/40 text-[10px]">
          97.5% SAVED
        </span>
      </div>
    </div>
  );
}
