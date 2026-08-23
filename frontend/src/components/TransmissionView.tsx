// Transmission View - Real-time progress bars for current revolution
import React from 'react';
import { useImages } from '../hooks/useImages';
import { useQueue } from '../hooks/useQueue';
import { useTelemetry } from '../hooks/useTelemetry';
import { cn, formatBytes, formatBps, formatProgress, getStatusColor, getClassificationColor, getClassificationIcon } from '../utils/format';
import { Satellite, Send, CheckCircle, AlertCircle, Loader2, Signal, Database } from 'lucide-react';

export function TransmissionView() {
  const { images, loading } = useImages({ status: 'transmitting', limit: 10 });
  const { queue } = useQueue();
  const { data: signalData } = useTelemetry.latestTelemetry(); // This doesn't exist, fix

  const transmittingImages = images.filter(img => img.status === 'transmitting');
  const queuedImages = queue;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-space-900/50 rounded-xl border border-white/10 p-6">
            <div className="h-4 w-1/4 bg-white/10 rounded mb-4" />
            <div className="h-8 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section id="transmission" className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-space font-bold text-2xl text-white">Live Transmission</h2>
          <p className="text-neuronex-400 text-sm">Real-time downlink progress — 60s window × 3/day</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Currently Transmitting */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-space font-semibold text-lg text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" />
            Currently Transmitting ({transmittingImages.length})
          </h3>
          {transmittingImages.length === 0 && (
            <span className="text-xs text-neuronex-400 px-3 py-1 bg-white/5 rounded-full">
              No active transmission
            </span>
          )}
        </div>

        {transmittingImages.map((image) => (
          <ImageTransmissionCard key={image.id} image={image} />
        ))}

        {transmittingImages.length === 0 && (
          <div className="p-12 text-center text-neuronex-500">
            <Satellite className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Waiting for revolution window...</p>
            <p className="text-sm mt-1">Next transmission starts at the next 60s window</p>
          </div>
        )}
      </div>

      {/* Upcoming Queue */}
      {queuedImages.length > 0 && (
        <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-space font-semibold text-lg text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Queued for Next Window ({queuedImages.length})
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {queuedImages.slice(0, 5).map((image, index) => (
              <QueuedImageRow key={image.id} image={image} position={index + 1} />
            ))}
            {queuedImages.length > 5 && (
              <div className="px-6 py-3 text-center text-neuronex-500 text-sm">
                +{queuedImages.length - 5} more images queued
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ImageTransmissionCard({ image }: { image: any }) {
  const progress = image.progress_percent || 0;
  const segmentsConfirmed = image.segments_confirmed || 0;
  const totalSegments = image.total_segments || 0;
  const rssi = image.rssi;
  const snr = image.snr;
  const throughput = image.throughput_bps;

  return (
    <div className="p-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getClassificationColor(image.classification))}>
            <span className="text-lg">{getClassificationIcon(image.classification)}</span>
          </div>
          <div>
            <h4 className="font-space font-semibold text-white">{image.id}</h4>
            <p className="text-xs text-neuronex-400">{image.mission_id} • Priority {image.priority} • {image.action?.toUpperCase()}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(image.status))}>
            {image.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-neuronex-300">Progress</span>
          <span className="font-medium text-white">{formatProgress(progress)}</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-neuronex-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neuronex-400 mt-1">
          <span>{segmentsConfirmed} / {totalSegments} segments</span>
          <span>{formatBytes((segmentsConfirmed / Math.max(totalSegments, 1)) * (image.file_path ? 100000 : 0))} transmitted</span>
        </div>
      </div>

      {/* Signal Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
        <MetricCard
          label="RSSI"
          value={rssi !== null ? `${rssi} dBm` : '—'}
          icon={<Signal className="w-4 h-4" />}
          qualityClass={getSignalQualityClass(rssi)}
        />
        <MetricCard
          label="SNR"
          value={snr !== null ? `${snr.toFixed(1)} dB` : '—'}
          icon={<Database className="w-4 h-4" />}
          qualityClass={getSnrQualityClass(snr)}
        />
        <MetricCard
          label="Throughput"
          value={throughput !== null ? formatBps(throughput) : '—'}
          icon={<Send className="w-4 h-4" />}
          qualityClass="text-neuronex-400"
        />
      </div>
    </div>
  );
}

function QueuedImageRow({ image, position }: { image: any; position: number }) {
  return (
    <div className="px-6 py-3 hover:bg-white/5 transition-colors flex items-center gap-4">
      <span className="w-6 text-center text-neuronex-400 font-medium">#{position}</span>
      <div className={cn('w-8 h-8 rounded flex items-center justify-center flex-shrink-0', getClassificationColor(image.classification))}>
        <span className="text-sm">{getClassificationIcon(image.classification)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{image.id}</p>
        <p className="text-xs text-neuronex-400">{image.mission_id} • {totalSegmentsLabel(image)}</p>
      </div>
      <div className="text-right">
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getActionColor(image.action))}>
          {image.action?.toUpperCase()}
        </span>
        <p className="text-xs text-neuronex-400 mt-0.5">P{image.priority}</p>
      </div>
    </div>
  );
}

function totalSegmentsLabel(image: any): string {
  if (!image.total_segments) return 'Unknown size';
  return `${image.total_segments} segments`;
}

function MetricCard({ label, value, icon, qualityClass }: { label: string; value: string; icon: React.ReactNode; qualityClass: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-neuronex-400 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn('font-mono font-semibold text-lg', qualityClass)}>{value}</p>
    </div>
  );
}

// Helper functions (inline to avoid import issues)
function getSignalQualityClass(rssi: number | null): string {
  if (rssi === null) return 'text-gray-400';
  if (rssi >= -70) return 'text-signal-excellent';
  if (rssi >= -85) return 'text-signal-good';
  if (rssi >= -100) return 'text-signal-fair';
  if (rssi >= -115) return 'text-signal-poor';
  return 'text-signal-critical';
}

function getSnrQualityClass(snr: number | null): string {
  if (snr === null) return 'text-gray-400';
  if (snr >= 10) return 'text-signal-excellent';
  if (snr >= 5) return 'text-signal-good';
  if (snr >= 0) return 'text-signal-fair';
  if (snr >= -5) return 'text-signal-poor';
  return 'text-signal-critical';
}

function getActionColor(action: string | null): string {
  switch (action) {
    case 'keep': return 'bg-green-500/20 text-green-400';
    case 'defer': return 'bg-yellow-500/20 text-yellow-400';
    case 'discard': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}