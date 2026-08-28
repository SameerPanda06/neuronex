import { Search, ArrowUpDown, LayoutGrid, List } from 'lucide-react';

export type ClassificationFilter = 'ALL' | 'CLEAR' | 'CLOUDY' | 'NOT_VISIBLE';
export type SortOption = 'priority' | 'confidence' | 'created_at' | 'oldest';

interface FilterBarProps {
  activeFilter: ClassificationFilter;
  onFilterChange: (filter: ClassificationFilter) => void;
  counts: {
    ALL: number;
    CLEAR: number;
    CLOUDY: number;
    NOT_VISIBLE: number;
  };
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
}

export function FilterBar({
  activeFilter,
  onFilterChange,
  counts,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  const filterOptions: { id: ClassificationFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: counts.ALL },
    { id: 'CLEAR', label: 'Clear', count: counts.CLEAR },
    { id: 'CLOUDY', label: 'Cloudy', count: counts.CLOUDY },
    { id: 'NOT_VISIBLE', label: 'Not Visible', count: counts.NOT_VISIBLE },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0B132B]/60 p-3 rounded-xl border border-cyan-900/30 backdrop-blur-md">
      {/* Classification Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 lg:pb-0">
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-teal-500/20 text-cyan-300 border border-teal-500/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Sort, and View Controls */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search image ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            <option value="priority" className="bg-slate-900 text-white">Priority</option>
            <option value="confidence" className="bg-slate-900 text-white">Highest Confidence</option>
            <option value="created_at" className="bg-slate-900 text-white">Most Recent</option>
            <option value="oldest" className="bg-slate-900 text-white">Oldest</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
