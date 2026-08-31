import { useState, useEffect, useMemo } from 'react';
import { useImages, useImagesStats } from '../../hooks/useImages';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { useConnection } from '../../hooks/useConnection';
import { FilterBar, type ClassificationFilter, type SortOption } from './FilterBar';
import { ImageCard } from './ImageCard';
import { ImageDetailModal } from './ImageDetailModal';
import type { Image } from '../../types';
import { Filter, Layers, Database, Sun, Cloud, EyeOff, Zap } from 'lucide-react';

interface AiGalleryProps {
  onNavigateTab?: (tab: string) => void;
}

export function AiGallery({ onNavigateTab }: AiGalleryProps) {
  const { connected, mode } = useConnection();
  const isMock = mode === 'mock';
  const isReplay = mode === 'replay';
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
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#131E35]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>AI Image Repository</span>
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0D1830] text-cyan-400 border border-cyan-500/30">
              Edge Inference
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Onboard MobileNetV2 classified Earth observation payload frames
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070D1A] border border-[#1E2E52] text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${isMock ? 'bg-cyan-400' : isReplay ? 'bg-amber-400' : connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-semibold uppercase tracking-wider">
              {isMock ? 'Simulation' : isReplay ? 'Mission Replay' : connected ? 'Live Hardware' : 'Offline'}
            </span>
          </div>

          <div className="text-slate-400 text-xs hidden md:block px-2.5 py-1 bg-[#070D1A] border border-[#131E35] rounded font-mono tabular-nums">
            {revNum === null ? 'Rev —' : `Rev #${revNum}`}
          </div>

          <div className="text-cyan-300 font-semibold bg-[#070D1A] px-2.5 py-1 rounded border border-[#131E35] font-mono tabular-nums">
            {utcTime || '--:--:-- UTC'}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-md bg-[#080E1E] border border-[#131E35] flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Total Frames</span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-white mt-1">{totalCount}</div>
        </div>

        <div className="p-3 rounded-md bg-[#080E1E] border border-[#131E35] flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1">
            <Sun className="w-3 h-3 text-emerald-400" />
            <span>Clear (P1 Kept)</span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-1">{clearCount}</div>
        </div>

        <div className="p-3 rounded-md bg-[#080E1E] border border-[#131E35] flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1">
            <Cloud className="w-3 h-3 text-blue-400" />
            <span>Cloudy (P2 Kept)</span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-blue-400 mt-1">{cloudyCount}</div>
        </div>

        <div className="p-3 rounded-md bg-[#080E1E] border border-[#131E35] flex flex-col justify-between">
          <div className="text-[9px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-slate-400" />
            <span>Not Visible (Discard)</span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-300 mt-1">{notVisibleCount}</div>
        </div>

        <div className="p-3 rounded-md bg-[#080E1E] border border-[#131E35] flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="text-[9px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Bandwidth Saved</span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-cyan-300 mt-1">{dataAvoidedPct === null ? '—' : `${dataAvoidedPct}%`}</div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 h-56 animate-pulse"
            />
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-10 text-center my-4">
          <Filter className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            No Frames Match Filter
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {searchQuery ? `No frames matching "${searchQuery}"` : 'Select another classification tab'}
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-3 pt-1 ${
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
