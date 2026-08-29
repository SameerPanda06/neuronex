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
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-8 text-center flex flex-col items-center justify-center min-h-[320px] font-mono text-slate-500">
        <ShieldCheck className="w-10 h-10 text-cyan-400/40 mb-3" />
        <p className="text-sm text-slate-300 font-space font-semibold">Select a Retransmission Request</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
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
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 space-y-5 shadow-xl shadow-black/40 font-mono">
      {/* Top Details Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-2 rounded-lg border',
              isPending
                ? 'bg-amber-950/50 text-amber-400 border-amber-500/40'
                : isRecovering
                ? 'bg-cyan-950/50 text-cyan-400 border-cyan-500/40'
                : 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40'
            )}
          >
            {isPending ? (
              <AlertTriangle className="w-4 h-4" />
            ) : isRecovering ? (
              <RotateCcw className="w-4 h-4 animate-spin-slow" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="font-space font-bold text-base text-white flex items-center gap-2">
              {retransmission.image_id}
              <span className="text-xs font-mono font-normal text-slate-400">
                REQ #{retransmission.id}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Mission: {retransmission.mission_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm',
              isPending
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : isRecovering
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 animate-pulse'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            )}
          >
            {isPending ? 'PENDING ARQ' : isRecovering ? 'IN RECOVERY' : 'RECOVERED'}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">ATTEMPT</div>
          <div className="font-bold text-slate-200 mt-0.5">Attempt 1</div>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">REQUESTED</div>
          <div className="font-bold text-slate-200 mt-0.5">{formatDate(retransmission.requested_at)}</div>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">ACKNOWLEDGED</div>
          <div className="font-bold text-slate-200 mt-0.5">
            {retransmission.acknowledged_at ? formatDate(retransmission.acknowledged_at) : '—'}
          </div>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">COMPLETED</div>
          <div className="font-bold text-emerald-300 mt-0.5">
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
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400">
          Trigger selective packet resend over active LoRa downlink frame slot.
        </div>

        {isPending ? (
          <button
            onClick={handleAction}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className={cn('w-4 h-4', isProcessing && 'animate-spin')} />
            <span>{isProcessing ? 'SENDING ARQ REQUEST...' : 'RETRANSMIT NOW'}</span>
          </button>
        ) : isRecovering ? (
          <div className="flex items-center gap-2 text-cyan-300 text-xs px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            <span>RECOVERY IN PROGRESS (AUTOMATIC SYNC)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-300 text-xs px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ALL SEGMENTS RECOVERED</span>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Retransmission acknowledged! Missing chunks scheduled for transmission.</span>
        </div>
      )}
    </div>
  );
}
