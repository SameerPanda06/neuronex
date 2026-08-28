// Telemetry Hooks
import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../data';
import type { Telemetry, TelemetryHistory, SignalQuality, TelemetryUpdateEvent } from '../types';

export function useLatestTelemetry() {
  const [data, setData] = useState<{ latest_overall: Telemetry | null; latest_per_image: Telemetry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.telemetry.getLatest();
      setData(res);
      setError(null);
    } catch {
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

  // Real-time updates via DataSource
  useEffect(() => {
    const unsubscribe = dataSource.telemetry.subscribeTelemetry((update: TelemetryUpdateEvent) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latest_overall: {
            ...prev.latest_overall!,
            ...update,
            timestamp: update.timestamp,
          } as Telemetry,
          latest_per_image: prev.latest_per_image.map((t) =>
            t.image_id === update.image_id ? { ...t, ...update } : t
          ),
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { data, loading, error, refetch: fetch };
}

export function useTelemetryHistory(imageId?: string, hours = 24) {
  const [data, setData] = useState<TelemetryHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.telemetry.getHistory({ image_id: imageId, hours });
      setData(res);
      setError(null);
    } catch {
      setError('Failed to fetch telemetry history');
    } finally {
      setLoading(false);
    }
  }, [imageId, hours]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useSignalQuality(imageId?: string, hours = 24) {
  const [data, setData] = useState<SignalQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.telemetry.getSignal({ image_id: imageId, hours });
      setData(res);
      setError(null);
    } catch {
      setError('Failed to fetch signal quality');
    } finally {
      setLoading(false);
    }
  }, [imageId, hours]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// Signal quality helpers
export function getSignalQualityClass(rssi: number | null): string {
  if (rssi === null) return 'text-gray-400';
  if (rssi >= -70) return 'text-signal-excellent';
  if (rssi >= -85) return 'text-signal-good';
  if (rssi >= -100) return 'text-signal-fair';
  if (rssi >= -115) return 'text-signal-poor';
  return 'text-signal-critical';
}

export function getSignalQualityLabel(rssi: number | null): string {
  if (rssi === null) return 'No Signal';
  if (rssi >= -70) return 'Excellent';
  if (rssi >= -85) return 'Good';
  if (rssi >= -100) return 'Fair';
  if (rssi >= -115) return 'Poor';
  return 'Critical';
}

export function getSnrQualityClass(snr: number | null): string {
  if (snr === null) return 'text-gray-400';
  if (snr >= 10) return 'text-signal-excellent';
  if (snr >= 5) return 'text-signal-good';
  if (snr >= 0) return 'text-signal-fair';
  if (snr >= -5) return 'text-signal-poor';
  return 'text-signal-critical';
}
