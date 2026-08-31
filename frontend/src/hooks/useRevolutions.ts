// Revolution Hooks - TypeScript
import { useState, useEffect, useCallback } from 'react';
import { revolutionsApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Revolution } from '../types';

export function useRevolutions(params?: { mission_id?: string; status?: string; limit?: number }) {
  const [data, setData] = useState<{ revolutions: Revolution[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await revolutionsApi.list(params);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch revolutions');
    } finally {
      setLoading(false);
    }
  }, [params?.mission_id, params?.status, params?.limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time updates
  useEffect(() => {
    const unsubStart = socketService.on('revolution:start', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const newRev: Revolution = {
          id: 0,
          number: event.revolution_num,
          status: 'active',
          started_at: event.started_at,
          completed_at: null,
          images_transmitted: 0,
          images_total: event.images_in_window || 0,
        };
        return { ...prev, revolutions: [newRev, ...prev.revolutions] };
      });
    });

    const unsubEnd = socketService.on('revolution:end', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          revolutions: prev.revolutions.map((r: Revolution) =>
            r.number === event.revolution_num ? { ...r, status: 'completed', completed_at: event.timestamp, images_transmitted: event.images_completed } : r
          ),
        };
      });
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  }, []);

  return { data, loading, error, refetch: fetch };
}

export function useRevolutionStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await revolutionsApi.stats();
        setData(res.data);
      } catch (e) {
        console.error('Failed to fetch revolution stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, loading };
}