// Images Hooks - TypeScript
import { useState, useEffect, useCallback } from 'react';
import { imagesApi } from '../services/api';
import { socketService } from '../services/socket';
import type { Image, ImagesResponse, ImagesStats } from '../types';

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
    const unsubscribeClassified = socketService.on('image:classified', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const exists = prev.images.find((img: Image) => img.id === event.id);
        if (exists) {
          return {
            ...prev,
            images: prev.images.map((img: Image) =>
              img.id === event.id
                ? { ...img, classification: event.classification, confidence: event.confidence, priority: event.priority, action: event.action, status: 'classified' }
                : img
            ),
          };
        }
        return {
          ...prev,
          images: [{ ...event, file_path: '', status: 'classified' as const, priority: event.priority, action: event.action, jpeg_quality: 85, progress_percent: 0, segments_confirmed: 0, created_at: new Date().toISOString() }, ...prev.images],
        };
      });
    });

    const unsubscribeProgress = socketService.on('image:progress', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map((img: Image) =>
            img.id === event.id
              ? { ...img, segments_confirmed: event.segments_confirmed, total_segments: event.segments_total, status: 'transmitting', progress: event.progress, rssi: event.rssi, snr: event.snr }
              : img
          ),
        };
      });
    });

    const unsubscribeDiscard = socketService.on('image:discarded', (event: any) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map((img: Image) =>
            img.id === event.id ? { ...img, status: 'discarded' } : img
          ),
        };
      });
    });

    return () => {
      unsubscribeClassified();
      unsubscribeProgress();
      unsubscribeDiscard();
    };
  }, []);

  return { images: data?.images || [], total: data?.total || 0, loading, error, refetch: fetch };
}

export function useImagesStats() {
  const [stats, setStats] = useState<ImagesStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await imagesApi.stats();
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch image stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const unsubscribe = socketService.on('image:classified', fetch);
    return () => unsubscribe();
  }, [fetch]);

  return { stats, loading, refetch: fetch };
}

export function useImage(id: string) {
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    imagesApi.get(id).then(res => {
      if (mounted) {
        setImage(res.data);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  return { image, loading };
}