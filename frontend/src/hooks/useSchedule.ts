// Schedule Hook - TypeScript
import { useState, useEffect, useCallback } from 'react';
import { scheduleApi } from '../services/api';
import { socketService } from '../services/socket';
import type { ScheduleState } from '../types';

export function useSchedule() {
  const [state, setState] = useState<ScheduleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await scheduleApi.state();
      setState(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time schedule updates from backend (1 Hz)
  useEffect(() => {
    const unsubscribe = socketService.on('schedule:update', (event: ScheduleState) => {
      setState(event);
    });
    return () => unsubscribe();
  }, []);

  // Helper formatters
  const formatCountdown = (seconds: number) => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    state,
    loading,
    error,
    refetch: fetch,
    // Computed
    isInWindow: state?.is_in_window ?? false,
    windowActive: state?.window_active ?? false,
    currentRevolution: state?.current_revolution ?? 1,
    totalRevsToday: state?.total_revs_today ?? 12,
    downlinkCountdown: state ? formatCountdown(state.seconds_until_window) : '--:--',
    nextRevCountdown: state ? formatCountdown(state.seconds_until_next_rev) : '--:--:--',
    progressPercent: state?.progress_percent ?? 0,
    phase: state?.phase ?? 'orbit',
    windowStart: state?.window_start_utc,
    windowEnd: state?.window_end_utc,
    nextRevStart: state?.next_rev_utc,
    revsPerDay: state?.revs_per_day ?? 12,
    intervalHours: state?.interval_hours ?? 2,
    windowMinutes: state?.window_minutes ?? 3,
  };
}

export function useScheduleConfig() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    scheduleApi.config().then(res => setConfig(res.data)).catch(() => {});
  }, []);

  return { config, loading: !config };
}