import { useMemo, useState } from 'react';
import { Orbit, Radio, Info } from 'lucide-react';
import { cn } from '../../utils/format';
import type { Revolution, RevolutionStatusResponse } from '../../types';

interface RevolutionSignalHeatmapProps {
  revolutions: Revolution[];
  revolutionStatus: RevolutionStatusResponse | null;
}

interface HeatmapCell {
  sliceIndex: number;
  percent: number;
  timeOffsetLabel: string;
  rssi: number;
  snr: number;
  status: 'completed' | 'active' | 'future' | 'scheduled';
}

export function RevolutionSignalHeatmap({
  revolutions,
  revolutionStatus,
}: RevolutionSignalHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    revNum: number;
    cell: HeatmapCell;
    revStatus: string;
  } | null>(null);

  // Determine active revolution number
  const activeRev = revolutionStatus?.revolution;
  const activeRevNum = activeRev?.revolution_num ?? (revolutions.find((r) => r.status === 'active')?.revolution_num || 15);
  const timeRemaining = revolutionStatus?.time_remaining ?? 35;
  const totalWindowSec = activeRev?.window_duration_sec ?? 60;
  const activeProgressPercent = Math.max(0, Math.min(100, Math.round(((totalWindowSec - timeRemaining) / totalWindowSec) * 100)));

  const numSlices = 12;

  // Generate heatmap rows
  const rows = useMemo(() => [activeRevNum - 4, activeRevNum - 3, activeRevNum - 2, activeRevNum - 1, activeRevNum].map((revNum) => {
    const isCurrentActive = revNum === activeRevNum;
    const isPast = revNum < activeRevNum;
    const revObj = revolutions.find((r) => r.revolution_num === revNum);

    const cells: HeatmapCell[] = [];
    for (let i = 0; i < numSlices; i++) {
      const slicePercent = Math.round((i / (numSlices - 1)) * 100);
      const timeOffsetSec = Math.round((i / (numSlices - 1)) * totalWindowSec);
      const min = Math.floor(timeOffsetSec / 60);
      const sec = timeOffsetSec % 60;
      const timeOffsetLabel = `T+${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      // Simulate realistic parabolic RF link curve through contact window
      const normalizedDist = Math.abs(i - (numSlices - 1) / 2) / ((numSlices - 1) / 2);
      const passSeed = (revNum * 13) % 7;
      const peakRssi = -64 - passSeed * 1.5;
      const horizonRssi = -112 + passSeed;
      const rssi = Math.round(peakRssi - Math.pow(normalizedDist, 1.8) * (peakRssi - horizonRssi));
      const snr = parseFloat((11.5 - normalizedDist * 8.5 + ((passSeed % 3) * 0.4)).toFixed(1));

      let cellStatus: HeatmapCell['status'] = 'completed';
      if (isCurrentActive) {
        const activeSliceIndex = Math.floor((activeProgressPercent / 100) * numSlices);
        if (i < activeSliceIndex) {
          cellStatus = 'completed';
        } else if (i === activeSliceIndex) {
          cellStatus = 'active';
        } else {
          cellStatus = 'future';
        }
      } else if (!isPast) {
        cellStatus = 'scheduled';
      }

      cells.push({
        sliceIndex: i,
        percent: slicePercent,
        timeOffsetLabel,
        rssi,
        snr,
        status: cellStatus,
      });
    }

    return {
      revNum,
      status: isCurrentActive ? 'ACTIVE' : isPast ? 'COMPLETED' : 'SCHEDULED',
      isCurrentActive,
      cells,
      revObj,
    };
  }), [activeProgressPercent, activeRevNum, revolutions, totalWindowSec]);

  // Color generator for cell
  const getCellBg = (cell: HeatmapCell) => {
    if (cell.status === 'future' || cell.status === 'scheduled') {
      return 'bg-[#050810] border-[#131E35] text-slate-600';
    }
    if (cell.status === 'active') {
      return 'bg-cyan-400 text-slate-950 font-bold border-cyan-300';
    }
    const r = cell.rssi;
    if (r >= -68) return 'bg-emerald-500/80 border-emerald-400/50 text-emerald-950 font-semibold';
    if (r >= -78) return 'bg-cyan-500/80 border-cyan-400/50 text-cyan-950 font-semibold';
    if (r >= -88) return 'bg-teal-700 border-teal-600/50 text-teal-100';
    if (r >= -100) return 'bg-[#0A1A30] border-[#132A4D] text-cyan-400';
    return 'bg-[#050810] border-[#131E35] text-slate-600';
  };

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-[#131E35]">
        <div className="flex items-center gap-2">
          <Orbit className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
            Revolution Contact Link Profile (Heatmap)
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[9px] text-slate-400">
          <span className="text-slate-500 font-semibold uppercase">Signal:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#050810] border border-[#131E35]" />
            <span>Horizon</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#0A1A30] border border-[#132A4D]" />
            <span>Fair</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-teal-700 border border-teal-600/50" />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-cyan-500/80 border border-cyan-400/50" />
            <span>Strong</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-500/80 border border-emerald-400/50" />
            <span>Peak</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Column Header: Contact Window Normalized Progress */}
          <div className="grid grid-cols-12 gap-1 mb-1.5 pl-20 pr-1 text-center text-[9px] text-slate-400">
            <div className="col-span-1 text-left">AOS (0%)</div>
            <div className="col-span-10 text-center flex items-center justify-center gap-2">
              <span className="h-[1px] flex-1 bg-[#131E35]" />
              <span className="text-cyan-400 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3" /> TCA CULMINATION (MAX ELEVATION)
              </span>
              <span className="h-[1px] flex-1 bg-[#131E35]" />
            </div>
            <div className="col-span-1 text-right">LOS (100%)</div>
          </div>

          {/* Rows */}
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={row.revNum}
                className={cn(
                  'flex items-center gap-2 p-1.5 rounded border transition-colors',
                  row.isCurrentActive
                    ? 'bg-[#0B152B] border-cyan-500/40'
                    : 'bg-[#050810] border-[#131E35]'
                )}
              >
                {/* Row Label */}
                <div className="w-18 shrink-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    {row.isCurrentActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-xs font-bold font-mono',
                        row.isCurrentActive ? 'text-cyan-300' : 'text-slate-300'
                      )}
                    >
                      Rev #{row.revNum}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-500 font-mono">
                    {row.status}
                  </span>
                </div>

                {/* Heatmap Slices */}
                <div className="grid grid-cols-12 gap-1 flex-1">
                  {row.cells.map((cell) => (
                    <button
                      key={cell.sliceIndex}
                      type="button"
                      onMouseEnter={() =>
                        setHoveredCell({
                          revNum: row.revNum,
                          cell,
                          revStatus: row.status,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        'h-7 rounded-none border text-[9px] font-mono flex items-center justify-center transition-colors select-none tabular-nums',
                        getCellBg(cell)
                      )}
                    >
                      {cell.status === 'active' ? (
                        <span className="text-[10px] font-bold">●</span>
                      ) : cell.status === 'future' ? (
                        <span className="text-[8px] opacity-40">·</span>
                      ) : (
                        <span className="opacity-90">{cell.rssi}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Cell Details Bar */}
      <div className="mt-2.5 pt-2 border-t border-[#131E35] flex flex-wrap items-center justify-between text-xs">
        {hoveredCell ? (
          <div className="flex items-center gap-3 text-slate-300 text-[11px]">
            <span className="text-cyan-400 font-bold font-mono">Rev #{hoveredCell.revNum}</span>
            <span>Position: <strong className="text-white font-mono">{hoveredCell.cell.timeOffsetLabel} ({hoveredCell.cell.percent}%)</strong></span>
            <span>RSSI: <strong className="text-cyan-300 font-mono tabular-nums">{hoveredCell.cell.rssi} dBm</strong></span>
            <span>SNR: <strong className="text-teal-300 font-mono tabular-nums">{hoveredCell.cell.snr} dB</strong></span>
            <span>State: <strong className="text-emerald-400 uppercase">{hoveredCell.cell.status}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <Info className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Hover over any contact slice to inspect precise RF link parameters and culmination geometry.</span>
          </div>
        )}

        <div className="text-[10px] text-slate-500">
          Normalized pass window: <span className="text-slate-400 font-bold font-mono">60s span</span>
        </div>
      </div>
    </div>
  );
}
