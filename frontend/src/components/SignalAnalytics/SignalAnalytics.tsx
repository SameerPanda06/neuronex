import { useState } from 'react';
import { SignalAnalyticsHeader } from './SignalAnalyticsHeader';
import { TimeRangeSelector, type TimeRange } from './TimeRangeSelector';
import { SignalKpis } from './SignalKpis';
import { RssiChartCard } from './RssiChartCard';
import { SnrChartCard } from './SnrChartCard';
import { LinkHealthCard } from './LinkHealthCard';
import { ThroughputPacketPanel } from './ThroughputPacketPanel';
import { RevolutionSignalHeatmap } from './RevolutionSignalHeatmap';

import { useSignalQuality } from '../../hooks/useTelemetry';
import {
  useRevolutions,
  useRevolutionStatus,
} from '../../hooks/useRevolutions';
import { useRetransmissionStats } from '../../hooks/useRetransmissions';
import { useImages } from '../../hooks/useImages';
import { useConnection } from '../../hooks/useConnection';
import { WifiOff } from 'lucide-react';
import { deriveSegmentDelivery } from '../../lib/missionMetrics';

export function SignalAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('LIVE');
  const { connected, mode } = useConnection();

  const hoursMap: Record<TimeRange, number> = {
    LIVE: 1,
    '1H': 1,
    '6H': 6,
    '24H': 24,
    '7D': 168,
  };

  const hours = hoursMap[timeRange] || 1;

  const { data: signalData, loading: signalLoading } = useSignalQuality(undefined, hours);
  const { revolutions } = useRevolutions({ limit: 10 });
  const { status: revStatus } = useRevolutionStatus();
  const { stats: retransStats } = useRetransmissionStats();
  const { images: transmittingImages } = useImages({ status: 'transmitting', limit: 1 });

  const isOffline = mode === 'live' && !connected;
  const telemetryPoints = signalData?.telemetry || [];
  const deliveryMetric = deriveSegmentDelivery(revolutions);
  const activeThroughput = transmittingImages[0]?.throughput_bps ?? null;

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Header with UTC clock & connection state */}
      <SignalAnalyticsHeader />

      {/* 2. Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />

        {isOffline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#180A12] border border-rose-500/40 text-rose-300 text-xs">
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span>Hardware Offline — No Live Telemetry</span>
          </div>
        )}

        {!isOffline && timeRange === 'LIVE' && (
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Streaming real-time RF telemetry</span>
          </div>
        )}
      </div>

      {/* 3. Primary KPI Cards */}
      <SignalKpis
        signalData={signalData}
        deliveryMetric={deliveryMetric}
        activeThroughput={activeThroughput}
      />

      {/* 4. Charts + Link Health Summary Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left 2 Columns: RSSI and SNR Time-Series Charts */}
        <div className="xl:col-span-2 space-y-4 min-w-0">
          <RssiChartCard
            telemetry={telemetryPoints}
            loading={signalLoading && telemetryPoints.length === 0}
          />
          <SnrChartCard
            telemetry={telemetryPoints}
            loading={signalLoading && telemetryPoints.length === 0}
          />
        </div>

        {/* Right 1 Column: Link Health Summary */}
        <div className="xl:col-span-1 min-w-0">
          <LinkHealthCard
            signalData={signalData}
            revolutionStatus={revStatus}
            deliveryMetric={deliveryMetric}
          />
        </div>
      </div>

      {/* 5. Throughput + Packet Quality Panel */}
      <ThroughputPacketPanel
        telemetry={telemetryPoints}
        deliveryMetric={deliveryMetric}
        retransStats={retransStats}
        activeThroughput={activeThroughput}
      />

      {/* 6. Revolution Signal Heatmap */}
      <RevolutionSignalHeatmap
        revolutions={revolutions}
        revolutionStatus={revStatus}
      />
    </div>
  );
}
