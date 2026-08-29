import { Orbit, Clock, Radio, CheckCircle2, Layers, X, ShieldCheck } from 'lucide-react';
import { cn, formatDate } from '../../utils/format';
import type { Revolution } from '../../types';

interface RevolutionDetailDrawerProps {
  revolution: Revolution | null;
  onClose?: () => void;
}

export function RevolutionDetailDrawer({ revolution, onClose }: RevolutionDetailDrawerProps) {
  if (!revolution) {
    return (
      <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-8 text-center flex flex-col items-center justify-center min-h-[300px] font-mono text-slate-500">
        <Orbit className="w-10 h-10 text-cyan-400/40 mb-3 animate-spin-slow" />
        <p className="text-sm text-slate-300 font-space font-semibold">Select an Orbital Revolution</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Click any pass card or calendar slot to inspect orbital geometry, planned downlink batches, and RF contact parameters.
        </p>
      </div>
    );
  }

  const isActive = revolution.status === 'active';
  const isCompleted = revolution.status === 'completed';

  const plannedList = revolution.images_planned || [];
  const completedList = revolution.images_completed || [];

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 space-y-4 shadow-xl shadow-black/40 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-2 rounded-lg border',
              isActive
                ? 'bg-cyan-950/50 text-cyan-400 border-cyan-500/40'
                : isCompleted
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            )}
          >
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-space font-bold text-base text-white">
              REVOLUTION #{revolution.revolution_num}
            </h3>
            <p className="text-xs text-slate-400">{revolution.mission_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
              isActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                : isCompleted
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            )}
          >
            {revolution.status}
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

      {/* Pass Timing Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            AOS START
          </div>
          <div className="font-bold text-slate-200 mt-0.5">{formatDate(revolution.window_start)}</div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            LOS END
          </div>
          <div className="font-bold text-slate-200 mt-0.5">{formatDate(revolution.window_end)}</div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            DURATION
          </div>
          <div className="font-bold text-emerald-300 mt-0.5">{revolution.window_duration_sec} Seconds</div>
        </div>
      </div>

      {/* Planned Downlink Images List */}
      <div>
        <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            PLANNED DOWNLINK BATCH:
          </span>
          <span className="text-[10px] text-slate-400">{plannedList.length} images scheduled</span>
        </div>

        {plannedList.length === 0 ? (
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-500 text-xs text-center">
            No specific images pre-allocated for this pass. Real-time queue priority ingestion active.
          </div>
        ) : (
          <div className="space-y-1.5">
            {plannedList.map((img) => (
              <div
                key={img.id}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{img.id}</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800/50">
                    PRIORITY {img.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                  {completedList.includes(img.id) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>DOWNLINKED</span>
                    </>
                  ) : isActive ? (
                    <span className="text-cyan-300 font-bold animate-pulse">TRANSMITTING</span>
                  ) : revolution.images_failed?.includes(img.id) ? (
                    <span className="text-rose-400">FAILED</span>
                  ) : (
                    <span className="text-slate-400">QUEUED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Segments Confirmation Summary */}
      <div className="p-3 rounded-lg bg-[#070D1C] border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 text-[10px] block">SEGMENTS DELIVERED</span>
          <strong className="text-emerald-300 text-sm">
            {revolution.total_segments_confirmed} / {revolution.total_segments_planned}
          </strong>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-[10px] block">LINK EFFICIENCY</span>
          <strong className="text-cyan-300 text-sm">
            {revolution.total_segments_planned > 0
              ? `${Math.round((revolution.total_segments_confirmed / revolution.total_segments_planned) * 100)}%`
              : '100%'}
          </strong>
        </div>
      </div>
    </div>
  );
}
