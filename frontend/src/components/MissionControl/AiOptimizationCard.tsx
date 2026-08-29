import { useImagesStats } from '../../hooks/useImages';
import { ArrowUpRight, Zap } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface AiOptimizationCardProps {
  onNavigate?: () => void;
}

export function AiOptimizationCard({ onNavigate }: AiOptimizationCardProps) {
  const { stats } = useImagesStats();

  const clearCount = stats?.by_classification?.CLEAR ?? 0;
  const cloudyCount = stats?.by_classification?.CLOUDY ?? 0;
  const notVisibleCount = stats?.by_classification?.NOT_VISIBLE ?? 0;
  const totalCount = stats?.total ?? 0;
  const discardCount = stats?.by_action?.discard ?? 0;

  // Calculate percentage of bandwidth saved
  const dataAvoidedPct = totalCount > 0 ? Math.round((discardCount / totalCount) * 100) : 0;

  // Data for Donut Chart
  const pieData = [
    { name: 'Clear (P1)', value: clearCount, color: '#10b981' },
    { name: 'Cloudy (P2)', value: cloudyCount, color: '#38bdf8' },
    { name: 'Discarded', value: notVisibleCount, color: '#475569' },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-[#080E1E] rounded-md border border-[#131E35] p-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#131E35]">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
              Edge-AI Inference Optimization
            </h3>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              className="text-slate-400 hover:text-cyan-300 transition-colors p-0.5"
              title="View full AI Gallery"
              aria-label="View full AI Gallery"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Donut Chart Canvas */}
          <div className="sm:col-span-5 relative h-28 flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-[10px] text-slate-500 font-mono">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070D1A',
                        borderColor: '#1E2E52',
                        borderRadius: '0.25rem',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                    />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="#080E1E"
                      strokeWidth={1.5}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center callout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold font-mono tabular-nums text-white">
                    {dataAvoidedPct}%
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">
                    Saved
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Breakdown Rows */}
          <div className="sm:col-span-7 space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-none bg-emerald-400" />
                <span className="text-slate-300 text-[11px]">Clear (P1 Kept)</span>
              </div>
              <span className="font-semibold font-mono tabular-nums text-white text-[11px]">{clearCount}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-none bg-cyan-400" />
                <span className="text-slate-300 text-[11px]">Cloudy (P2 Kept)</span>
              </div>
              <span className="font-semibold font-mono tabular-nums text-white text-[11px]">{cloudyCount}</span>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded bg-[#050810] border border-[#131E35]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-none bg-slate-500" />
                <span className="text-slate-400 text-[11px]">Discarded</span>
              </div>
              <span className="font-semibold font-mono tabular-nums text-slate-400 text-[11px]">{notVisibleCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 mt-2 border-t border-[#131E35] flex items-center justify-between text-[11px]">
        <span className="text-slate-400">MobileNetV2 Edge Classifier</span>
        <span className="text-cyan-300 font-mono tabular-nums">
          {totalCount} Total Ingested
        </span>
      </div>
    </div>
  );
}
