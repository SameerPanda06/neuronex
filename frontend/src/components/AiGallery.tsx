// AiGallery — ML Gallery with priority-based access for CLEAR, CLOUDY, NOT_VISIBLE
import React, { useState, useMemo } from 'react';
import { useImages } from '../hooks/useImages';
import { useCommand } from '../hooks/useCommand';
import { cn } from '../utils/format';
import {
  Sun, Cloud, EyeOff, Filter, Download,
  Search, ChevronLeft, ChevronRight, Image as ImageIcon
} from 'lucide-react';

type ImageFilter = 'all' | 'clear' | 'cloudy' | 'not_visible' | 'transmitting' | 'complete';

const FILTERS: { id: ImageFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'all', label: 'All', icon: <Filter className="w-4 h-4" />, color: 'blue' },
  { id: 'clear', label: 'CLEAR', icon: <Sun className="w-4 h-4" />, color: 'green' },
  { id: 'cloudy', label: 'CLOUDY', icon: <Cloud className="w-4 h-4" />, color: 'purple' },
  { id: 'not_visible', label: 'NOT_VISIBLE', icon: <EyeOff className="w-4 h-4" />, color: 'amber' },
  { id: 'transmitting', label: 'Transmitting', icon: <ImageIcon className="w-4 h-4" />, color: 'blue' },
  { id: 'complete', label: 'Complete', icon: <ImageIcon className="w-4 h-4" />, color: 'green' },
];

export default function AiGallery({ onImageSelect }: { onImageSelect: (id: string) => void }) {
  const { images, loading, total } = useImages({ limit: 100 });
  const { setPriority } = useCommand();

  const [activeFilter, setActiveFilter] = useState<ImageFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'classification'>('priority');

  const filteredImages = useMemo(() => {
    let result = images || [];

    // Filter by classification/status
    if (activeFilter !== 'all') {
      if (['clear', 'cloudy', 'not_visible'].includes(activeFilter)) {
        result = result.filter(img =>
          img.classification?.toLowerCase() === activeFilter.toUpperCase().replace('_', '_')
        );
      } else if (activeFilter === 'transmitting') {
        result = result.filter(img => img.status === 'transmitting');
      } else if (activeFilter === 'complete') {
        result = result.filter(img => img.status === 'complete');
      }
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(img =>
        img.id.toLowerCase().includes(q) ||
        img.mission_id.toLowerCase().includes(q) ||
        img.classification?.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'priority') return (a.priority || 99) - (b.priority || 99);
      if (sortBy === 'date') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'classification') return (a.classification || '').localeCompare(b.classification || '');
      return 0;
    });

    return result;
  }, [images, activeFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-space font-bold text-2xl text-white">AI Gallery</h2>
          <p className="text-neuronex-400 text-sm">
            {filteredImages.length} of {total || 0} images • Priority-based access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neuronex-400" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-space-800 border border-white/10 rounded-lg text-white text-sm placeholder-neuronex-400 focus:outline-none focus:border-neuronex-400"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-space-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-neuronex-400"
          >
            <option value="priority">Sort: Priority</option>
            <option value="date">Sort: Date</option>
            <option value="classification">Sort: Classification</option>
          </select>
        </div>
      </div>

      {/* Classification Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              activeFilter === filter.id
                ? `bg-${filter.color}-500/20 border border-${filter.color}-500/30 text-${filter.color}-400`
                : 'bg-space-800 border border-white/10 text-neuronex-400 hover:text-white hover:border-white/20'
            )}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Priority Access Notice */}
      {(activeFilter === 'cloudy' || activeFilter === 'not_visible') && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span>CLOUDY/NOT_VISIBLE images require <strong>Priority 2</strong> command from Mission Control</span>
          </div>
          <button
            onClick={() => setPriority(2)}
            className="mt-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-xs hover:bg-purple-500/30 transition-colors"
          >
            Request Priority 2 Access
          </button>
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <ImageCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredImages.map(img => (
            <ImageCard
              key={img.id}
              image={img}
              onClick={() => onImageSelect(img.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-space-900/50 rounded-xl border border-white/10 p-12 text-center">
          <Filter className="w-12 h-12 text-neuronex-400 mx-auto mb-3 opacity-50" />
          <p className="text-neuronex-400">No images match current filters</p>
        </div>
      )}
    </div>
  );
}

function ImageCard({ image, onClick }: { image: any; onClick: () => void }) {
  const getClassificationColor = (c: string | null) => {
    switch (c) {
      case 'CLEAR': return 'border-green-500/30 bg-green-500/10';
      case 'CLOUDY': return 'border-purple-500/30 bg-purple-500/10';
      case 'NOT_VISIBLE': return 'border-amber-500/30 bg-amber-500/10';
      default: return 'border-white/10 bg-space-800';
    }
  };

  const getPriorityBadge = (p: number) => {
    if (p === 1) return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">P1 CLEAR</span>;
    if (p === 2) return <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">P2 CLOUDY</span>;
    if (p === 3) return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">P3 NOT_VISIBLE</span>;
    return <span className="px-2 py-0.5 text-xs rounded-full bg-neuronex-500/20 text-neuronex-400">P{p}</span>;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-xl transition-all',
        getClassificationColor(image.classification)
      )}
    >
      {/* Image Preview / Placeholder */}
      <div className="aspect-square relative bg-space-900 overflow-hidden">
        {image.file_path && (
          <img
            src={`/api/images/${image.id}/download`}
            alt={image.id}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}
        {!image.file_path && (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-neuronex-400/50" />
          </div>
        )}

        {/* Classification Badge */}
        <div className="absolute top-2 left-2">
          <span className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            image.classification === 'CLEAR' ? 'bg-green-500/90 text-white' :
            image.classification === 'CLOUDY' ? 'bg-purple-500/90 text-white' :
            image.classification === 'NOT_VISIBLE' ? 'bg-amber-500/90 text-white' :
            'bg-neuronex-500/90 text-white'
          )}>
            {image.classification || 'UNKNOWN'}
          </span>
        </div>

        {/* Priority Badge */}
        <div className="absolute top-2 right-2">
          {getPriorityBadge(image.priority)}
        </div>

        {/* Status Overlay */}
        {image.status === 'transmitting' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-neuronex-400 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-sm font-medium">TRANSMITTING</p>
              <p className="text-neuronex-300 text-xs">{(image.progress_percent || 0).toFixed(0)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-white font-mono text-sm truncate">{image.id}</p>
          <span className="text-neuronex-400 text-xs">{image.mission_id}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-neuronex-400">
            {image.confidence ? `${(image.confidence * 100).toFixed(0)}%` : '—'}
          </span>
          <span className="text-neuronex-400">
            {image.status?.toUpperCase() || 'PENDING'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ImageCardSkeleton() {
  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden animate-pulse">
      <div className="aspect-square bg-white/5" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="h-3 w-1/2 bg-white/5 rounded" />
      </div>
    </div>
  );
}