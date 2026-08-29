import { AlertTriangle, CheckCircle2, RotateCcw, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '../../utils/format';
import type { Retransmission } from '../../types';

interface RetransmissionTableProps {
  retransmissions: Retransmission[];
  selectedId: number | null;
  onSelect: (retrans: Retransmission) => void;
  onRetransmit: (id: number) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export function RetransmissionTable({
  retransmissions,
  selectedId,
  onSelect,
  onRetransmit,
  loading = false,
  disabled = false,
}: RetransmissionTableProps) {
  if (loading) {
    return (
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-900/60 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (retransmissions.length === 0) {
    return (
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-12 text-center font-mono">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-bold text-white font-space">NO PENDING RETRANSMISSIONS</h3>
        <p className="text-xs text-slate-400 mt-1">
          All downlink frame segments received and validated with zero CRC packet drop.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 overflow-hidden shadow-lg shadow-black/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-[#070D1C] text-slate-400 font-semibold tracking-wider text-[11px]">
              <th className="p-3.5">IMAGE ID</th>
              <th className="p-3.5">PASS</th>
              <th className="p-3.5">MISSING CHUNKS</th>
              <th className="p-3.5">ARQ REASON</th>
              <th className="p-3.5">RETRY</th>
              <th className="p-3.5">STATUS</th>
              <th className="p-3.5">REQUESTED</th>
              <th className="p-3.5 text-right sticky right-0 z-10 bg-[#070D1C] border-l border-slate-800">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {retransmissions.map((r) => {
              const isSelected = selectedId === r.id;
              const isPending = r.status === 'pending';
              const isRecovering = r.status === 'acknowledged';
              const isCompleted = r.status === 'completed';

              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className={cn(
                    'hover:bg-cyan-950/20 transition-colors cursor-pointer group',
                    isSelected && 'bg-cyan-950/30 border-l-2 border-l-cyan-400'
                  )}
                >
                  {/* Image ID */}
                  <td className="p-3.5">
                    <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {r.image_id}
                    </span>
                    <div className="text-[10px] text-slate-500">REQ #{r.id}</div>
                  </td>

                  {/* Pass/Revolution */}
                  <td className="p-3.5 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-semibold text-[10px]">
                      —
                    </span>
                  </td>

                  {/* Missing Segments */}
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1 items-center max-w-xs">
                      {r.missing_segments.slice(0, 4).map((seg) => (
                        <span
                          key={seg}
                          className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold"
                        >
                          #{seg}
                        </span>
                      ))}
                      {r.missing_segments.length > 4 && (
                        <span className="text-[10px] text-slate-500">
                          +{r.missing_segments.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Reason */}
                  <td className="p-3.5 text-slate-300">
                    <span className="text-[11px] font-medium text-amber-300/90">
                      ESP32 NACK (CRC Drop)
                    </span>
                  </td>

                  {/* Retry Count */}
                  <td className="p-3.5 text-slate-400">
                    Attempt 1
                  </td>

                  {/* Status Badge */}
                  <td className="p-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        isPending
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : isRecovering
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 animate-pulse'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      )}
                    >
                      {isPending && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      {isRecovering && <RotateCcw className="w-3 h-3 text-cyan-400 animate-spin" />}
                      {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      <span>{isPending ? 'PENDING' : isRecovering ? 'IN FLIGHT' : 'RECOVERED'}</span>
                    </span>
                  </td>

                  {/* Requested Time */}
                  <td className="p-3.5 text-slate-400 text-[11px]">
                    {formatDate(r.requested_at)}
                  </td>

                  {/* Action */}
                  <td className="p-3.5 text-right sticky right-0 bg-[#0B132B] group-hover:bg-[#0b1d35] border-l border-slate-800" onClick={(e) => e.stopPropagation()}>
                    {isPending ? (
                      <button
                        onClick={() => onRetransmit(r.id)}
                        disabled={disabled}
                        className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all flex items-center gap-1 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>RETRANSMIT</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelect(r)}
                        className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors ml-auto flex items-center gap-1"
                        title="View Details"
                      >
                        <span className="text-[10px]">INSPECT</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
