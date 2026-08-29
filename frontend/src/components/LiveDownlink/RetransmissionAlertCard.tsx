import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RetransmissionAlertCardProps {
  missingSegments: number[];
  status?: 'pending' | 'acknowledged' | 'completed' | string;
}

export function RetransmissionAlertCard({
  missingSegments = [],
  status,
}: RetransmissionAlertCardProps) {
  const hasMissing = missingSegments.length > 0;

  if (!hasMissing) {
    return (
      <div className="p-2.5 rounded bg-[#080E1E] border border-[#131E35] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-semibold text-[11px] uppercase tracking-wide">All Downlink Segments Nominal</span>
        </div>
        <span className="text-[10px] text-slate-400">Zero packet drop detected</span>
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
    <div className="p-2.5 rounded bg-[#180A12] border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <div>
          <span className="font-bold text-rose-300 text-[11px] mr-2 uppercase tracking-wide">
            ARQ Retransmission Required:
          </span>
          <span className="text-slate-300 text-[11px]">
            {missingSegments.length} dropped {missingSegments.length === 1 ? 'segment' : 'segments'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {missingSegments.map((seg) => (
            <span
              key={seg}
              className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold text-[10px] tabular-nums"
            >
              #{seg}
            </span>
          ))}
        </div>

        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
            status === 'acknowledged'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
