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

  // Convert timeRange string to hours for API / data query
  const hoursMap: Record<TimeRange, number> = {
    LIVE: 1,
    '1H': 1,
    '6H': 6,
    '24H': 24,
    '7D': 168,
  };

  const hours = hoursMap[timeRange] || 1;

  // Domain Hooks
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
    <div className="space-y-6">
      {/* 1. Header with UTC clock & connection state */}
      <SignalAnalyticsHeader />

      {/* 2. Top Controls Bar (Time Range Filter + Status Notification) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />

        {isOffline && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
            <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>LIVE HARDWARE OFFLINE — NO LIVE TELEMETRY</span>
          </div>
        )}

        {!isOffline && timeRange === 'LIVE' && (
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>STREAMING REAL-TIME RF TELEMETRY</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: RSSI and SNR Time-Series Charts */}
        <div className="lg:col-span-2 space-y-6">
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
        <div className="lg:col-span-1">
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

      {/* 6. Revolution Signal Heatmap (High-priority F4 Feature) */}
      <RevolutionSignalHeatmap
        revolutions={revolutions}
        revolutionStatus={revStatus}
      />
    </div>
  );
}
