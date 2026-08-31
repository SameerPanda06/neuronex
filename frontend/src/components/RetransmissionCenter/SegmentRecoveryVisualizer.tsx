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
      detail: `${missingSegments.length} lost chunks tagged`,
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
      detail: isRecovering ? 'Ingesting chunks' : isCompleted ? 'Chunks received' : 'Pending slot',
    },
    {
      id: 'recovered',
      label: '4. RECONSTRUCTED',
      active: isCompleted,
      done: isCompleted,
      detail: isCompleted ? '100% CRC verified' : 'Awaiting confirmation',
    },
  ];

  return (
    <div className="bg-[#050810] rounded-md border border-[#131E35] p-3.5 space-y-3">
      {/* Visual Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#131E35] pb-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
            Selective Recovery Pipeline
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          Target: <span className="text-cyan-300 font-mono font-bold">{imageId}</span> ({missingSegments.length} of {totalSegments} chunks)
        </div>
      </div>

      {/* Recovery Pipeline Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'p-2 rounded border text-xs flex flex-col justify-between transition-colors',
              step.done
                ? 'bg-[#062D24] border-emerald-500/30 text-emerald-300'
                : step.active
                ? 'bg-[#0E1B38] border-cyan-500/40 text-cyan-300'
                : 'bg-[#050810] border-[#131E35] text-slate-600'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold tracking-wider uppercase">{step.label}</span>
              {step.done ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : step.active ? (
                <RotateCcw className="w-3 h-3 text-cyan-400 animate-spin" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-none bg-slate-700" />
              )}
            </div>
            <div className="text-[8px] opacity-80">{step.detail}</div>
          </div>
        ))}
      </div>

      {/* Target Segments Micro Grid */}
      <div>
        <div className="text-[9px] text-slate-400 font-semibold mb-1 flex items-center justify-between uppercase tracking-wide">
          <span>Selective Resend Segment Map:</span>
          <span className="text-[8px] text-slate-500 normal-case">Only highlighted chunks retransmitted</span>
        </div>

        <div className="flex flex-wrap gap-1 p-2 rounded bg-[#080E1E] border border-[#131E35]">
          {missingSegments.map((seg) => (
            <div
              key={seg}
              className={cn(
                'px-2 py-1 rounded border text-[10px] font-mono font-bold flex items-center gap-1 tabular-nums',
                isCompleted
                  ? 'bg-[#062D24] text-emerald-300 border-emerald-500/40'
                  : isRecovering
                  ? 'bg-[#0E1B38] text-cyan-300 border-cyan-500/50'
                  : 'bg-[#2B0A12] text-rose-300 border-rose-500/40'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              ) : isRecovering ? (
                <RotateCcw className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
              ) : (
                <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
              )}
              <span>SEG #{seg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transmission Efficiency Metric Strip */}
      <div className="p-2 rounded bg-[#071626] border border-cyan-900/30 flex items-center justify-between text-[11px] text-cyan-300">
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 text-cyan-400" />
          <span>Bandwidth: <strong className="font-mono tabular-nums">{(missingSegments.length * 0.25).toFixed(2)} KB</strong> vs <strong className="font-mono tabular-nums">{(totalSegments * 0.25).toFixed(2)} KB</strong> whole frame</span>
        </div>
        <span className="px-1.5 py-0.2 rounded bg-[#0D1830] text-cyan-200 font-semibold border border-cyan-800/40 text-[9px] font-mono tabular-nums">
          97.5% SAVED
        </span>
      </div>
    </div>
  );
}
