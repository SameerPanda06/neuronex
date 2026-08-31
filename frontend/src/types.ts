// Types matching backend CONTRACT.md

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

export interface ImagesResponse {
  images: Image[];
  total: number;
  limit: number;
  offset: number;
}

export interface ImagesStats {
  total: number;
  by_status: Record<ImageStatus, number>;
  by_classification: Record<Classification, number>;
  avg_progress: number;
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
  raw_payload: string | null;
  timestamp: string;
}

export interface TelemetryResponse {
  latest_overall: Telemetry | null;
  latest_per_image: Telemetry[];
}

export interface SignalQuality {
  rssi: number;
  snr: number;
  quality: "excellent" | "good" | "fair" | "poor" | "critical";
  color: string;
}

export interface QueueResponse {
  queue: Image[];
}

export interface Retransmission {
  id: number;
  image_id: string;
  mission_id: string;
  missing_segments: number[];
  status: RetransmissionStatus;
  requested_at: string;
  completed_at: string | null;
}

export interface RetransmissionsResponse {
  retransmissions: Retransmission[];
}

export interface Revolution {
  id: number;
  number: number;
  status: RevolutionStatus;
  started_at: string | null;
  completed_at: string | null;
  images_transmitted: number;
  images_total: number;
}

export interface RevolutionStats {
  total_revolutions: number;
  completed: number;
  active: number;
  avg_duration_seconds: number;
}

export interface RevolutionStatusResponse {
  current_revolution: number;
  total_revolutions: number;
  status: RevolutionStatus;
  started_at: string | null;
}

export interface ScheduleState {
  revs_per_day: number;
  interval_hours: number;
  window_minutes: number;
  current_revolution: number;
  total_revs_today: number;
  window_active: boolean;
  is_in_window: boolean;
  downlink_countdown: string;
  next_rev_countdown: string;
  window_start_utc: string | null;
  window_end_utc: string | null;
  next_rev_utc: string | null;
  progress_percent: number;
  phase: "downlink" | "orbit";
}

export interface CommandResponse {
  status: string;
  priority?: number;
  cmd?: string;
  queued?: number;
}

export interface StorageStats {
  total_images: number;
  completed_images: number;
  in_progress: number;
  total_size_bytes: number;
  total_size_mb: number;
  max_size_gb: number;
  max_images: number;
}

// WebSocket event types
export interface TelemetryUpdateEvent {
  image_id: string;
  mission_id: string;
  packet_type: string;
  segment_num: number;
  total_segments: number;
  rssi: number;
  snr: number;
  latency_ms: number;
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
  progress_percent: number;
}

export interface RetransmitRequestedEvent {
  image_id: string;
  mission_id: string;
  missing_segments: number[];
}

export interface RevolutionStartEvent {
  revolution: number;
  timestamp: string;
}

export interface RevolutionEndEvent {
  revolution: number;
  images_transmitted: number;
  timestamp: string;
}

export interface ScheduleUpdateEvent extends ScheduleState {}
