import { useState } from 'react';
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

  // Generate 5 consecutive revolution passes ending at active/next
  const baseRevNums = [activeRevNum - 4, activeRevNum - 3, activeRevNum - 2, activeRevNum - 1, activeRevNum];
  const numSlices = 12;

  // Generate heatmap rows
  const rows = baseRevNums.map((revNum) => {
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

      // Simulate realistic parabolic RF link curve through contact window:
      // Lowest at AOS (i=0) and LOS (i=numSlices-1), peak at TCA culmination (i=numSlices/2)
      const normalizedDist = Math.abs(i - (numSlices - 1) / 2) / ((numSlices - 1) / 2); // 0 at peak, 1 at horizon
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
  });

  // Color generator for cell
  const getCellBg = (cell: HeatmapCell) => {
    if (cell.status === 'future' || cell.status === 'scheduled') {
      return 'bg-slate-900/40 border-slate-800/60 text-slate-600';
    }
    if (cell.status === 'active') {
      return 'bg-cyan-400 text-cyan-950 font-bold border-cyan-300 ring-2 ring-cyan-400/80 shadow-md shadow-cyan-500/50 animate-pulse';
    }
    const r = cell.rssi;
    if (r >= -68) return 'bg-emerald-400 border-emerald-300 text-emerald-950';
    if (r >= -78) return 'bg-cyan-400 border-cyan-300 text-cyan-950';
    if (r >= -88) return 'bg-teal-600 border-teal-500 text-teal-100';
    if (r >= -100) return 'bg-cyan-950 border-cyan-800/60 text-cyan-300';
    return 'bg-slate-900 border-slate-800 text-slate-500';
  };

  return (
    <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
              REVOLUTION SIGNAL HEATMAP
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-cyan-900/40">
                PASS PROFILE
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Orbital pass contact window link quality (AOS → TCA Culmination → LOS)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="font-semibold text-slate-500">INTENSITY:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" title="Weak / Horizon" />
            <span className="text-slate-500">WEAK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-950 border border-cyan-800" title="Fair" />
            <span className="text-slate-400">FAIR</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-teal-600 border border-teal-500" title="Good" />
            <span className="text-teal-300">GOOD</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-400 border border-cyan-300" title="Strong" />
            <span className="text-cyan-300">STRONG</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-400 border border-emerald-300" title="Optimal" />
            <span className="text-emerald-300">PEAK</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Column Header: Contact Window Normalized Progress */}
          <div className="grid grid-cols-12 gap-1.5 mb-2 pl-24 pr-2 text-center text-[10px] font-mono text-slate-400">
            <div className="col-span-1 text-left">AOS (0%)</div>
            <div className="col-span-10 text-center flex items-center justify-center gap-2">
              <span className="h-[1px] flex-1 bg-slate-800" />
              <span className="text-cyan-400 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3" /> TCA CULMINATION (MAX ELEVATION)
              </span>
              <span className="h-[1px] flex-1 bg-slate-800" />
            </div>
            <div className="col-span-1 text-right">LOS (100%)</div>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.revNum}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border transition-all duration-150',
                  row.isCurrentActive
                    ? 'bg-[#070D1C] border-cyan-500/50 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700'
                )}
              >
                {/* Row Label */}
                <div className="w-22 shrink-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    {row.isCurrentActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-xs font-mono font-bold',
                        row.isCurrentActive ? 'text-cyan-300' : 'text-slate-300'
                      )}
                    >
                      REV #{row.revNum}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-mono tracking-wider',
                      row.isCurrentActive
                        ? 'text-cyan-400 font-semibold'
                        : 'text-slate-400'
                    )}
                  >
                    {row.status}
                  </span>
                </div>

                {/* Heatmap Slices */}
                <div className="grid grid-cols-12 gap-1.5 flex-1">
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
                        'h-8 rounded-md border text-[9px] font-mono flex items-center justify-center transition-transform hover:scale-105 relative cursor-pointer',
                        getCellBg(cell)
                      )}
                    >
                      {cell.status === 'active' ? (
                        <span className="text-[10px] font-black">●</span>
                      ) : cell.status === 'future' ? (
                        <span className="text-[8px] opacity-40">·</span>
                      ) : (
                        <span className="opacity-80">{cell.rssi}</span>
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
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono">
        {hoveredCell ? (
          <div className="flex items-center gap-4 text-slate-200">
            <span className="text-cyan-400 font-bold">REV #{hoveredCell.revNum}</span>
            <span className="text-slate-400">Position: <strong className="text-slate-200">{hoveredCell.cell.timeOffsetLabel} ({hoveredCell.cell.percent}%)</strong></span>
            <span className="text-slate-400">RSSI: <strong className="text-cyan-300 font-bold">{hoveredCell.cell.rssi} dBm</strong></span>
            <span className="text-slate-400">SNR: <strong className="text-teal-300 font-bold">{hoveredCell.cell.snr} dB</strong></span>
            <span className="text-slate-400">State: <strong className="text-emerald-400 uppercase font-semibold">{hoveredCell.cell.status}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Hover over any contact window slice to inspect precise RF link parameters and elevation geometry.</span>
          </div>
        )}

        <div className="text-[11px] text-slate-400">
          Normalized contact pass window: <span className="text-slate-300 font-bold">60s span</span>
        </div>
      </div>
    </div>
  );
}
