import { useState } from 'react';
import { RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { SegmentRecoveryVisualizer } from './SegmentRecoveryVisualizer';
import { cn, formatDate } from '../../utils/format';
import type { Retransmission } from '../../types';

interface RetransmissionDetailPanelProps {
  retransmission: Retransmission | null;
  onClose?: () => void;
  onRetransmit: (id: number) => Promise<void>;
  isProcessing?: boolean;
}

export function RetransmissionDetailPanel({
  retransmission,
  onClose,
  onRetransmit,
  isProcessing = false,
}: RetransmissionDetailPanelProps) {
  const [actionSuccess, setActionSuccess] = useState(false);

  if (!retransmission) {
    return (
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-8 text-center flex flex-col items-center justify-center min-h-[320px] text-slate-500">
        <ShieldCheck className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Select a Retransmission Request</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          Click any row in the table to inspect selective ARQ segments, recovery pipeline, and frame diagnostics.
        </p>
      </div>
    );
  }

  const isPending = retransmission.status === 'pending';
  const isRecovering = retransmission.status === 'acknowledged';

  const handleAction = async () => {
    try {
      await onRetransmit(retransmission.id);
      setActionSuccess(true);
      setTimeout(() => setActionSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-4">
      {/* Top Details Header */}
      <div className="flex items-center justify-between border-b border-[#131E35] pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded border',
              isPending
                ? 'bg-[#2B1B0A] text-amber-400 border-amber-500/40'
                : isRecovering
                ? 'bg-[#0E1B38] text-cyan-400 border-cyan-500/40'
                : 'bg-[#062D24] text-emerald-400 border-emerald-500/40'
            )}
          >
            {isPending ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : isRecovering ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span className="font-mono">{retransmission.image_id}</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                REQ #{retransmission.id}
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Mission: {retransmission.mission_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border',
              isPending
                ? 'bg-[#2B1B0A] text-amber-300 border-amber-500/30'
                : isRecovering
                ? 'bg-[#0E1B38] text-cyan-300 border-cyan-500/30'
                : 'bg-[#062D24] text-emerald-300 border-emerald-500/30'
            )}
          >
            {isPending ? 'Pending ARQ' : isRecovering ? 'In Recovery' : 'Recovered'}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#050810] transition-colors"
              aria-label="Close retransmission details"
              title="Close retransmission details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Attempt</div>
          <div className="font-semibold text-slate-200 mt-0.5 text-[11px]">Attempt 1</div>
        </div>
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Requested</div>
          <div className="font-mono text-slate-200 mt-0.5 text-[11px] tabular-nums">{formatDate(retransmission.requested_at)}</div>
        </div>
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Acknowledged</div>
          <div className="font-mono text-slate-200 mt-0.5 text-[11px] tabular-nums">
            {retransmission.acknowledged_at ? formatDate(retransmission.acknowledged_at) : '—'}
          </div>
        </div>
        <div className="bg-[#050810] p-2 rounded border border-[#131E35]">
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Completed</div>
          <div className="font-mono font-semibold text-emerald-400 mt-0.5 text-[11px] tabular-nums">
            {retransmission.completed_at ? formatDate(retransmission.completed_at) : '—'}
          </div>
        </div>
      </div>

      {/* Segment Recovery Visualizer Component */}
      <SegmentRecoveryVisualizer
        missingSegments={retransmission.missing_segments}
        status={retransmission.status}
        imageId={retransmission.image_id}
        totalSegments={120}
      />

      {/* Action Footer Button */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-[10px] text-slate-400">
          Selective packet resend over active LoRa frame slot.
        </div>

        {isPending ? (
          <button
            onClick={handleAction}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded bg-[#2B1B0A] hover:bg-[#3D250D] text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={cn('w-3.5 h-3.5', isProcessing && 'animate-spin')} />
            <span>{isProcessing ? 'Transmitting ARQ...' : 'Retransmit Now'}</span>
          </button>
        ) : isRecovering ? (
          <div className="flex items-center gap-1.5 text-cyan-300 text-xs px-2.5 py-1 rounded bg-[#0E1B38] border border-cyan-500/30 font-medium">
            <RotateCcw className="w-3 h-3 animate-spin" />
            <span>Recovery in progress</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1 rounded bg-[#062D24] border border-emerald-500/30 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Frame Reconstructed</span>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="p-2 rounded bg-[#062D24] border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Retransmission acknowledged. Missing chunks scheduled for transmission.</span>
        </div>
      )}
    </div>
  );
}
