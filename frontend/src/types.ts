// TypeScript types matching backend API contract
// Keep in sync with backend/openapi.yaml and CONTRACT.md

export type Classification = "CLEAR" | "CLOUDY" | "NOT_VISIBLE" | "UNKNOWN";
export type Action = "keep" | "defer" | "discard";
export type ImageStatus = "pending" | "classified" | "queued" | "transmitting" | "complete" | "discarded" | "failed";
export type RevolutionStatus = "scheduled" | "active" | "completed";
export type RetransmissionStatus = "pending" | "acknowledged" | "completed";
export type PacketType = "DATA" | "ACK" | "NACK" | "META" | "STATUS" | "DONE" | "TELEMETRY";

export interface Image {
  id: string;
  mission_id: string;
  file_path: string;
  classification: Classification | null;
  confidence: number | null;
  all_probabilities: Record<Classification, number> | null;
  latency_ms: number | null;
  classified_at: string | null;
  action: Action | null;
  priority: number;
  jpeg_quality: number | null;
  status: ImageStatus;
  total_segments: number | null;
  segments_confirmed: number;
  current_segment: number;
  chunk_size: number | null;
  rssi: number | null;
  snr: number | null;
  throughput_bps: number | null;
  latency_ms_tx: number | null;
  progress_percent: number;
  created_at: string | null;
  updated_at: string | null;
  transmitted_at: string | null;
  completed_at: string | null;
}

export interface Telemetry {
  id: number;
  image_id: string;
  mission_id: string;
  packet_type: PacketType;
  segment_num: number | null;
  total_segments: number | null;
  rssi: number | null;
  snr: number | null;
  latency_ms: number | null;
  timestamp: string;
  raw_payload: string | null;
}

export interface Retransmission {
  id: number;
  image_id: string;
  mission_id: string;
  missing_segments: number[];
  requested_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  status: RetransmissionStatus;
}

export interface Revolution {
  id: number;
  revolution_num: number;
  mission_id: string;
  window_start: string;
  window_end: string;
  window_duration_sec: number;
  images_planned: { id: string; priority: number }[] | null;
  images_completed: string[] | null;
  images_failed: string[] | null;
  status: RevolutionStatus;
  total_segments_planned: number;
  total_segments_transmitted: number;
  total_segments_confirmed: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ImagesResponse {
  images: Image[];
  total: number;
  limit: number;
  offset: number;
}

export interface ImageProgress {
  image_id: string;
  status: ImageStatus;
  total_segments: number | null;
  segments_confirmed: number;
  current_segment: number;
  progress_percent: number;
  rssi: number | null;
  snr: number | null;
  throughput_bps: number | null;
  latency_ms_tx: number | null;
}

export interface ImagesStats {
  total: number;
  by_status: Record<ImageStatus, number>;
  by_classification: Record<Classification, number>;
  by_action: Record<Action, number>;
  transmitting: number;
  complete: number;
  pending: number;
  completion_rate: number;
}

export interface TelemetryResponse {
  latest_overall: Telemetry | null;
  latest_per_image: Telemetry[];
}

export interface TelemetryHistory {
  telemetry: Telemetry[];
  by_type: Record<PacketType, Telemetry[]>;
  count: number;
  since: string;
}

export interface SignalQuality {
  telemetry: Telemetry[];
  stats: {
    rssi?: { min: number; max: number; avg: number; current: number };
    snr?: { min: number; max: number; avg: number; current: number };
  };
  count: number;
}

export interface QueueResponse {
  queue: Image[];
  count: number;
}

export interface ReorderRequest {
  id: string;
  priority: number;
}

export interface NextImageResponse {
  next: Image | null;
  message?: string;
}

export interface RetransmissionsResponse {
  retransmissions: Retransmission[];
  count: number;
}

export interface RetransmissionAckRequest {
  retransmit_id?: number;
  image_id?: string;
  segments?: number[];
}

export interface RetransmissionAckResponse {
  retransmission: Retransmission;
  message: string;
}

export interface RetransmissionStats {
  total: number;
  pending: number;
  acknowledged: number;
  completed: number;
  by_image: Record<string, number>;
}

export interface RevolutionsResponse {
  revolutions: Revolution[];
  count: number;
}

export interface RevolutionStats {
  total_revolutions: number;
  completed: number;
  active: number;
  scheduled: number;
  total_segments_planned: number;
  total_segments_confirmed: number;
  overall_success_rate: number;
}

export interface ScheduleRevolutionRequest {
  mission_id: string;
  revolution_num: number;
  window_start: string; // ISO format
  images_planned: { id: string; priority: number }[];
}

export interface RevolutionStatusResponse {
  active: boolean;
  revolution: Revolution | null;
  time_remaining: number | null;
  next_revolution: Revolution | null;
  time_until_next: number | null;
}

// WebSocket Events (Server -> Client)
export interface TelemetryUpdateEvent {
  image_id: string;
  mission_id: string;
  packet_type: PacketType;
  segment_num: number | null;
  total_segments: number | null;
  rssi: number | null;
  snr: number | null;
  latency_ms: number | null;
  timestamp: string;
  progress: number;
}

export interface ImageClassifiedEvent {
  id: string;
  mission_id: string;
  classification: Classification;
  confidence: number;
  priority: number;
  action: Action;
}

export interface ImageProgressEvent {
  id: string;
  segments_confirmed: number;
  segments_total: number;
  status: ImageStatus;
}

export interface RetransmitRequestedEvent {
  image_id: string;
  mission_id: string;
  missing_segments: number[];
}

export interface RevolutionStartEvent {
  revolution_num: number;
  mission_id: string;
  window_sec: number;
  images_in_window: { id: string; priority: number }[];
  started_at: string;
}

export interface RevolutionEndEvent {
  revolution_num: number;
  mission_id: string;
  completed: string[];
  failed: string[];
  total_segments_transmitted: number;
  total_segments_confirmed: number;
  ended_at: string;
}

// WebSocket Events (Client -> Server)
export interface RetransmitAckEvent {
  image_id: string;
  segments: number[];
}

export interface QueueReorderEvent {
  id: string;
  priority: number;
}

export interface ImageDiscardEvent {
  id: string;
}

// API Base URL
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000";