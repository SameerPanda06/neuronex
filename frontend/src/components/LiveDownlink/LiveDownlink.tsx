import { useState, useEffect } from 'react';
import { useImages } from '../../hooks/useImages';
import { useQueue } from '../../hooks/useQueue';
import { useSignalQuality } from '../../hooks/useTelemetry';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { useRetransmissions } from '../../hooks/useRetransmissions';
import { useConnection } from '../../hooks/useConnection';

import { ActiveImageCard } from './ActiveImageCard';
import { SegmentMapCard } from './SegmentMapCard';
import { SignalMetricsCard } from './SignalMetricsCard';
import { TransmissionProgressCard } from './TransmissionProgressCard';
import { RetransmissionAlertCard } from './RetransmissionAlertCard';
import { QueueAndWindowCard } from './QueueAndWindowCard';

export function LiveDownlink() {
  const { connected, mode } = useConnection();
  const isMock = mode === 'mock';
  const isReplay = mode === 'replay';
  const { images: transmittingImages } = useImages({ status: 'transmitting', limit: 1 });
  const { images: queuedImages } = useImages({ status: 'queued', limit: 5 });
  const { queue } = useQueue();
  const { data: signalData } = useSignalQuality(undefined, 1);
  const { status: revStatus } = useRevolutionStatus();
  const { retransmissions } = useRetransmissions();

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
  const isStreaming = activeImage !== null;

  // Derive missing segments for active transmitting image if any ARQ exists
  const activeRetrans = retransmissions.find(
    (r) => r.image_id === activeImage?.id
  );
  const missingSegments = activeRetrans?.missing_segments || [];

  const timeRemaining = revStatus?.time_remaining ?? null;

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#131E35]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Live Downlink
            </h1>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isStreaming
                  ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-400/50'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isStreaming ? 'Stream Active' : 'Standby'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Active LoRa frame packet demodulation and segment reconstruction
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Hardware Connection Badge */}
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

      {/* Main Grid: Left Primary Card + Right Sidebar Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Active Image Inspection & 40-Segment Reconstruction (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <ActiveImageCard activeImage={activeImage} />
          <SegmentMapCard activeImage={activeImage} missingSegments={missingSegments} />
        </div>

        {/* Right Column: Telemetry Gauges, Progress, ARQ, & Upcoming Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <TransmissionProgressCard activeImage={activeImage} />
          <SignalMetricsCard signalData={signalData} />
          <RetransmissionAlertCard
            missingSegments={missingSegments}
            status={activeRetrans?.status}
          />
          <QueueAndWindowCard
            queue={queue.length > 0 ? queue : queuedImages}
            activeImageId={activeImage?.id}
            revolution={revStatus?.revolution ?? null}
            timeRemaining={timeRemaining}
          />
        </div>
      </div>
    </div>
  );
}
