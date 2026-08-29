// Queue Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { dataSource } from '../data';
import type { Image, ReorderRequest } from '../types';
import { useResilientPolling } from './useResilientPolling';

export function useQueue() {
  const [queue, setQueue] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSocketUpdate = useRef(0);

  const fetch = useCallback(async () => {
    const requestedAt = Date.now();
    try {
      const res = await dataSource.queue.get();
      setQueue((current) => lastSocketUpdate.current > requestedAt ? current : res.queue);
      setError(null);
      return true;
    } catch {
      setError('Failed to fetch queue');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useResilientPolling(fetch, 10_000);

  // Real-time queue updates via DataSource
  useEffect(() => {
    const unsubscribe = dataSource.queue.subscribeQueue((data: { queue: Image[] }) => {
      lastSocketUpdate.current = Date.now();
      setQueue(data.queue);
    });

    const unsubscribeReordered = dataSource.queue.subscribeReordered((data: { queue: ReorderRequest[] }) => {
      lastSocketUpdate.current = Date.now();
      setQueue((prev) => {
        const orderMap = new Map(data.queue.map((item, index) => [item.id, index]));
        return [...prev].sort((a, b) => {
          const aIndex = orderMap.get(a.id) ?? 999;
          const bIndex = orderMap.get(b.id) ?? 999;
          return aIndex - bIndex;
        });
      });
    });

    return () => {
      unsubscribe();
      unsubscribeReordered();
    };
  }, []);

  const reorder = useCallback(async (items: ReorderRequest[]) => {
    try {
      await dataSource.queue.reorder(items);
    } catch {
      setError('Failed to reorder queue');
    }
  }, []);

  return { queue, loading, error, refetch: fetch, reorder };
}

export function useNextImage() {
  const [data, setData] = useState<{ next: Image | null; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.queue.next();
      setData(res);
    } catch {
      setData({ next: null, message: 'Error fetching next image' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { nextImage: data?.next, message: data?.message, loading, refetch: fetch };
}
