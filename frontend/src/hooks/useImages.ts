// Images Hooks
import { useState, useEffect, useCallback } from 'react';
import { imagesApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Image, ImagesResponse, ImagesStats, ImageProgress, ImageClassifiedEvent, ImageProgressEvent, ImageStatus } from '../types';

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

  const fetch = useCallback(async () => {
    try {
      const res = await imagesApi.list(params);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to fetch images');
    } finally {
      setLoading(false);
    }
  }, [params?.status, params?.classification, params?.mission_id, params?.limit, params?.offset, params?.sort, params?.order]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time updates
  useEffect(() => {
    const unsubscribeClassified = socketService.on<ImageClassifiedEvent>('image:classified', (event) => {
      setData((prev) => {
        if (!prev) return prev;
        const exists = prev.images.find((img) => img.id === event.id);
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
        return {
          ...prev,
          images: [{ ...event, file_path: '', status: 'classified' as ImageStatus, priority: event.priority, action: event.action, jpeg_quality: 85, progress_percent: 0, segments_confirmed: 0, created_at: new Date().toISOString() }, ...prev.images],
          total: prev.total + 1,
        };
      });
    });

    const unsubscribeProgress = socketService.on<ImageProgressEvent>('image:progress', (event) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === event.id
              ? { ...img, segments_confirmed: event.segments_confirmed, total_segments: event.segments_total, progress_percent: Math.round((event.segments_confirmed / event.segments_total) * 100), status: event.status }
              : img
          ),
        };
      });
    });

    const unsubscribeStatus = socketService.on('image:status', (event: { image_id: string; status: ImageStatus }) => {
      setData((prev) => {
        if (!prev) return prev;
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
  }, []);

  return { images: data?.images || [], total: data?.total || 0, loading, error, refetch: fetch };
}

export function useImage(id: string | null) {
  const [data, setData] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    try {
      const res = await imagesApi.get(id);
      setData(res.data);
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
    if (!imageId) return;
    try {
      const res = await imagesApi.progress(imageId);
      setData(res.data);
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
    const unsubscribe = socketService.on<ImageProgressEvent>('image:progress', (event) => {
      if (event.id === imageId) {
        setData({
          image_id: event.id,
          status: event.status,
          total_segments: event.segments_total,
          segments_confirmed: event.segments_confirmed,
          current_segment: event.segments_confirmed,
          progress_percent: Math.round((event.segments_confirmed / event.segments_total) * 100),
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
      const res = await imagesApi.stats();
      setData(res.data);
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

// Classification color helpers
export function getClassificationColor(classification: string | null): string {
  switch (classification) {
    case 'CLEAR':
      return 'bg-green-500 text-white';
    case 'CLOUDY':
      return 'bg-yellow-500 text-white';
    case 'NOT_VISIBLE':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getClassificationIcon(classification: string | null): string {
  switch (classification) {
    case 'CLEAR':
      return '☀️';
    case 'CLOUDY':
      return '☁️';
    case 'NOT_VISIBLE':
      return '🌫️';
    default:
      return '❓';
  }
}

export function getStatusColor(status: ImageStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-green-500 text-white';
    case 'transmitting':
      return 'bg-blue-500 text-white animate-pulse';
    case 'queued':
    case 'classified':
      return 'bg-indigo-500 text-white';
    case 'pending':
      return 'bg-gray-500 text-white';
    case 'discarded':
      return 'bg-red-500 text-white';
    case 'failed':
      return 'bg-red-700 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getActionColor(action: string | null): string {
  switch (action) {
    case 'keep':
      return 'text-green-400';
    case 'defer':
      return 'text-yellow-400';
    case 'discard':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}