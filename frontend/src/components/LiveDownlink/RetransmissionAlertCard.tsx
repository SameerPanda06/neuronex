import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RetransmissionAlertCardProps {
  missingSegments: number[];
  status?: 'pending' | 'acknowledged' | 'completed' | string;
}

export function RetransmissionAlertCard({
  missingSegments = [312, 319, 325],
  status = 'pending',
}: RetransmissionAlertCardProps) {
  const hasMissing = missingSegments.length > 0;

  if (!hasMissing) {
    return (
      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-semibold tracking-wide">ALL RECEIVED SEGMENTS HEALTHY</span>
        </div>
        <span className="text-[11px] text-emerald-400/80">0 Packet Loss Detected</span>
      </div>
    );
  }

  const statusLabel =
    status === 'acknowledged'
      ? 'RECOVERING'
      : status === 'completed'
      ? 'RECOVERED'
      : 'PENDING ARQ';

  return (
    <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-md shadow-rose-950/30">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        <div>
          <span className="font-bold text-rose-300 tracking-wider mr-2">
            RETRANSMISSION REQUIRED
          </span>
          <span className="text-slate-300">
            {missingSegments.length} lost {missingSegments.length === 1 ? 'segment' : 'segments'}:
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {missingSegments.map((seg) => (
            <span
              key={seg}
              className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[11px]"
            >
              #{seg}
            </span>
          ))}
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            status === 'acknowledged'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
