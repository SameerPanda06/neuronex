import { useState, useEffect } from 'react';
import { ActiveImageCard } from './ActiveImageCard';
import { SignalMetricsCard } from './SignalMetricsCard';
import { TransmissionProgressCard } from './TransmissionProgressCard';
import { SegmentMapCard } from './SegmentMapCard';
import { RetransmissionAlertCard } from './RetransmissionAlertCard';
import { QueueAndWindowCard } from './QueueAndWindowCard';
import { useImages } from '../../hooks/useImages';
import { useQueue } from '../../hooks/useQueue';
import { useRetransmissions } from '../../hooks/useRetransmissions';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { useConnection } from '../../hooks/useConnection';

export function LiveDownlink() {
  const { connected, mode } = useConnection();
  const isMock = mode === 'mock';
  const { images } = useImages({ status: 'transmitting', limit: 1 });
  const { queue } = useQueue();
  const { retransmissions } = useRetransmissions({ status: 'pending' });
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

  const activeImage = images.find((img) => img.status === 'transmitting') || queue[0] || null;
  const currentSeg = activeImage?.current_segment || activeImage?.segments_confirmed || 314;
  const totalSegs = activeImage?.total_segments || 430;

  // Active missing segments from pending retransmissions
  const activeRetrans = retransmissions.find(
    (r) => activeImage && r.image_id === activeImage.id && r.status === 'pending'
  );
  const missingSegments = activeRetrans?.missing_segments || [312, 319, 325];

  const revNum = revStatus?.revolution?.revolution_num ?? 128;

  return (
    <div className="space-y-5 pb-8">
      {/* Top Header matching reference */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl font-bold font-space text-white tracking-wide">
            LIVE DOWNLINK
          </h1>
          <p className="text-xs font-mono text-cyan-400/90 mt-0.5">
            Real-time satellite image transmission
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isMock ? 'SIMULATION' : connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div className="text-slate-300 font-medium hidden md:block">
            Revolution #{revNum}
          </div>

          <div className="text-cyan-300 font-bold bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
            {utcTime || '14:36:18 UTC'}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column & Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Active Image & Signal Metrics */}
        <div className="lg:col-span-5 space-y-5">
          <ActiveImageCard image={activeImage} />
          <SignalMetricsCard
            rssiOverride={activeImage?.rssi}
            snrOverride={activeImage?.snr}
            packetsReceived={activeImage?.segments_confirmed ? activeImage.segments_confirmed * 4 : 1248}
            missingCount={missingSegments.length}
          />
        </div>

        {/* Right Column: Transmission Progress, Segment Map, Retrans Alert, Upcoming Queue */}
        <div className="lg:col-span-7 space-y-5">
          <TransmissionProgressCard
            image={activeImage}
            missingCount={missingSegments.length}
          />

          <SegmentMapCard
            currentSegment={currentSeg}
            totalSegments={totalSegs}
            missingSegments={missingSegments}
          />

          <RetransmissionAlertCard
            missingSegments={missingSegments}
            status={activeRetrans?.status || 'pending'}
          />

          <QueueAndWindowCard
            queue={queue}
            activeImageId={activeImage?.id}
            revolution={revStatus?.revolution || null}
            timeRemaining={revStatus?.time_remaining || 41}
          />
        </div>
      </div>
    </div>
  );
}
