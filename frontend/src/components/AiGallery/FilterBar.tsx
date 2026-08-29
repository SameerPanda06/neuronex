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
    { id: 'CLEAR', label: 'Clear (P1)', count: counts.CLEAR },
    { id: 'CLOUDY', label: 'Cloudy (P2)', count: counts.CLOUDY },
    { id: 'NOT_VISIBLE', label: 'Not Visible', count: counts.NOT_VISIBLE },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#080E1E] p-2.5 rounded-md border border-[#131E35]">
      {/* Classification Filter Tabs */}
      <div className="flex items-center gap-1 flex-wrap overflow-x-auto pb-1 lg:pb-0">
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#050810] border border-transparent font-normal'
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`text-[10px] font-mono tabular-nums px-1 py-0.2 rounded ${
                  isActive ? 'bg-cyan-950 text-cyan-200 border border-cyan-800/40' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Sort, and View Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search frame ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 bg-[#050810] border border-[#131E35] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1 bg-[#050810] border border-[#131E35] rounded px-2 py-1">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            <option value="priority" className="bg-[#080E1E] text-white">Priority</option>
            <option value="confidence" className="bg-[#080E1E] text-white">Confidence</option>
            <option value="created_at" className="bg-[#080E1E] text-white">Recent</option>
            <option value="oldest" className="bg-[#080E1E] text-white">Oldest</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-[#050810] border border-[#131E35] rounded p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="Grid View"
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'list' ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title="List View"
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
