// Revolution Hooks
import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../data';
import type {
  Revolution,
  RevolutionStats,
  RevolutionStatusResponse,
  RevolutionStartEvent,
  RevolutionEndEvent,
} from '../types';

export function useRevolutions(params?: {
  mission_id?: string;
  status?: string;
  limit?: number;
}) {
  const [data, setData] = useState<{ revolutions: Revolution[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mission_id = params?.mission_id;
  const status = params?.status;
  const limit = params?.limit;

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.revolutions.list({ mission_id, status, limit });
      setData(res);
      setError(null);
    } catch {
      setError('Failed to fetch revolutions');
    } finally {
      setLoading(false);
    }
  }, [mission_id, status, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time updates via DataSource
  useEffect(() => {
    const unsubStart = dataSource.revolutions.subscribeStart((event: RevolutionStartEvent) => {
      setData((prev) => {
        if (!prev) return prev;
        const newRev: Revolution = {
          id: 0,
          revolution_num: event.revolution_num,
          mission_id: event.mission_id,
          window_start: event.started_at,
          window_end: new Date(new Date(event.started_at).getTime() + event.window_sec * 1000).toISOString(),
          window_duration_sec: event.window_sec,
          images_planned: event.images_in_window,
          images_completed: [],
          images_failed: [],
          status: 'active',
          total_segments_planned: 0,
          total_segments_transmitted: 0,
          total_segments_confirmed: 0,
          created_at: event.started_at,
          started_at: event.started_at,
          completed_at: null,
        };
        return { ...prev, revolutions: [newRev, ...prev.revolutions], count: prev.count + 1 };
      });
    });

    const unsubEnd = dataSource.revolutions.subscribeEnd((event: RevolutionEndEvent) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          revolutions: prev.revolutions.map((rev) =>
            rev.revolution_num === event.revolution_num
              ? {
                  ...rev,
                  status: 'completed',
                  images_completed: event.completed,
                  images_failed: event.failed,
                  total_segments_transmitted: event.total_segments_transmitted,
                  total_segments_confirmed: event.total_segments_confirmed,
                  completed_at: event.ended_at,
                }
              : rev
          ),
        };
      });
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  }, []);

  return { revolutions: data?.revolutions || [], total: data?.count || 0, loading, error, refetch: fetch };
}

export function useRevolution(num: number | null) {
  const [data, setData] = useState<Revolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!num) return;
    try {
      const res = await dataSource.revolutions.get(num);
      setData(res);
      setError(null);
    } catch {
      setError('Failed to fetch revolution');
    } finally {
      setLoading(false);
    }
  }, [num]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { revolution: data, loading, error, refetch: fetch };
}

export function useCurrentRevolution() {
  const [data, setData] = useState<{ current: Revolution | null; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.revolutions.current();
      setData(res);
    } catch {
      setData({ current: null, message: 'Error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { currentRevolution: data?.current, message: data?.message, loading, refetch: fetch };
}

export function useRevolutionStatus() {
  const [status, setStatus] = useState<RevolutionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.revolutions.status();
      setStatus(res);
    } catch {
      setStatus({ active: false, revolution: null, time_remaining: null, next_revolution: null, time_until_next: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 2000);
    return () => clearInterval(interval);
  }, [fetch]);

  // Real-time revolution events via DataSource
  useEffect(() => {
    const unsubStart = dataSource.revolutions.subscribeStart((event: RevolutionStartEvent) => {
      setStatus({
        active: true,
        revolution: {
          id: 0,
          revolution_num: event.revolution_num,
          mission_id: event.mission_id,
          window_start: event.started_at,
          window_end: new Date(new Date(event.started_at).getTime() + event.window_sec * 1000).toISOString(),
          window_duration_sec: event.window_sec,
          images_planned: event.images_in_window,
          images_completed: [],
          images_failed: [],
          status: 'active',
          total_segments_planned: 0,
          total_segments_transmitted: 0,
          total_segments_confirmed: 0,
          created_at: event.started_at,
          started_at: event.started_at,
          completed_at: null,
        },
        time_remaining: event.window_sec,
        next_revolution: null,
        time_until_next: null,
      });
    });

    const unsubEnd = dataSource.revolutions.subscribeEnd(() => {
      setStatus((prev) => (prev ? { ...prev, active: false, time_remaining: 0 } : null));
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  }, []);

  return { status, loading };
}

export function useRevolutionStats() {
  const [data, setData] = useState<RevolutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.revolutions.stats();
      setData(res);
      setError(null);
    } catch {
      setError('Failed to fetch revolution stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { stats: data, loading, error, refetch: fetch };
}
