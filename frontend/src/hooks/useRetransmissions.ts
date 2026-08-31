// Retransmissions Hooks - TypeScript
import { useState, useEffect, useCallback } from 'react';
import { retransmitApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Retransmission } from '../types';

export function useRetransmissions(params?: { status?: string; image_id?: string; limit?: number }) {
  const [data, setData] = useState<{ retransmissions: Retransmission[] } | null>(null);
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
    const unsubRequested = socketService.on('retransmit:requested', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const newRetrans: Retransmission = {
          id: Date.now(),
          image_id: event.image_id,
          mission_id: event.mission_id,
          missing_segments: event.missing_segments,
          status: 'pending',
          requested_at: new Date().toISOString(),
          completed_at: null,
        };
        return { ...prev, retransmissions: [newRetrans, ...prev.retransmissions] };
      });
    });

    const unsubAck = socketService.on('retransmit:ack:confirmed', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          retransmissions: prev.retransmissions.map((r: Retransmission) =>
            (event.received?.retransmit_id && r.id === event.received.retransmit_id) ||
            (event.received?.image_id && r.image_id === event.received.image_id)
              ? { ...r, status: 'acknowledged' }
              : r
          ),
        };
      });
    });

    return () => {
      unsubRequested();
      unsubAck();
    };
  }, []);

  return { data, loading, error, refetch: fetch };
}

export function useRetransmissionStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await retransmitApi.stats();
        setData(res.data);
      } catch (e) {
        console.error('Failed to fetch retransmission stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, loading };
}