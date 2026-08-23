// Queue Hooks
import { useState, useEffect, useCallback } from 'react';
import { queueApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Image, QueueResponse, ReorderRequest, ImageStatus } from '../types';

export function useQueue() {
  const [queue, setQueue] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await queueApi.get();
      setQueue(res.data.queue);
      setError(null);
    } catch (e) {
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

  // Real-time queue updates
  useEffect(() => {
    const unsubscribe = socketService.on('queue:update', (data: { queue: Image[] }) => {
      setQueue(data.queue);
    });

    const unsubscribeReordered = socketService.on('queue:reordered', (data: { queue: ReorderRequest[] }) => {
      // Update local queue order
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
      await queueApi.reorder(items);
    } catch (e) {
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
      const res = await queueApi.next();
      setData(res.data);
    } catch (e) {
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