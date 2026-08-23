// REST API Client
import axios from 'axios';
import type {
  Image, ImagesResponse, ImageProgress, ImagesStats,
  TelemetryResponse, TelemetryHistory, SignalQuality,
  QueueResponse, ReorderRequest, NextImageResponse,
  RetransmissionsResponse, RetransmissionAckRequest, RetransmissionAckResponse,
  RevolutionsResponse, RevolutionStats, ScheduleRevolutionRequest,
  RevolutionStatusResponse
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for auth (if needed)
api.interceptors.request.use((config) => {
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Images API
export const imagesApi = {
  list: (params?: {
    status?: string;
    classification?: string;
    mission_id?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  }) => api.get<ImagesResponse>('/api/images', { params }),

  get: (id: string) => api.get<Image>(`/api/images/${id}`),

  progress: (id: string) => api.get<ImageProgress>(`/api/images/${id}/progress`),

  stats: () => api.get<ImagesStats>('/api/images/stats'),
};

// Telemetry API
export const telemetryApi = {
  latest: () => api.get<TelemetryResponse>('/api/telemetry'),

  history: (params?: {
    image_id?: string;
    mission_id?: string;
    hours?: number;
    limit?: number;
  }) => api.get<TelemetryHistory>('/api/telemetry/history', { params }),

  signal: (params?: {
    image_id?: string;
    hours?: number;
  }) => api.get<SignalQuality>('/api/telemetry/signal', { params }),
};

// Queue API
export const queueApi = {
  get: () => api.get<QueueResponse>('/api/queue'),

  reorder: (items: ReorderRequest[]) => api.post<{ updated: Image[]; count: number }>('/api/queue/reorder', items),

  next: () => api.get<NextImageResponse>('/api/queue/next'),
};

// Retransmission API
export const retransmitApi = {
  list: (params?: {
    status?: string;
    image_id?: string;
    limit?: number;
  }) => api.get<RetransmissionsResponse>('/api/retransmissions', { params }),

  get: (id: number) => api.get(`/api/retransmissions/${id}`),

  ack: (data: RetransmissionAckRequest) => api.post<RetransmissionAckResponse>('/api/retransmissions/ack', data),

  complete: (id: number) => api.post(`/api/retransmissions/${id}/complete`),

  stats: () => api.get<RetransmissionStats>('/api/retransmissions/stats'),
};

// Revolutions API
export const revolutionsApi = {
  list: (params?: {
    mission_id?: string;
    status?: string;
    limit?: number;
  }) => api.get<RevolutionsResponse>('/api/revolutions', { params }),

  current: () => api.get<{ current: Revolution | null; message?: string }>('/api/revolutions/current'),

  get: (num: number) => api.get<Revolution>(`/api/revolutions/${num}`),

  stats: () => api.get<RevolutionStats>('/api/revolutions/stats'),

  schedule: (data: ScheduleRevolutionRequest) => api.post<{ revolution: Revolution }>('/api/revolutions/schedule', data),

  start: (num: number) => api.post(`/api/revolutions/${num}/start`),

  complete: (num: number, data: { images_completed?: string[]; images_failed?: string[]; total_segments_transmitted?: number; total_segments_confirmed?: number }) => api.post(`/api/revolutions/${num}/complete`, data),

  status: () => api.get<RevolutionStatusResponse>('/api/revolutions/status'),
};

// Health
export const healthApi = {
  check: () => api.get('/api/health'),
};

export default api;