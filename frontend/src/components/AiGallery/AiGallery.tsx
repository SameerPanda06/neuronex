import { useState, useEffect, useMemo } from 'react';
import { useImages, useImagesStats } from '../../hooks/useImages';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { useConnection } from '../../hooks/useConnection';
import { FilterBar, type ClassificationFilter, type SortOption } from './FilterBar';
import { ImageCard } from './ImageCard';
import { ImageDetailModal } from './ImageDetailModal';
import type { Image } from '../../types';
import { Filter, Layers, Database, Sparkles, Zap } from 'lucide-react';

interface AiGalleryProps {
  onNavigateTab?: (tab: string) => void;
}

export function AiGallery({ onNavigateTab }: AiGalleryProps) {
  const { connected, mode } = useConnection();
  const isMock = mode === 'mock';
  const { status: revStatus } = useRevolutionStatus();
  const { stats } = useImagesStats();

  const [activeFilter, setActiveFilter] = useState<ClassificationFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

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

  const { images, loading } = useImages({
    classification: activeFilter === 'ALL' ? undefined : activeFilter,
    sort: sortBy === 'oldest' ? 'created_at' : sortBy,
    order: sortBy === 'oldest' ? 'asc' : 'desc',
    limit: 100,
  });

  // Client-side search and filtering
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        img.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.mission_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [images, searchQuery]);

  const clearCount = stats?.by_classification?.CLEAR ?? 0;
  const cloudyCount = stats?.by_classification?.CLOUDY ?? 0;
  const notVisibleCount = stats?.by_classification?.NOT_VISIBLE ?? 0;
  const totalCount = stats?.total ?? 0;
  const discardCount = stats?.by_action?.discard ?? 0;

  const dataAvoidedPct =
    totalCount > 0 ? Math.round((discardCount / totalCount) * 100) : null;

  const counts = {
    ALL: totalCount,
    CLEAR: clearCount,
    CLOUDY: cloudyCount,
    NOT_VISIBLE: notVisibleCount,
  };

  const revNum = revStatus?.revolution?.revolution_num ?? null;

  return (
    <div className="space-y-5 pb-8">
      {/* Top Header matching reference */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl font-bold font-space text-white tracking-wide flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            <span>AI IMAGE GALLERY</span>
          </h1>
          <p className="text-xs font-mono text-cyan-400/90 mt-0.5">
            Edge-AI classified Earth observation frames
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isMock ? 'SIMULATION' : connected ? 'LIVE HARDWARE' : 'OFFLINE'}</span>
          </div>

          <div className="text-slate-300 font-medium hidden md:block">
            {revNum === null ? 'Revolution —' : `Revolution #${revNum}`}
          </div>

          <div className="text-cyan-300 font-bold bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
            {utcTime || '--:--:-- UTC'}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-[#0B132B]/80 border border-cyan-900/30 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Total Captured</span>
          </div>
          <div className="text-xl font-bold font-space text-white mt-1">{totalCount}</div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B]/80 border border-cyan-900/30 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Clear</span>
          </div>
          <div className="text-xl font-bold font-space text-emerald-400 mt-1">{clearCount}</div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B]/80 border border-cyan-900/30 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Cloudy</span>
          </div>
          <div className="text-xl font-bold font-space text-blue-400 mt-1">{cloudyCount}</div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B]/80 border border-cyan-900/30 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>Not Visible</span>
          </div>
          <div className="text-xl font-bold font-space text-rose-400 mt-1">{notVisibleCount}</div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B132B]/80 border border-cyan-900/30 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Discard Rate</span>
          </div>
          <div className="text-xl font-bold font-space text-emerald-400 mt-1">{dataAvoidedPct === null ? '—' : `${dataAvoidedPct}%`}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Image Gallery Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-[#0B132B]/60 rounded-xl border border-slate-800 p-4 h-64"
            />
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="bg-[#0B132B]/40 rounded-xl border border-slate-800/80 p-12 text-center my-6">
          <Filter className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            No Images Match This Filter
          </h3>
          <p className="text-xs font-mono text-slate-500 mt-1">
            {searchQuery ? `No frames matching "${searchQuery}"` : 'Try selecting another classification category'}
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-4 pt-2 ${
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1'
          }`}
        >
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onSelect={(img) => setSelectedImage(img)}
            />
          ))}
        </div>
      )}

      {/* Full Resolution Detail Modal */}
      <ImageDetailModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        onNavigateToTransmission={() => onNavigateTab?.('transmission')}
      />
    </div>
  );
}
