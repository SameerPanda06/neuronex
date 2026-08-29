// Retransmissions Hooks
import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../data';
import type { Retransmission, RetransmissionStats } from '../types';
import { useResilientPolling } from './useResilientPolling';

export function useRetransmissions(params?: {
  status?: string;
  image_id?: string;
  limit?: number;
}) {
  const [data, setData] = useState<{ retransmissions: Retransmission[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const status = params?.status;
  const image_id = params?.image_id;
  const limit = params?.limit;

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.retransmissions.list({ status, image_id, limit });
      setData(res);
      setError(null);
      return true;
    } catch {
      setError('Failed to fetch retransmissions');
      return false;
    } finally {
      setLoading(false);
    }
  }, [status, image_id, limit]);

  useResilientPolling(fetch, 10_000);

  // Real-time updates via DataSource
  useEffect(() => {
    const unsubRequested = dataSource.retransmissions.subscribeRequested(
      () => { void fetch(); }
    );

    const unsubAck = dataSource.retransmissions.subscribeAckConfirmed(
      (event: { received: { retransmit_id?: number; image_id?: string }; status?: 'acknowledged' | 'completed'; completed_at?: string }) => {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            retransmissions: prev.retransmissions.map((r) =>
              (event.received.retransmit_id && r.id === event.received.retransmit_id) ||
              (event.received.image_id && r.image_id === event.received.image_id && r.status === 'pending')
                ? {
                    ...r,
                    status: event.status ?? 'acknowledged',
                    completed_at: event.status === 'completed' ? event.completed_at ?? r.completed_at : r.completed_at,
                  }
                : r
            ),
          };
        });
      }
    );

    return () => {
      unsubRequested();
      unsubAck();
    };
  }, [fetch]);

  const acknowledge = useCallback(async (id: number) => {
    try {
      const response = await dataSource.retransmissions.ack({ retransmit_id: id });
      setData((prev) => prev ? {
        ...prev,
        retransmissions: prev.retransmissions.map((item) =>
          item.id === id ? response.retransmission : item
        ),
      } : prev);
      return true;
    } catch {
      setError('Failed to acknowledge retransmission');
      return false;
    }
  }, []);

  const complete = useCallback(async (id: number) => {
    try {
      await dataSource.retransmissions.complete(id);
    } catch {
      setError('Failed to mark retransmission complete');
    }
  }, []);

  return {
    retransmissions: data?.retransmissions || [],
    total: data?.count || 0,
    loading,
    error,
    refetch: fetch,
    acknowledge,
    complete,
  };
}

export function useRetransmissionStats() {
  const [data, setData] = useState<RetransmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.retransmissions.stats();
      setData(res);
      setError(null);
    } catch {
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
