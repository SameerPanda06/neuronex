// REST API Client - TypeScript
import axios from 'axios';
import type {
  ImagesResponse, ImagesStats, Image,
  TelemetryResponse, SignalQuality,
  QueueResponse, RetransmissionsResponse, Retransmission,
  RevolutionsResponse, RevolutionStats, RevolutionStatusResponse,
  ScheduleState, CommandResponse, StorageStats
} from '../types';

const api = axios.create({
  baseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000',
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
  list: (params?: any) => api.get<ImagesResponse>('/api/images', { params }),
  get: (id: string) => api.get<Image>(`/api/images/${id}`),
  progress: (id: string) => api.get(`/api/images/${id}/progress`),
  stats: () => api.get<ImagesStats>('/api/images/stats'),
  download: (id: string) => api.get(`/api/images/${id}/download`, { responseType: 'blob' }),
};

// Telemetry API
export const telemetryApi = {
  latest: () => api.get<TelemetryResponse>('/api/telemetry'),
  history: (params?: any) => api.get('/api/telemetry/history', { params }),
  signalQuality: (params?: any) => api.get<SignalQuality[]>('/api/telemetry/signal', { params }),
};

// Queue API
export const queueApi = {
  get: () => api.get<QueueResponse>('/api/queue'),
  reorder: (items: any[]) => api.post('/api/queue/reorder', { items }),
  next: () => api.get('/api/queue/next'),
};

// Retransmission API
export const retransmitApi = {
  list: (params?: any) => api.get<RetransmissionsResponse>('/api/retransmissions', { params }),
  get: (id: number) => api.get<Retransmission>(`/api/retransmissions/${id}`),
  ack: (id: number, data?: any) => api.post(`/api/retransmissions/${id}/ack`, data),
  complete: (id: number, data?: any) => api.post(`/api/retransmissions/${id}/complete`, data),
  stats: () => api.get('/api/retransmissions/stats'),
};

// Revolution API
export const revolutionsApi = {
  list: (params?: any) => api.get<RevolutionsResponse>('/api/revolutions', { params }),
  current: () => api.get('/api/revolutions/current'),
  get: (num: number) => api.get(`/api/revolutions/${num}`),
  stats: () => api.get<RevolutionStats>('/api/revolutions/stats'),
  schedule: (data: any) => api.post('/api/revolutions/schedule', data),
  start: (num: number) => api.post(`/api/revolutions/${num}/start`),
  complete: (num: number) => api.post(`/api/revolutions/${num}/complete`),
  status: () => api.get<RevolutionStatusResponse>('/api/revolutions/status'),
};

// Health API (new - for Diagnostics tab)
export const healthApi = {
  check: () => api.get('/api/health'),
};

// Schedule API (our extension - 12 revs/day countdown)
export const scheduleApi = {
  state: () => api.get<ScheduleState>('/api/schedule/state'),
  nextRevolution: () => api.get('/api/schedule/next-revolution'),
  window: () => api.get('/api/schedule/window'),
  config: () => api.get('/api/schedule/config'),
};

// Command API (our extension - ground -> satellite)
export const commandApi = {
  setPriority: (priority: number) => api.post<CommandResponse>('/api/command/priority', { priority }),
  reset: () => api.post<CommandResponse>('/api/command/reset'),
  status: () => api.post<CommandResponse>('/api/command/status'),
  queue: () => api.get<CommandResponse>('/api/command/queue'),
};

// Storage API (our extension - local image storage)
export const storageApi = {
  stats: () => api.get<StorageStats>('/api/images/storage/stats'),
  list: (params?: any) => api.get('/api/images/storage/list', { params }),
  download: (id: string) => api.get(`/api/images/${id}/download`, { responseType: 'blob' }),
  cleanup: (keep?: number) => api.post('/api/images/storage/cleanup', null, { params: { keep } }),
};

export default api;