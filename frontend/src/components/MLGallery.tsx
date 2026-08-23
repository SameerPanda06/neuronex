// ML Gallery - Filterable classification grid
import React, { useState } from 'react';
import { useImages } from '../hooks/useImages';
import { useImagesStats } from '../hooks/useImages';
import { cn, formatBytes, formatDate, getClassificationColor, getClassificationIcon, getActionColor } from '../utils/format';
import { Filter, Search, Eye, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export function MLGallery() {
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'created_at' | 'confidence'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { images, total, loading, refetch } = useImages({
    classification: classificationFilter === 'all' ? undefined : classificationFilter,
    sort: sortBy,
    order: sortOrder,
    limit: 100,
  });
  const { stats } = useImagesStats();

  const filteredImages = images.filter(img =>
    img.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.mission_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const classificationCounts = {
    CLEAR: stats?.by_classification?.CLEAR || 0,
    CLOUDY: stats?.by_classification?.CLOUDY || 0,
    NOT_VISIBLE: stats?.by_classification?.NOT_VISIBLE || 0,
    UNKNOWN: stats?.by_classification?.UNKNOWN || 0,
  };

  return (
    <section id="ml-gallery" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-space font-bold text-2xl text-white">ML Classification Gallery</h2>
          <p className="text-neuronex-400 text-sm">All {total} images classified by edge AI on Pi 3B+</p>
        </div>

        {/* Classification Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'CLEAR', 'CLOUDY', 'NOT_VISIBLE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setClassificationFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                classificationFilter === filter
                  ? 'bg-neuronex-500 text-white shadow-lg shadow-neuronex-500/25'
                  : 'bg-white/5 text-neuronex-300 hover:bg-white/10'
              )}
            >
              {filter === 'all' ? 'All' : filter} ({classificationCounts[filter as keyof typeof classificationCounts] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neuronex-500" />
          <input
            type="text"
            placeholder="Search by ID or mission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-space-900 border border-white/10 rounded-lg text-white placeholder-neuronex-500 focus:outline-none focus:border-neuronex-500 focus:ring-1 focus:ring-neuronex-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-space-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-neuronex-500"
          >
            <option value="priority">Sort: Priority</option>
            <option value="created_at">Sort: Date</option>
            <option value="confidence">Sort: Confidence</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-space-900 border border-white/10 rounded-lg text-neuronex-400 hover:text-white hover:border-white/20 transition-colors"
            title={sortOrder === 'asc' ? 'Descending' : 'Ascending'}
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Clear" value={classificationCounts.CLEAR} color="green" icon="☀️" />
        <StatCard label="Cloudy" value={classificationCounts.CLOUDY} color="yellow" icon="☁️" />
        <StatCard label="Not Visible" value={classificationCounts.NOT_VISIBLE} color="red" icon="🌫️" />
        <StatCard label="Total" value={total} color="blue" icon="📸" />
      </div>

      {/* Image Grid */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <ImageCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="p-12 text-center text-neuronex-500">
            <Filter className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No images match your filters</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const colorMap = {
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  };

  return (
    <div className={cn('p-4 rounded-xl border', colorMap[color as keyof typeof colorMap])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neuronex-400">{label}</p>
          <p className="font-space font-bold text-2xl">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function ImageCard({ image }: { image: any }) {
  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:border-neuronex-500/30 transition-all group">
      {/* Image Preview Placeholder */}
      <div className="aspect-video bg-gradient-to-br from-space-900 to-space-950 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-20 group-hover:opacity-40 transition-opacity">{getClassificationIcon(image.classification)}</span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getClassificationColor(image.classification))}>
            {image.classification || 'UNKNOWN'}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex justify-between">
          <span className={cn('px-2 py-1 rounded text-xs font-medium bg-black/50', getActionColor(image.action))}>
            {image.action?.toUpperCase()}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-black/50 text-neuronex-400">
            P{image.priority}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-space font-semibold text-white truncate">{image.id}</h4>
          <span className="text-xs text-neuronex-500">{image.mission_id}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/5 rounded p-2">
            <p className="text-neuronex-400">Confidence</p>
            <p className="font-mono font-medium text-white">{image.confidence ? (image.confidence * 100).toFixed(1) + '%' : '—'}</p>
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-neuronex-400">Segments</p>
            <p className="font-mono font-medium text-white">{image.total_segments || '—'}</p>
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-neuronex-400">Quality</p>
            <p className="font-mono font-medium text-white">{image.jpeg_quality ? `Q${image.jpeg_quality}` : '—'}</p>
          </div>
          <div className="bg-white/5 rounded p-2">
            <p className="text-neuronex-400">Status</p>
            <p className="font-mono font-medium text-white capitalize">{image.status}</p>
          </div>
        </div>

        {image.classified_at && (
          <p className="text-xs text-neuronex-500">Classified: {formatDate(image.classified_at)}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button className="flex-1 py-1.5 px-2 text-xs font-medium text-neuronex-300 hover:text-white transition-colors flex items-center justify-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button className="flex-1 py-1.5 px-2 text-xs font-medium text-neuronex-300 hover:text-white transition-colors flex items-center justify-center gap-1">
            <Download className="w-3.5 h-3.5" />
            DL
          </button>
          {image.action !== 'discard' && (
            <button className="px-2 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors" title="Discard">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gradient-to-br from-space-900 to-space-950" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
        <div className="h-6 bg-white/10 rounded" />
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-white/5 rounded" />
          <div className="flex-1 h-8 bg-white/5 rounded" />
          <div className="w-8 h-8 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}