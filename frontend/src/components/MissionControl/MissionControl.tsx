import { useState, useEffect } from 'react';
import { KpiCards } from './KpiCards';
import { CurrentDownlinkCard } from './CurrentDownlinkCard';
import { AiOptimizationCard } from './AiOptimizationCard';
import { SignalOverviewCard } from './SignalOverviewCard';
import { QueueCard } from './QueueCard';
import { RevolutionCard } from './RevolutionCard';
import { useConnection } from '../../hooks/useConnection';
import { useRevolutionStatus } from '../../hooks/useRevolutions';

import type { NavTabId } from '../Layout';

interface MissionControlProps {
  onNavigateTab?: (tab: NavTabId) => void;
}

export function MissionControl({ onNavigateTab }: MissionControlProps) {
  const { connected, mode } = useConnection();
  const isMock = mode === 'mock';
  const isReplay = mode === 'replay';
  const { status: revStatus } = useRevolutionStatus();
  const [utcTime, setUtcTime] = useState<string>('');

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const revNum = revStatus?.revolution?.revolution_num ?? null;
  const missionId = revStatus?.revolution?.mission_id ?? null;

  return (
    <div className="space-y-5 pb-8">
      {/* Top Header matching reference */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl font-bold font-space text-white tracking-wide">
            MISSION CONTROL
          </h1>
          <p className="text-xs font-mono text-cyan-400/90 mt-0.5">
            {missionId === null ? 'MISSION UNAVAILABLE' : `Mission ${missionId}`}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
          {/* Ground Link Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isMock ? 'SIMULATION LINK ACTIVE' : isReplay ? 'MISSION REPLAY ACTIVE' : connected ? 'GROUND LINK ACTIVE' : 'LINK DISCONNECTED'}
            </span>
          </div>

          <div className="text-slate-300 font-medium hidden md:block">
            {revNum === null ? 'Revolution —' : `Revolution #${revNum}`}
          </div>

          <div className="text-cyan-300 font-bold bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
            {utcTime || '--:--:-- UTC'}
          </div>
        </div>
      </div>

      {/* Row 1: Primary KPI Cards */}
      <KpiCards />

      {/* Row 2: Current Downlink & AI Optimization */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7">
          <CurrentDownlinkCard />
        </div>
        <div className="xl:col-span-5">
          <AiOptimizationCard />
        </div>
      </div>

      {/* Row 3: Signal Overview, Transmission Queue, Revolution */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5">
          <SignalOverviewCard />
        </div>
        <div className="xl:col-span-4">
          <QueueCard onViewAll={() => onNavigateTab?.('transmission')} />
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <RevolutionCard />
        </div>
      </div>
    </div>
  );
}
