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
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-slate-900/60 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (retransmissions.length === 0) {
    return (
      <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-10 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">No Pending Retransmissions</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          All downlink frame segments received and validated with zero CRC packet drop.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#131E35] bg-[#050810] text-slate-400 font-semibold tracking-wider text-[10px] uppercase">
              <th className="py-2.5 px-3">Image ID</th>
              <th className="py-2.5 px-3">Missing Chunks</th>
              <th className="py-2.5 px-3">ARQ Reason</th>
              <th className="py-2.5 px-3">Retry</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Requested</th>
              <th className="py-2.5 px-3 text-right sticky right-0 z-10 bg-[#050810] border-l border-[#131E35]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131E35]">
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
                    'hover:bg-[#0E1B38]/50 transition-colors cursor-pointer group',
                    isSelected && 'bg-[#0E1B38] border-l-2 border-l-cyan-400'
                  )}
                >
                  {/* Image ID */}
                  <td className="py-2 px-3">
                    <span className="font-mono font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {r.image_id}
                    </span>
                    <div className="text-[9px] font-mono text-slate-500">REQ #{r.id}</div>
                  </td>

                  {/* Missing Segments */}
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1 items-center max-w-xs">
                      {r.missing_segments.slice(0, 4).map((seg) => (
                        <span
                          key={seg}
                          className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold tabular-nums"
                        >
                          #{seg}
                        </span>
                      ))}
                      {r.missing_segments.length > 4 && (
                        <span className="text-[9px] font-mono text-slate-500">
                          +{r.missing_segments.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Reason */}
                  <td className="py-2 px-3 text-slate-300">
                    <span className="text-[11px] text-amber-300/90 font-medium">
                      CRC Packet Drop
                    </span>
                  </td>

                  {/* Retry Count */}
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    Attempt 1
                  </td>

                  {/* Status Badge */}
                  <td className="py-2 px-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border',
                        isPending
                          ? 'bg-[#2B1B0A] text-amber-300 border-amber-500/30'
                          : isRecovering
                          ? 'bg-[#0E1B38] text-cyan-300 border-cyan-500/30'
                          : 'bg-[#062D24] text-emerald-300 border-emerald-500/30'
                      )}
                    >
                      {isPending && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                      {isRecovering && <RotateCcw className="w-2.5 h-2.5 text-cyan-400 animate-spin" />}
                      {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                      <span>{isPending ? 'Pending' : isRecovering ? 'In Flight' : 'Recovered'}</span>
                    </span>
                  </td>

                  {/* Requested Time */}
                  <td className="py-2 px-3 text-slate-400 text-[10px] font-mono tabular-nums">
                    {formatDate(r.requested_at)}
                  </td>

                  {/* Action */}
                  <td className="py-2 px-3 text-right sticky right-0 bg-[#080E1E] group-hover:bg-[#0E1B38] border-l border-[#131E35]" onClick={(e) => e.stopPropagation()}>
                    {isPending ? (
                      <button
                        onClick={() => onRetransmit(r.id)}
                        disabled={disabled}
                        className="px-2.5 py-1 rounded bg-[#2B1B0A] hover:bg-[#3D250D] text-amber-300 border border-amber-500/40 text-[10px] font-semibold transition-colors flex items-center gap-1 ml-auto disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retransmit</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelect(r)}
                        className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-[#050810] transition-colors ml-auto flex items-center gap-0.5 font-medium"
                        title="View Details"
                      >
                        <span className="text-[10px]">Inspect</span>
                        <ChevronRight className="w-3 h-3" />
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
