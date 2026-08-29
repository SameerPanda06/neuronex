import { useState } from 'react';
import { OrbitWindowsHeader } from './OrbitWindowsHeader';
import { CurrentPassHero } from './CurrentPassHero';
import { OrbitVisualizer } from './OrbitVisualizer';
import { RevolutionCardItem } from './RevolutionCardItem';
import { UpcomingPassesList } from './UpcomingPassesList';
import { RevolutionDetailDrawer } from './RevolutionDetailDrawer';
import { OrbitCalendarView } from './OrbitCalendarView';
import { useRevolutions, useRevolutionStatus } from '../../hooks/useRevolutions';
import { useConnection } from '../../hooks/useConnection';
import { WifiOff } from 'lucide-react';
import { cn } from '../../utils/format';
import type { Revolution } from '../../types';

export function OrbitWindows() {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedRev, setSelectedRev] = useState<Revolution | null>(null);

  const { connected, mode } = useConnection();
  const { revolutions, loading } = useRevolutions({ limit: 50 });
  const { status: revStatus } = useRevolutionStatus();

  const isOffline = mode === 'live' && !connected;

  // Derive active progress percent
  const activeRev = revStatus?.revolution;
  const timeRemaining = revStatus?.time_remaining ?? 0;
  const totalWindow = activeRev?.window_duration_sec ?? 0;
  const activeProgressPercent = totalWindow > 0 ? Math.max(0, Math.min(100, Math.round(((totalWindow - timeRemaining) / totalWindow) * 100))) : 0;

  // Auto-select active or first revolution if none selected
  const activeSelected = selectedRev ?? activeRev ?? (revolutions[0] || null);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <OrbitWindowsHeader />

      {/* Offline Banner */}
      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
          <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>BACKEND OFFLINE — ORBIT SCHEDULE UNAVAILABLE</span>
        </div>
      )}

      {/* 2. Top Hero + Orbit Tracking Visualizer Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 6-7 cols: Current Pass Hero */}
        <div className="xl:col-span-7">
          <CurrentPassHero status={revStatus} />
        </div>

        {/* Right 5-6 cols: Orbit Visualizer (Earth & Tracking Cone) */}
        <div className="xl:col-span-5">
          <OrbitVisualizer status={revStatus} />
        </div>
      </div>

      {/* 3. View Mode Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-[#070D1C] rounded-lg border border-slate-800/90">
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150',
              viewMode === 'timeline'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            )}
          >
            TIMELINE VIEW
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150',
              viewMode === 'calendar'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            )}
          >
            CALENDAR MATRIX
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Scheduled passes: <strong className="text-cyan-300">{revolutions.length}</strong>
        </span>
      </div>

      {/* 4. Lower Content: Timeline vs Calendar & Detail Drawer */}
      {viewMode === 'timeline' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Stacked Revolution Timeline (7 cols) */}
          <div className="xl:col-span-7 space-y-4">
            {loading && revolutions.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 bg-slate-900/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : revolutions.length === 0 ? (
              <div className="bg-[#0B132B]/85 backdrop-blur-md rounded-xl border border-cyan-900/30 p-12 text-center text-slate-400 font-mono">
                No orbital passes scheduled.
              </div>
            ) : (
              <div className="space-y-4">
                {revolutions.map((rev) => (
                  <RevolutionCardItem
                    key={rev.id}
                    revolution={rev}
                    isSelected={activeSelected?.id === rev.id}
                    onSelect={setSelectedRev}
                    activeProgressPercent={activeProgressPercent}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Selected Revolution Detail Drawer + Upcoming Schedule List (5 cols) */}
          <div className="xl:col-span-5 space-y-6">
            <RevolutionDetailDrawer
              revolution={activeSelected}
            />

            <UpcomingPassesList
              revolutions={revolutions}
              onSelect={setSelectedRev}
            />
          </div>
        </div>
      ) : (
        /* Calendar Matrix View */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8">
            <OrbitCalendarView
              revolutions={revolutions}
              selectedId={activeSelected?.id || null}
              onSelect={setSelectedRev}
            />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <RevolutionDetailDrawer
              revolution={activeSelected}
            />
          </div>
        </div>
      )}
    </div>
  );
}
