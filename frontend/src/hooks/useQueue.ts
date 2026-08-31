// Queue Hook - TypeScript
import { useState, useEffect, useCallback } from 'react';
import { queueApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Image } from '../types';

export function useQueue() {
  const [queue, setQueue] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await queueApi.get();
      setQueue(res.data?.queue || []);
      setError(null);
    } catch (e) {
      setError('Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time updates
  useEffect(() => {
    const unsubUpdate = socketService.on('queue:update', (event: any) => {
      if (event.queue) setQueue(event.queue);
    });

    const unsubReorder = socketService.on('queue:reordered', (event: any) => {
      if (event.queue) setQueue(event.queue);
    });

    return () => {
      unsubUpdate();
      unsubReorder();
    };
  }, []);

  return { queue, loading, error, refetch: fetch };
}