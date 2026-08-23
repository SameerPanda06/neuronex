// Retransmissions Hooks
import { useState, useEffect, useCallback } from 'react';
import { retransmitApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Retransmission, RetransmissionsResponse, RetransmissionStats } from '../types';

export function useRetransmissions(params?: {
  status?: string;
  image_id?: string;
  limit?: number;
}) {
  const [data, setData] = useState<RetransmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await retransmitApi.list(params);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch retransmissions');
    } finally {
      setLoading(false);
    }
  }, [params?.status, params?.image_id, params?.limit]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [fetch]);

  // Real-time updates
  useEffect(() => {
    const unsubRequested = socketService.on('retransmit:requested', (event: { image_id: string; mission_id: string; missing_segments: number[] }) => {
      setData((prev) => {
        if (!prev) return prev;
        const newRetrans: Retransmission = {
          id: Date.now(),
          image_id: event.image_id,
          mission_id: event.mission_id,
          missing_segments: event.missing_segments,
          requested_at: new Date().toISOString(),
          acknowledged_at: null,
          completed_at: null,
          status: 'pending',
        };
        return { ...prev, retransmissions: [newRetrans, ...prev.retransmissions], count: prev.count + 1 };
      });
    });

    const unsubAck = socketService.on('retransmit:ack:confirmed', (event: { received: { retransmit_id?: number; image_id?: string } }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          retransmissions: prev.retransmissions.map((r) =>
            (event.received.retransmit_id && r.id === event.received.retransmit_id) ||
            (event.received.image_id && r.image_id === event.received.image_id && r.status === 'pending')
              ? { ...r, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
              : r
          ),
        };
      });
    });

    return () => { unsubRequested(); unsubAck(); };
  }, []);

  return { retransmissions: data?.retransmissions || [], total: data?.count || 0, loading, error, refetch: fetch };
}

export function useRetransmissionStats() {
  const [data, setData] = useState<RetransmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await retransmitApi.stats();
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch retransmission stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { stats: data, loading, error, refetch: fetch };
}