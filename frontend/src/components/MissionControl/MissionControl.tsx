import { useState, useEffect } from 'react';
import { useImages } from '../../hooks/useImages';
import { useSignalQuality } from '../../hooks/useTelemetry';
import { useQueue } from '../../hooks/useQueue';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { useConnection } from '../../hooks/useConnection';
import type { NavTabId } from '../Layout';

import { KpiCards } from './KpiCards';
import { CurrentDownlinkCard } from './CurrentDownlinkCard';
import { AiOptimizationCard } from './AiOptimizationCard';
import { SignalOverviewCard } from './SignalOverviewCard';
import { QueueCard } from './QueueCard';
import { RevolutionCard } from './RevolutionCard';

interface MissionControlProps {
  onNavigateTab?: (tab: NavTabId) => void;
}

export function MissionControl({ onNavigateTab }: MissionControlProps) {
  const { connected, mode } = useConnection();
  const isMock = mode === 'mock';
  const isReplay = mode === 'replay';
  const { images: transmittingImages } = useImages({ status: 'transmitting', limit: 1 });
  const { images: queuedImages } = useImages({ status: 'queued', limit: 5 });
  const { queue } = useQueue();
  const { data: signalData } = useSignalQuality(undefined, 1);
  const { status: revStatus } = useRevolutionStatus();

  const [utcTime, setUtcTime] = useState<string>('');

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

  const activeImage = transmittingImages[0] || null;
  const inContact = revStatus?.active ?? false;
  const timeRemaining = revStatus?.time_remaining ?? null;

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#131E35]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Mission Control
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0D1830] text-cyan-400 border border-cyan-500/30">
              LEO-1 Ground Station
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Real-time telemetry, downlinks, and edge-AI payload pipeline
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070D1A] border border-[#1E2E52] text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${isMock ? 'bg-cyan-400' : isReplay ? 'bg-amber-400' : connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-semibold uppercase tracking-wider">
              {isMock ? 'Simulation' : isReplay ? 'Mission Replay' : connected ? 'Live Hardware' : 'Offline'}
            </span>
          </div>

          <div className="text-slate-400 text-xs hidden md:block px-2.5 py-1 bg-[#070D1A] border border-[#131E35] rounded font-mono tabular-nums">
            {revStatus?.revolution ? `Rev #${revStatus.revolution.revolution_num}` : 'Rev —'}
          </div>

          <div className="text-cyan-300 font-semibold bg-[#070D1A] px-2.5 py-1 rounded border border-[#131E35] font-mono tabular-nums">
            {utcTime || '--:--:-- UTC'}
          </div>
        </div>
      </div>

      {/* Row 1: KPI Cards Strip (4 dense cards) */}
      <KpiCards
        activeImage={activeImage}
        signalData={signalData}
        revStatus={revStatus}
        queue={queue}
      />

      {/* Row 2: Active Downlink Card + AI Optimization Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 flex flex-col">
          <CurrentDownlinkCard
            activeImage={activeImage}
            onNavigate={() => onNavigateTab?.('transmission')}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <AiOptimizationCard
            onNavigate={() => onNavigateTab?.('ml-gallery')}
          />
        </div>
      </div>

      {/* Row 3: Signal Mini-Chart + Queue Card + Orbit Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 flex flex-col">
          <SignalOverviewCard
            signalData={signalData}
            onNavigate={() => onNavigateTab?.('metrics')}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <QueueCard
            queuedImages={queuedImages}
            queueCount={queue?.length ?? 0}
            activeImageId={activeImage?.id}
            onNavigate={() => onNavigateTab?.('transmission')}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col md:col-span-2 lg:col-span-4">
          <RevolutionCard
            revolution={revStatus?.revolution ?? null}
            inContact={inContact}
            timeRemaining={timeRemaining}
            onNavigate={() => onNavigateTab?.('revolutions')}
          />
        </div>
      </div>
    </div>
  );
}
