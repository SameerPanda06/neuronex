import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useImagesStats } from '../../hooks/useImages';

const COLORS = {
  CLEAR: '#06b6d4',      // Cyan (Clear - Kept)
  CLOUDY: '#3b82f6',     // Blue (Cloudy - Kept)
  NOT_VISIBLE: '#334155' // Dark Slate (Not Visible - Discarded)
};

export function AiOptimizationCard() {
  const { stats } = useImagesStats();

  const clearCount = stats?.by_classification?.CLEAR ?? 0;
  const cloudyCount = stats?.by_classification?.CLOUDY ?? 0;
  const notVisibleCount = stats?.by_classification?.NOT_VISIBLE ?? 0;
  const discardCount = stats?.by_action?.discard ?? 0;

  const total = clearCount + cloudyCount + notVisibleCount;
  const clearPct = total > 0 ? Math.round((clearCount / total) * 100) : 0;
  const cloudyPct = total > 0 ? Math.round((cloudyCount / total) * 100) : 0;
  const notVisiblePct = total > 0 ? Math.round((notVisibleCount / total) * 100) : 0;
  const discardRate = total > 0 ? Math.round((discardCount / total) * 100) : null;

  const data = [
    { name: 'Clear', value: clearCount, color: COLORS.CLEAR },
    { name: 'Cloudy', value: cloudyCount, color: COLORS.CLOUDY },
    { name: 'Not Visible', value: notVisibleCount, color: COLORS.NOT_VISIBLE },
  ];

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
        AI Downlink Optimization
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center flex-1">
        {/* Donut Chart with Data Avoided */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center relative min-h-[140px]">
          <div className="w-full h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#0B132B"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-1">
            <div className="text-[11px] font-medium text-slate-400">Discard Rate</div>
            <div className="text-sm font-bold font-mono text-emerald-400">{discardRate === null ? '—' : `${discardRate}%`}</div>
          </div>
        </div>

        {/* Legend / Breakdown */}
        <div className="sm:col-span-7 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
              <span className="text-slate-300 font-sans text-xs">Clear</span>
            </div>
            <span className="text-slate-200 font-semibold">{clearCount} ({clearPct}%)</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              <span className="text-slate-300 font-sans text-xs">Cloudy</span>
            </div>
            <span className="text-slate-200 font-semibold">{cloudyCount} ({cloudyPct}%)</span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-slate-400 font-sans text-xs">Not Visible</span>
            </div>
            <span className="text-slate-400 font-semibold">{notVisibleCount} ({notVisiblePct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
