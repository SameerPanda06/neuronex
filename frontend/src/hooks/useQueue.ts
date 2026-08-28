// Queue Hooks
import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../data';
import type { Image, ReorderRequest } from '../types';

export function useQueue() {
  const [queue, setQueue] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.queue.get();
      setQueue(res.queue);
      setError(null);
    } catch {
      setError('Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [fetch]);

  // Real-time queue updates via DataSource
  useEffect(() => {
    const unsubscribe = dataSource.queue.subscribeQueue((data: { queue: Image[] }) => {
      setQueue(data.queue);
    });

    const unsubscribeReordered = dataSource.queue.subscribeReordered((data: { queue: ReorderRequest[] }) => {
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
