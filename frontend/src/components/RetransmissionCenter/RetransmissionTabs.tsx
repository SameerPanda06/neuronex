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
    { id: 'all', label: 'All Requests', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'acknowledged', label: 'In Progress', count: counts.acknowledged },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-[#080E1E] rounded-md border border-[#131E35] overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = selected === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap',
              isActive
                ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#050810] border border-transparent font-medium'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1 py-0.2 rounded text-[10px] font-mono tabular-nums font-semibold',
                isActive
                  ? 'bg-[#0D1830] text-cyan-200 border border-cyan-800/40'
                  : 'bg-slate-900 text-slate-400'
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
