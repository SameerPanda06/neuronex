import { cn } from '../../utils/format';

export type TimeRange = 'LIVE' | '1H' | '6H' | '24H' | '7D';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  const ranges: { id: TimeRange; label: string }[] = [
    { id: 'LIVE', label: 'LIVE' },
    { id: '1H', label: '1H' },
    { id: '6H', label: '6H' },
    { id: '24H', label: '24H' },
    { id: '7D', label: '7D' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-[#080E1E] rounded-md border border-[#131E35]">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2">Range:</span>
      {ranges.map((r) => {
        const isActive = selected === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={cn(
              'px-2.5 py-0.5 rounded text-xs transition-colors relative font-medium',
              isActive
                ? 'bg-[#0E1B38] text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#050810] border border-transparent'
            )}
          >
            {r.id === 'LIVE' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5 animate-pulse" />
            )}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
