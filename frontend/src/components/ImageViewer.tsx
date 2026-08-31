// Image Viewer - Full-resolution image display with metadata - TypeScript
import React, { useState, useEffect } from 'react';
import { useImage } from '../hooks/useImages';
import { imagesApi } from '../services/api';
import { cn, formatBytes, formatDate, formatBps, getClassificationColor, getClassificationIcon, getStatusColor } from '../utils/format';
import { X, Download, Expand, RotateCcw, Info, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  imageId: string;
  onClose: () => void;
}

export function ImageViewer({ imageId, onClose }: ImageViewerProps) {
  const { image, loading, error } = useImage(imageId);
  const [zoom, setZoom] = useState(1);
  const [showMetadata, setShowMetadata] = useState(true);

  if (!imageId) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') setZoom(Math.max(0.5, zoom - 0.25));
    if (e.key === 'ArrowRight') setZoom(Math.min(3, zoom + 0.25));
  };

  useEffect(() => {
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

  const handleDownload = async () => {
    try {
      const res = await imagesApi.download(imageId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${imageId}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div>
            <p className="font-space font-bold text-white">{image.id}</p>
            <p className="text-neuronex-400 text-sm">{image.mission_id}</p>
          </div>
          <span className={cn('px-2 py-0.5 text-xs rounded-full', getClassificationColor(image.classification))}>
            {getClassificationIcon(image.classification)} {image.classification}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Download">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => setZoom(1)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Reset Zoom">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={() => setShowMetadata(!showMetadata)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Toggle Metadata">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
          <img
            src={`/api/images/${imageId}/download`}
            alt={image.id}
            className="max-w-full max-h-[70vh] object-contain"
            style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4">
        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-2 rounded-lg hover:bg-white/10">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-mono text-sm">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-2 rounded-lg hover:bg-white/10">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Metadata Panel */}
      {showMetadata && (
        <div className="p-4 border-t border-white/10 bg-space-900/80 w-full max-h-[40vh] overflow-y-auto">
          <h3 className="font-space font-semibold text-white mb-4">Image Metadata</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetadataItem label="Mission ID" value={image.mission_id} />
            <MetadataItem label="Classification" value={image.classification || '—'} />
            <MetadataItem label="Confidence" value={image.confidence ? `${(image.confidence * 100).toFixed(1)}%` : '—'} />
            <MetadataItem label="Action" value={image.action || '—'} />
            <MetadataItem label="Priority" value={`P${image.priority}`} />
            <MetadataItem label="JPEG Quality" value={image.jpeg_quality ? `q${image.jpeg_quality}` : '—'} />
            <MetadataItem label="Status" value={<span className={cn('px-2 py-0.5 rounded text-xs', getStatusColor(image.status))}>{image.status?.toUpperCase()}</span>} />
            <MetadataItem label="Progress" value={`${(image.progress_percent || 0).toFixed(1)}%`} />
            <MetadataItem label="Segments" value={`${image.segments_confirmed}/${image.total_segments || '—'}`} />
            <MetadataItem label="Chunk Size" value={image.chunk_size ? `${image.chunk_size}B` : '—'} />
            <MetadataItem label="RSSI" value={image.rssi ? `${image.rssi} dBm` : '—'} />
            <MetadataItem label="SNR" value={image.snr ? `${image.snr} dB` : '—'} />
            <MetadataItem label="Throughput" value={image.throughput_bps ? formatBps(image.throughput_bps) : '—'} />
            <MetadataItem label="Created" value={formatDate(image.created_at)} />
            <MetadataItem label="Updated" value={formatDate(image.updated_at)} />
            <MetadataItem label="Transmitted" value={formatDate(image.transmitted_at)} />
            <MetadataItem label="Completed" value={formatDate(image.completed_at)} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="bg-space-800/50 rounded-lg p-3">
      <p className="text-neuronex-400 text-xs">{label}</p>
      <p className="text-white text-sm font-mono">{value}</p>
    </div>
  );
}

