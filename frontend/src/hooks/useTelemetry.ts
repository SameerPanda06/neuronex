// Telemetry Hooks
import { useState, useEffect, useCallback } from 'react';
import { dataSource } from '../data';
import type { Telemetry, TelemetryHistory, SignalQuality, TelemetryUpdateEvent } from '../types';
import { useResilientPolling } from './useResilientPolling';

export function useLatestTelemetry() {
  const [data, setData] = useState<{ latest_overall: Telemetry | null; latest_per_image: Telemetry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.telemetry.getLatest();
      setData(res);
      setError(null);
      return true;
    } catch {
      setError('Failed to fetch telemetry');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useResilientPolling(fetch, 10_000);

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
      return true;
    } catch {
      setError('Failed to fetch signal quality');
      return false;
    } finally {
      setLoading(false);
    }
  }, [imageId, hours]);

  useResilientPolling(fetch, 10_000);

  // Real-time updates via DataSource subscription
  useEffect(() => {
    const unsubscribe = dataSource.telemetry.subscribeTelemetry((update: TelemetryUpdateEvent) => {
      setData((prev) => {
        const newPoint: Telemetry = {
          id: Date.now(),
          image_id: update.image_id,
          mission_id: update.mission_id,
          packet_type: update.packet_type,
          segment_num: update.segment_num,
          total_segments: update.total_segments,
          rssi: update.rssi,
          snr: update.snr,
          latency_ms: update.latency_ms,
          timestamp: update.timestamp,
          raw_payload: null,
        };

        const existingTelemetry = prev?.telemetry ? [newPoint, ...prev.telemetry.slice(0, 49)] : [newPoint];
        const rssiValues = existingTelemetry.map((t) => t.rssi).filter((v): v is number => v !== null);
        const snrValues = existingTelemetry.map((t) => t.snr).filter((v): v is number => v !== null);

        const rssiStats =
          rssiValues.length > 0
            ? {
                min: Math.min(...rssiValues),
                max: Math.max(...rssiValues),
                avg: parseFloat((rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length).toFixed(1)),
                current: update.rssi ?? rssiValues[0]!,
              }
            : prev?.stats?.rssi;

        const snrStats =
          snrValues.length > 0
            ? {
                min: Math.min(...snrValues),
                max: Math.max(...snrValues),
                avg: parseFloat((snrValues.reduce((a, b) => a + b, 0) / snrValues.length).toFixed(1)),
                current: update.snr ?? snrValues[0]!,
              }
            : prev?.stats?.snr;

        return {
          telemetry: existingTelemetry,
          stats: {
            rssi: rssiStats,
            snr: snrStats,
          },
          count: existingTelemetry.length,
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { data, loading, error, refetch: fetch };
}

// Signal quality helpers
export function getSignalQualityClass(rssi: number | null): string {
  if (rssi === null) return 'text-slate-400';
  if (rssi >= -70) return 'text-emerald-400';
  if (rssi >= -85) return 'text-cyan-400';
  if (rssi >= -100) return 'text-amber-400';
  if (rssi >= -115) return 'text-orange-400';
  return 'text-rose-500';
}

export function getSignalQualityBgClass(rssi: number | null): string {
  if (rssi === null) return 'bg-slate-800/60 text-slate-400 border-slate-700';
  if (rssi >= -70) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (rssi >= -85) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (rssi >= -100) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (rssi >= -115) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
}

export function getSignalQualityLabel(rssi: number | null): string {
  if (rssi === null) return 'NO SIGNAL';
  if (rssi >= -70) return 'EXCELLENT';
  if (rssi >= -85) return 'GOOD';
  if (rssi >= -100) return 'FAIR';
  if (rssi >= -115) return 'POOR';
  return 'CRITICAL';
}

export function getSnrQualityClass(snr: number | null): string {
  if (snr === null) return 'text-slate-400';
  if (snr >= 10) return 'text-emerald-400';
  if (snr >= 5) return 'text-cyan-400';
  if (snr >= 0) return 'text-amber-400';
  if (snr >= -5) return 'text-orange-400';
  return 'text-rose-500';
}

export function getSnrQualityBgClass(snr: number | null): string {
  if (snr === null) return 'bg-slate-800/60 text-slate-400 border-slate-700';
  if (snr >= 10) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (snr >= 5) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (snr >= 0) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (snr >= -5) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
}

export function getSnrQualityLabel(snr: number | null): string {
  if (snr === null) return 'NO SIGNAL';
  if (snr >= 10) return 'EXCELLENT';
  if (snr >= 5) return 'GOOD';
  if (snr >= 0) return 'FAIR';
  if (snr >= -5) return 'POOR';
  return 'CRITICAL';
}
