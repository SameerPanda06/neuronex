// OrbitWindows — 12-rev/day schedule visualization with revolution timeline
import React, { useMemo } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useRevolutions } from '../hooks/useRevolutions';
import { cn } from '../utils/format';
import {
  Calendar, Clock, RotateCcw, Send, CheckCircle,
  ChevronLeft, ChevronRight, MapPin, Radio, Zap
} from 'lucide-react';

export default function OrbitWindows() {
  const {
    revsPerDay,
    intervalHours,
    windowMinutes,
    currentRevolution,
    windowActive,
    isInWindow,
    downlinkCountdown,
    nextRevCountdown,
    progressPercent,
    phase,
    windowStart,
    windowEnd,
    nextRevStart,
  } = useSchedule();

  const { revolutions, loading } = useRevolutions({ limit: 24 });

  // Today's revolution schedule (12 per day, 2hr intervals)
  const schedule = useMemo(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    const revs = [];
    for (let i = 0; i < revsPerDay; i++) {
      const windowStartTime = new Date(midnight);
      windowStartTime.setHours(i * intervalHours);

      const windowEndTime = new Date(windowStartTime);
      windowEndTime.setMinutes(windowEndTime.getMinutes() + windowMinutes);

      revs.push({
        number: i + 1,
        windowStart: windowStartTime,
        windowEnd: windowEndTime,
        status: i + 1 < currentRevolution ? 'completed' :
                i + 1 === currentRevolution ? (isInWindow ? 'active' : 'pending') :
                'scheduled',
      });
    }
    return revs;
  }, [revsPerDay, intervalHours, windowMinutes, currentRevolution, isInWindow]);

  // Historical revolutions from backend
  const historicalRevolutions = useMemo(() => {
    if (!revolutions) return [];
    return revolutions.map((r: any) => ({
      number: r.number,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      imagesTransmitted: r.images_transmitted,
      imagesTotal: r.images_total,
    }));
  }, [revolutions]);

  return (
    <div className="space-y-6">
      {/* Schedule Overview */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-space font-bold text-xl text-white">Orbit Windows Schedule</h2>
              <p className="text-neuronex-400 text-sm">
                {revsPerDay} revolutions/day • {intervalHours}h interval • {windowMinutes}min downlink window
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            {isInWindow ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}">
            <span className={`w-2 h-2 rounded-full ${isInWindow ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            {isInWindow ? 'WINDOW OPEN' : 'WINDOW CLOSED'}
          </div>
        </div>

        {/* Today's Schedule Timeline */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {schedule.map((rev, idx) => (
            <RevolutionTimelineItem
              key={rev.number}
              rev={rev}
              isCurrent={rev.number === currentRevolution}
              isActive={isInWindow && rev.number === currentRevolution}
              downlinkCountdown={rev.number === currentRevolution ? downlinkCountdown : null}
              nextRevCountdown={rev.number === currentRevolution ? nextRevCountdown : null}
            />
          ))}
        </div>
      </div>

      {/* Revolution History */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-lg text-white mb-4 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-neuronex-400" />
          Revolution History
        </h3>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-white/5 rounded" />
            ))}
          </div>
        ) : historicalRevolutions.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {historicalRevolutions.slice(0, 20).map((rev: any) => (
              <HistoricalRevolutionItem key={rev.number} rev={rev} />
            ))}
          </div>
        ) : (
          <p className="text-neuronex-400 text-sm py-4 text-center">No historical data yet</p>
        )}
      </div>
    </div>
  );
}

function RevolutionTimelineItem({
  rev,
  isCurrent,
  isActive,
  downlinkCountdown,
  nextRevCountdown,
}: {
  rev: { number: number; windowStart: Date; windowEnd: Date; status: string };
  isCurrent: boolean;
  isActive: boolean;
  downlinkCountdown: string | null;
  nextRevCountdown: string | null;
}) {
  const statusColors = {
    completed: 'bg-green-500/20 border-green-500/30 text-green-400',
    active: 'bg-green-500/20 border-green-500/30 text-green-400',
    pending: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    scheduled: 'bg-space-800 border-white/10 text-neuronex-400',
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn(
      'flex items-center gap-4 p-3 rounded-lg border transition-all',
      statusColors[rev.status as keyof typeof statusColors] || statusColors.scheduled
    )}>
      {/* Status indicator */}
      <div className="flex-shrink-0 w-12 flex flex-col items-center">
        <div className={cn(
          'w-3 h-3 rounded-full',
          rev.status === 'completed' ? 'bg-green-400' :
          rev.status === 'active' ? 'bg-green-400 animate-pulse' :
          rev.status === 'pending' ? 'bg-amber-400' :
          'bg-neuronex-400'
        )} />
        <span className="text-xs font-mono text-white mt-1">#{rev.number}</span>
      </div>

      {/* Time range */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-white">
            {formatTime(rev.windowStart)} — {formatTime(rev.windowEnd)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full
            {rev.status === 'completed' ? 'bg-green-500/20 text-green-400' :
             rev.status === 'active' ? 'bg-green-500/20 text-green-400' :
             rev.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
             'bg-neuronex-400/20 text-neuronex-400'}">
            {rev.status.toUpperCase()}
          </span>
        </div>
        <div className="h-1.5 bg-space-800 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
            style={{ width: rev.status === 'completed' ? '100%' :
                        rev.status === 'active' ? `${isActive ? 100 - parseInt(downlinkCountdown?.split(':')[1] || '0') / (windowMinutes || 3) * 100 : 0}%` :
                        '0%' }} />
        </div>
      </div>

      {/* Countdown for current revolution */}
      {isCurrent && downlinkCountdown && (
        <div className="text-right min-w-[80px]">
          <p className="font-mono font-bold text-lg text-white">{downlinkCountdown}</p>
          <p className="text-neuronex-400 text-xs">{isActive ? 'remaining' : 'until window'}</p>
        </div>
      )}

      {/* Future revolution - show next window time */}
      {!isCurrent && rev.status === 'scheduled' && (
        <div className="text-right min-w-[80px]">
          <p className="font-mono text-sm text-neuronex-300">{formatTime(rev.windowStart)}</p>
          <p className="text-neuronex-400 text-xs">window opens</p>
        </div>
      )}
    </div>
  );
}

function HistoricalRevolutionItem({ rev }: { rev: any }) {
  const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleString() : '—';

  return (
    <div className="flex items-center justify-between p-3 bg-space-800/50 rounded-lg border border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-white font-medium">Revolution #{rev.number}</p>
          <p className="text-neuronex-400 text-xs">
            Started: {formatDate(rev.startedAt)} • Completed: {formatDate(rev.completedAt)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-white">{rev.imagesTransmitted}/{rev.imagesTotal}</p>
        <p className="text-neuronex-400 text-xs">images transmitted</p>
      </div>
    </div>
  );
}