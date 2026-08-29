import { useState, useMemo } from 'react';
import { OrbitWindowsHeader } from './OrbitWindowsHeader';
import { CurrentPassHero } from './CurrentPassHero';
import { OrbitVisualizer } from './OrbitVisualizer';
import { RevolutionCardItem } from './RevolutionCardItem';
import { UpcomingPassesList } from './UpcomingPassesList';
import { RevolutionDetailDrawer } from './RevolutionDetailDrawer';
import { OrbitCalendarView } from './OrbitCalendarView';

import { useRevolutions, useRevolutionStatus } from '../../hooks/useRevolutions';
import { useConnection } from '../../hooks/useConnection';
import { WifiOff, List, Calendar } from 'lucide-react';
import type { Revolution } from '../../types';

export function OrbitWindows() {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedRev, setSelectedRev] = useState<Revolution | null>(null);

  const { connected, mode } = useConnection();
  const { revolutions, loading } = useRevolutions({ limit: 12 });
  const { status: revStatus } = useRevolutionStatus();

  const isOffline = mode === 'live' && !connected;

  const totalWindow = revStatus?.revolution?.window_duration_sec ?? 60;
  const timeRemaining = revStatus?.time_remaining ?? 0;
  const activeProgressPercent = Math.max(0, Math.min(100, Math.round(((totalWindow - timeRemaining) / totalWindow) * 100)));

  const activeSelected = useMemo(() => {
    if (selectedRev) return selectedRev;
    if (revStatus?.revolution) return revStatus.revolution;
    return revolutions[0] || null;
  }, [selectedRev, revStatus?.revolution, revolutions]);

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Header with UTC clock & connection state */}
      <OrbitWindowsHeader />

      {/* Offline Alert */}
      {isOffline && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#180A12] border border-rose-500/40 text-rose-300 text-xs">
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          <span>Backend Offline — Displaying Local Orbit Pass Buffer</span>
        </div>
      )}

      {/* 2. Hero Component: Active Contact Pass Live Countdown or Next Pass */}
      <CurrentPassHero status={revStatus} />

      {/* 3. Orbit Visualizer Schematic */}
      <OrbitVisualizer status={revStatus} />

      {/* 4. Controls Strip: Timeline vs Calendar Toggle */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1 bg-[#080E1E] p-1 rounded-md border border-[#131E35]">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#050810] border border-transparent font-medium'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Timeline View</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              viewMode === 'calendar'
                ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#050810] border border-transparent font-medium'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar View</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 hidden sm:inline">
          LEO Pass Geometry: <strong className="text-cyan-300 font-mono">AOS 5° → TCA 78° → LOS 5°</strong>
        </span>
      </div>

      {/* 5. Main Content: Timeline (Pass Cards + Drawer) or Calendar View */}
      {viewMode === 'timeline' ? (
        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4">
          {/* Left Column: Pass Cards & Upcoming List (7 cols) */}
          <div className="2xl:col-span-7 space-y-3 min-w-0">
            {loading && revolutions.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-[#080E1E] rounded-md border border-[#131E35] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
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

            {/* Upcoming Passes Summary */}
            <UpcomingPassesList
              revolutions={revolutions}
              onSelect={setSelectedRev}
            />
          </div>

          {/* Right Column: Selected Revolution Detail Drawer (5 cols) */}
          <div className="2xl:col-span-5 min-w-0">
            <RevolutionDetailDrawer
              revolution={activeSelected}
            />
          </div>
        </div>
      ) : (
        /* Calendar View */
        <OrbitCalendarView
          revolutions={revolutions}
          selectedId={activeSelected?.id ?? null}
          onSelect={setSelectedRev}
        />
      )}
    </div>
  );
}
