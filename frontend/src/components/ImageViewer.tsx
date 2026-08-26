// Image Viewer - Full-resolution image display with metadata
import React, { useState } from 'react';
import { useImage } from '../hooks/useImages';
import { cn, formatBytes, formatDate, getClassificationColor, getClassificationIcon, getStatusColor, getActionColor } from '../utils/format';
import { X, Download, Expand, RotateCcw, Info, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  imageId: string | null;
  onClose: () => void;
}

export function ImageViewer({ imageId, onClose }: ImageViewerProps) {
  const { image, loading, error } = useImage(imageId);
  const [zoom, setZoom] = useState(1);
  const [showMetadata, setShowMetadata] = useState(true);

  if (!imageId) return null;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') setZoom(Math.max(0.5, zoom - 0.25));
    if (e.key === 'ArrowRight') setZoom(Math.min(3, zoom + 0.25));
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neuronex-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-center p-8">
          <p className="text-red-400">Failed to load image</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onKeyDown={(e) => handleKeyDown(e.nativeEvent)}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
          <div>
            <h2 className="font-space font-bold text-xl text-white">{image.id}</h2>
            <p className="text-sm text-neuronex-400">{image.mission_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getStatusColor(image.status))}>
            {image.status.toUpperCase()}
          </span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getClassificationColor(image.classification))}>
            {getClassificationIcon(image.classification)} {image.classification}
          </span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getActionColor(image.action))}>
            {image.action?.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Image Area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
          {/* Image placeholder - in production this would be the actual JPEG */}
          <div
            className="bg-gradient-to-br from-space-900 via-space-950 to-space-900 rounded-lg border border-white/10 min-w-[400px] min-h-[300px] flex items-center justify-center"
            style={{ width: image.total_segments ? Math.max(400, image.total_segments * 2) : 640, height: 480 }}
          >
            <div className="text-center">
              <span className="text-8xl opacity-30">{getClassificationIcon(image.classification)}</span>
              <p className="mt-4 text-neuronex-400">JPEG Preview</p>
              <p className="text-xs text-neuronex-500">{image.total_segments || '?'} segments • {image.jpeg_quality ? `Q${image.jpeg_quality}` : 'Unknown quality'}</p>
            </div>
          </div>

          {/* Zoom Controls Overlay */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 rounded-lg p-2 backdrop-blur">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1.5 bg-white/10 rounded hover:bg-white/20">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 bg-white/10 rounded text-sm font-mono text-white min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1.5 bg-white/10 rounded hover:bg-white/20">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(1)} className="p-1.5 bg-white/10 rounded hover:bg-white/20 ml-1" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Panel */}
      {showMetadata && (
        <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-space font-semibold text-white flex items-center gap-2">
                <Info className="w-5 h-5" />
                Image Metadata
              </h3>
              <button
                onClick={() => setShowMetadata(false)}
                className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-neuronex-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetadataField label="Image ID" value={image.id} />
              <MetadataField label="Mission" value={image.mission_id} />
              <MetadataField label="Classification" value={
                <span className={cn('flex items-center gap-1', getClassificationColor(image.classification))}>
                  {getClassificationIcon(image.classification)} {image.classification}
                </span>
              } />
              <MetadataField label="Action" value={
                <span className={cn('font-medium', getActionColor(image.action))}>
                  {image.action?.toUpperCase()}
                </span>
              } />

              <MetadataField label="Priority" value={`P${image.priority}`} />
              <MetadataField label="JPEG Quality" value={image.jpeg_quality ? `Q${image.jpeg_quality}` : '—'} />
              <MetadataField label="Total Segments" value={image.total_segments?.toString() || '—'} />
              <MetadataField label="Confirmed" value={image.segments_confirmed.toString()} />

              <MetadataField label="Progress" value={`${(image.progress_percent || 0).toFixed(1)}%`} />
              <MetadataField label="Chunk Size" value={image.chunk_size ? `${image.chunk_size} B` : '—'} />
              <MetadataField label="RSSI" value={image.rssi !== null ? `${image.rssi} dBm` : '—'} />
              <MetadataField label="SNR" value={image.snr !== null ? `${image.snr.toFixed(1)} dB` : '—'} />

              <MetadataField label="Confidence" value={image.confidence ? `${(image.confidence * 100).toFixed(1)}%` : '—'} />
              <MetadataField label="ML Latency" value={image.latency_ms ? `${image.latency_ms.toFixed(0)} ms` : '—'} />
              <MetadataField label="Throughput" value={image.throughput_bps ? formatBytes(image.throughput_bps) + '/s' : '—'} />
              <MetadataField label="TX Latency" value={image.latency_ms_tx ? `${image.latency_ms_tx.toFixed(0)} ms` : '—'} />

              <MetadataField label="Created" value={formatDate(image.created_at)} fullWidth />
              <MetadataField label="Classified" value={formatDate(image.classified_at)} fullWidth />
              <MetadataField label="Transmitted" value={formatDate(image.transmitted_at)} fullWidth />
              <MetadataField label="Completed" value={formatDate(image.completed_at)} fullWidth />
            </div>

            {image.all_probabilities && (
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="font-medium text-white mb-3">Class Probabilities</h4>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(image.all_probabilities).map(([cls, prob]) => (
                    <div key={cls} className="text-center">
                      <p className="text-xs text-neuronex-400 mb-1">{cls}</p>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(prob * 100).toFixed(1)}%`,
                            backgroundColor: cls === 'CLEAR' ? '#22c55e' : cls === 'CLOUDY' ? '#eab308' : '#ef4444'
                          }}
                        />
                      </div>
                      <p className="font-space font-bold text-lg mt-1">{(prob * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <footer className="p-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm">
            <Download className="w-4 h-4" />
            Download JPEG
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="flex items-center gap-2 px-4 py-2 bg-neuronex-500/20 text-neuronex-400 rounded-lg hover:bg-neuronex-500/30 transition-colors text-sm"
          >
            {showMetadata ? <Info className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            {showMetadata ? 'Hide Metadata' : 'Show Metadata'}
          </button>
        </div>
      </footer>
    </div>
  );
}

function MetadataField({ label, value, fullWidth = false }: { label: string; value: React.ReactNode | string; fullWidth?: boolean }) {
  return (
    <div className={cn('p-3 bg-white/5 rounded-lg border border-white/10', fullWidth && 'md:col-span-2 lg:col-span-4')}>
      <p className="text-xs text-neuronex-400 mb-1">{label}</p>
      <p className="font-mono text-white">{value}</p>
    </div>
  );
}