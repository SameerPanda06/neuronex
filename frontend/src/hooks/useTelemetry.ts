// Telemetry Hooks - TypeScript
import { useState, useEffect, useCallback } from 'react';
import { telemetryApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Telemetry, TelemetryResponse } from '../types';

export function useLatestTelemetry() {
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await telemetryApi.latest();
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000); // Poll every 5s as fallback
    return () => clearInterval(interval);
  }, [fetch]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const unsubscribe = socketService.on('telemetry:update', (update: any) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latest_overall: {
            ...prev.latest_overall,
            ...update,
            timestamp: update.timestamp,
          },
          latest_per_image: prev.latest_per_image.map((t: Telemetry) =>
            t.image_id === update.image_id ? { ...t, ...update } : t
          ),
        };
      });
    });

    socketService.joinTelemetry();
    return () => {
      unsubscribe();
      socketService.leaveTelemetry();
    };
  }, []);

  return { data, loading, error, refetch: fetch };
}

export function useTelemetryHistory(imageId: string, hours = 24) {
  const [data, setData] = useState<Telemetry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await telemetryApi.history({ image_id: imageId, hours });
      setData(res.data?.data || []);
      setError(null);
    } catch (e) {
      setError('Failed to fetch telemetry history');
    } finally {
      setLoading(false);
    }
  }, [imageId, hours]);

  useEffect(() => {
    if (imageId) fetch();
  }, [fetch, imageId]);

  return { data, loading, error, refetch: fetch };
}