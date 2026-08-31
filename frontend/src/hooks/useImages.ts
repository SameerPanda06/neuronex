// Images Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { dataSource } from '../data';
import type { Image, ImagesResponse, ImagesStats, ImageProgress, ImageStatus } from '../types';

export function useImages(params?: {
  status?: string;
  classification?: string;
  mission_id?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
}) {
  const [data, setData] = useState<ImagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketVersions = useRef(new Map<string, number>());

  const { status, classification, mission_id, limit, offset, sort, order } = params || {};

  const fetch = useCallback(async () => {
    const requestedAt = Date.now();
    try {
      const res = await dataSource.images.list({
        status,
        classification,
        mission_id,
        limit,
        offset,
        sort,
        order,
      });
      setData((current) => {
        if (!current) return res;
        const currentById = new Map(current.images.map((image) => [image.id, image]));
        return {
          ...res,
          images: res.images.map((image) =>
            (socketVersions.current.get(image.id) ?? 0) > requestedAt
              ? currentById.get(image.id) ?? image
              : image
          ),
        };
      });
      setError(null);
    } catch (e) {
      setError('Failed to fetch images');
    } finally {
      setLoading(false);
    }
  }, [status, classification, mission_id, limit, offset, sort, order]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time updates
  useEffect(() => {
    const unsubscribeClassified = dataSource.images.subscribeClassified( (event) => {
      socketVersions.current.set(event.id, Date.now());
      setData((prev) => {
        if (!prev) return prev;
        const matches = (!classification || event.classification === classification)
          && (!status || status === 'classified')
          && (!mission_id || event.mission_id === mission_id);
        const exists = prev.images.find((img) => img.id === event.id);
        if (!matches) {
          if (!exists) return prev;
          return { ...prev, images: prev.images.filter((img) => img.id !== event.id), total: Math.max(0, prev.total - 1) };
        }
        if (exists) {
          return {
            ...prev,
            images: prev.images.map((img) =>
              img.id === event.id
                ? { ...img, classification: event.classification, confidence: event.confidence, priority: event.priority, action: event.action, status: 'classified' as ImageStatus }
                : img
            ),
          };
        }
        // Classification events are intentionally partial. Wait for REST rather than
        // manufacturing file paths, timestamps, or mission fields that were not sent.
        return prev;
      });
    });

    const unsubscribeProgress = dataSource.images.subscribeProgress( (event) => {
      socketVersions.current.set(event.id, Date.now());
      setData((prev) => {
        if (!prev) return prev;
        if (status && event.status !== status) {
          const next = prev.images.filter((img) => img.id !== event.id);
          return next.length === prev.images.length ? prev : { ...prev, images: next, total: Math.max(0, prev.total - 1) };
        }
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === event.id
              ? { ...img, segments_confirmed: event.segments_confirmed, total_segments: event.segments_total, progress_percent: event.segments_total > 0 ? Math.round((event.segments_confirmed / event.segments_total) * 100) : 0, status: event.status }
              : img
          ),
        };
      });
    });

    const unsubscribeStatus = dataSource.images.subscribeStatus( (event: { image_id: string; status: ImageStatus }) => {
      socketVersions.current.set(event.image_id, Date.now());
      setData((prev) => {
        if (!prev) return prev;
        if (status && event.status !== status) {
          const next = prev.images.filter((img) => img.id !== event.image_id);
          return next.length === prev.images.length ? prev : { ...prev, images: next, total: Math.max(0, prev.total - 1) };
        }
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === event.image_id ? { ...img, status: event.status } : img
          ),
        };
      });
    });

    return () => {
      unsubscribeClassified();
      unsubscribeProgress();
      unsubscribeStatus();
    };
  }, [classification, mission_id, status]);

  return { images: data?.images || [], total: data?.total || 0, loading, error, refetch: fetch };
}

export function useImage(id: string | null) {
  const [data, setData] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dataSource.images.get(id);
      setData(res);
      setError(null);
    } catch (e) {
      setError('Failed to fetch image');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { image: data, loading, error, refetch: fetch };
}

export function useImageProgress(imageId: string | null) {
  const [data, setData] = useState<ImageProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!imageId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dataSource.images.progress(imageId);
      setData(res);
      setError(null);
    } catch (e) {
      setError('Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  }, [imageId]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 2000);
    return () => clearInterval(interval);
  }, [fetch]);

  // Real-time progress updates
  useEffect(() => {
    const unsubscribe = dataSource.images.subscribeProgress( (event) => {
      if (event.id === imageId) {
        const progressPercent = event.segments_total > 0
          ? Math.round((event.segments_confirmed / event.segments_total) * 100)
          : 0;
        setData({
          image_id: event.id,
          status: event.status,
          total_segments: event.segments_total,
          segments_confirmed: event.segments_confirmed,
          current_segment: event.segments_confirmed,
          progress_percent: progressPercent,
          rssi: null,
          snr: null,
          throughput_bps: null,
          latency_ms_tx: null,
        });
      }
    });

    return () => unsubscribe();
  }, [imageId]);

  return { progress: data, loading, error, refetch: fetch };
}

export function useImagesStats() {
  const [data, setData] = useState<ImagesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await dataSource.images.stats();
      setData(res);
      setError(null);
    } catch (e) {
      setError('Failed to fetch stats');
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
