// Revolution Timeline - Calendar view of 3/day revolutions
import React from 'react';
import { useRevolutions, useRevolutionStats } from '../hooks/useRevolutions';
import { cn, formatDate } from '../utils/format';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';

export function RevolutionTimeline() {
  const [selectedMission, setSelectedMission] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'timeline' | 'calendar'>('timeline');

  const { revolutions, loading } = useRevolutions({ mission_id: selectedMission === 'all' ? undefined : selectedMission, limit: 50 });
  const { stats } = useRevolutionStats();

  // Get unique missions
  const missions = ['all', ...new Set(revolutions.map(r => r.mission_id))];

  // Group revolutions by date
  const revolutionsByDate = revolutions.reduce((acc, rev) => {
    const date = new Date(rev.window_start).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(rev);
    return acc;
  }, {} as Record<string, typeof revolutions>);

  return (
    <section id="revolutions" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-space font-bold text-2xl text-white">Revolution Timeline</h2>
          <p className="text-neuronex-400 text-sm">60-second downlink windows × 3 per day</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMission}
            onChange={(e) => setSelectedMission(e.target.value)}
            className="px-3 py-2 bg-space-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-neuronex-500"
          >
            {missions.map(m => (
              <option key={m} value={m}>{m === 'all' ? 'All Missions' : m}</option>
            ))}
          </select>

          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn('px-3 py-1.5 rounded text-sm font-medium transition-colors', viewMode === 'timeline' ? 'bg-neuronex-500 text-white' : 'text-neuronex-400 hover:text-white')}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn('px-3 py-1.5 rounded text-sm font-medium transition-colors', viewMode === 'calendar' ? 'bg-neuronex-500 text-white' : 'text-neuronex-400 hover:text-white')}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Revolutions" value={stats?.total_revolutions || 0} color="blue" icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Completed" value={stats?.completed || 0} color="green" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard label="Active" value={stats?.active || 0} color="yellow" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Success Rate" value={`${stats?.overall_success_rate || 0}%`} color="purple" icon={<Clock className="w-5 h-5" />} />
      </div>

      {/* View */}
      {viewMode === 'timeline' ? (
        <TimelineView revolutions={revolutions} loading={loading} />
      ) : (
        <CalendarView revolutionsByDate={revolutionsByDate} loading={loading} />
      )}
    </section>
  );
}

function TimelineView({ revolutions, loading }: { revolutions: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse bg-space-900/50 rounded-xl border border-white/10 p-6">
            <div className="h-4 w-1/4 bg-white/10 rounded mb-4" />
            <div className="h-8 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (revolutions.length === 0) {
    return (
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-12 text-center text-neuronex-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">No revolutions scheduled</p>
        <p className="text-sm mt-1">Revolutions will appear here as they're scheduled</p>
      </div>
    );
  }

  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
      <div className="divide-y divide-white/5">
        {revolutions.map((rev) => (
          <RevolutionTimelineRow key={rev.id} rev={rev} />
        ))}
      </div>
    </div>
  );
}

function RevolutionTimelineRow({ rev }: { rev: any }) {
  const isActive = rev.status === 'active';
  const isCompleted = rev.status === 'completed';
  const progress = rev.total_segments_planned > 0
    ? (rev.total_segments_confirmed / rev.total_segments_planned) * 100
    : 0;

  const statusConfig = {
    scheduled: { color: 'blue', bg: 'bg-blue-500/20 border-blue-500/30', icon: <Clock className="w-4 h-4" />, label: 'SCHEDULED' },
    active: { color: 'yellow', bg: 'bg-yellow-500/20 border-yellow-500/30 animate-pulse', icon: <AlertTriangle className="w-4 h-4" />, label: 'ACTIVE' },
    completed: { color: 'green', bg: 'bg-green-500/20 border-green-500/30', icon: <CheckCircle className="w-4 h-4" />, label: 'COMPLETED' },
  };

  const config = statusConfig[rev.status as keyof typeof statusConfig] || statusConfig.scheduled;

  return (
    <div className={cn('p-6 hover:bg-white/5 transition-colors relative', isActive && 'bg-yellow-500/5')}>
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 animate-pulse" />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Revolution Info */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex-shrink-0">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', config.bg)}>
              {config.icon}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-space font-bold text-lg text-white">Revolution #{rev.revolution_num}</h3>
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.bg)}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-neuronex-400">{rev.mission_id}</p>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex flex-col lg:items-center lg:flex-row gap-4 w-full lg:w-auto">
          <div className="text-center lg:text-left">
            <p className="text-xs text-neuronex-500">Window Start</p>
            <p className="font-mono text-white">{formatDate(rev.window_start)}</p>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-xs text-neuronex-500">Window End</p>
            <p className="font-mono text-white">{formatDate(rev.window_end)}</p>
          </div>
          <div className="text-center lg:text-left">
            <p className="text-xs text-neuronex-500">Duration</p>
            <p className="font-mono text-white">{rev.window_duration_sec}s</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex-1 lg:w-64">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neuronex-300">Segments</span>
            <span className="font-medium text-white">{rev.total_segments_confirmed} / {rev.total_segments_planned}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', isActive ? 'bg-yellow-500' : isCompleted ? 'bg-green-500' : 'bg-blue-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-neuronex-400 mt-1 text-right">{progress.toFixed(1)}% complete</p>
        </div>

        {/* Images Summary */}
        <div className="flex items-center gap-4 text-sm">
          {rev.images_completed && rev.images_completed.length > 0 && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              {rev.images_completed.length} done
            </span>
          )}
          {rev.images_failed && rev.images_failed.length > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3.5 h-3.5" />
              {rev.images_failed.length} failed
            </span>
          )}
          {rev.images_planned && (
            <span className="text-neuronex-400">
              {rev.images_planned.length} planned
            </span>
          )}
        </div>
      </div>

      {/* Expandable details */}
      <details className="mt-4 pt-4 border-t border-white/5">
        <summary className="flex items-center justify-between cursor-pointer text-neuronex-400 hover:text-white">
          <span className="flex items-center gap-2">
            <span>Planned Images</span>
            <span className="px-2 py-0.5 bg-white/10 rounded text-xs">{rev.images_planned?.length || 0}</span>
          </span>
          <ChevronDown className="w-4 h-4" />
        </summary>
        <div className="mt-3 p-3 bg-white/5 rounded-lg">
          {rev.images_planned && rev.images_planned.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {rev.images_planned.map((img: any) => (
                <span key={img.id} className="px-2 py-1 bg-white/10 rounded text-xs font-mono">
                  {img.id} (P{img.priority})
                </span>
              ))}
            </div>
          ) : (
            <p className="text-neuronex-500 text-sm">No images planned</p>
          )}
        </div>
      </details>
    </div>
  );
}

function CalendarView({ revolutionsByDate, loading }: { revolutionsByDate: Record<string, any[]>; loading: boolean }) {
  if (loading) {
    return <div className="grid grid-cols-7 gap-2 p-4">{[...Array(35)].map((_, i) => <div key={i} className="aspect-square animate-pulse bg-white/5 rounded" />)}</div>;
  }

  const today = new Date().toDateString();
  const dates = Object.keys(revolutionsByDate).sort();

  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
      <div className="grid grid-cols-7 gap-1 mb-4 text-center text-xs text-neuronex-400 font-medium">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dates.map((dateStr) => {
          const revs = revolutionsByDate[dateStr];
          const isToday = dateStr === today;
          const activeRev = revs.find(r => r.status === 'active');

          return (
            <div
              key={dateStr}
              className={cn(
                'aspect-square rounded-lg p-2 relative transition-colors',
                'hover:bg-white/5',
                isToday && 'ring-2 ring-neuronex-500',
                activeRev && 'ring-2 ring-yellow-500'
              )}
            >
              <div className={cn('text-sm font-medium', isToday ? 'text-neuronex-500' : 'text-white')}>
                {new Date(dateStr).getDate()}
              </div>

              {revs.map((rev) => (
                <div
                  key={rev.id}
                  className={cn(
                    'mt-1 px-1.5 py-0.5 rounded text-xs font-medium truncate',
                    rev.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
                    rev.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    'bg-blue-500/20 text-blue-400'
                  )}
                >
                  Rev #{rev.revolution_num}
                </div>
              ))}

              {isToday && <div className="absolute bottom-1 right-1 w-2 h-2 bg-neuronex-500 rounded-full" />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-neuronex-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full ring-2 ring-neuronex-500" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  const colorMap = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
  };

  return (
    <div className={cn('p-4 rounded-xl border', colorMap[color as keyof typeof colorMap])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neuronex-400">{label}</p>
          <p className="font-space font-bold text-2xl">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}