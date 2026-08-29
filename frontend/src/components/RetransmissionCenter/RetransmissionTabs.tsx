import { cn } from '../../utils/format';

export type RetransmissionFilter = 'all' | 'pending' | 'acknowledged' | 'completed';

interface RetransmissionTabsProps {
  selected: RetransmissionFilter;
  onChange: (tab: RetransmissionFilter) => void;
  counts: {
    all: number;
    pending: number;
    acknowledged: number;
    completed: number;
  };
}

export function RetransmissionTabs({
  selected,
  onChange,
  counts,
}: RetransmissionTabsProps) {
  const tabs: { id: RetransmissionFilter; label: string; count: number }[] = [
    { id: 'all', label: 'ALL REQUESTS', count: counts.all },
    { id: 'pending', label: 'PENDING', count: counts.pending },
    { id: 'acknowledged', label: 'IN PROGRESS', count: counts.acknowledged },
    { id: 'completed', label: 'COMPLETED', count: counts.completed },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-[#070D1C] rounded-lg border border-slate-800/90 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = selected === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150 whitespace-nowrap',
              isActive
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                isActive
                  ? 'bg-cyan-500/30 text-cyan-200'
                  : 'bg-slate-800 text-slate-400'
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
