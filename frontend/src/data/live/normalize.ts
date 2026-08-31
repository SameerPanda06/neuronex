import type {
  Action, Classification, ImageClassifiedEvent, ImageProgressEvent, ImageStatus,
  PacketType, RetransmitRequestedEvent, TelemetryUpdateEvent,
} from '../../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const string = (value: unknown): string | null => typeof value === 'string' && value.length > 0 ? value : null;
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const nullableFinite = (value: unknown): number | null => value === null ? null : finite(value);
const PACKETS: PacketType[] = ['DATA', 'ACK', 'NACK', 'META', 'STATUS', 'DONE', 'TELEMETRY'];
const STATUSES: ImageStatus[] = ['pending', 'classified', 'queued', 'transmitting', 'complete', 'discarded', 'failed'];
const CLASSIFICATIONS: Classification[] = ['CLEAR', 'CLOUDY', 'NOT_VISIBLE', 'UNKNOWN'];
const ACTIONS: Action[] = ['keep', 'defer', 'discard'];

export function normalizeTelemetryEvent(value: unknown): TelemetryUpdateEvent | null {
  if (!isRecord(value)) return null;
  const image_id = string(value.image_id);
  const mission_id = string(value.mission_id);
  const timestamp = string(value.timestamp);
  const packet_type = PACKETS.includes(value.packet_type as PacketType) ? value.packet_type as PacketType : null;
  if (!image_id || !mission_id || !timestamp || !packet_type) return null;
  return {
    image_id, mission_id, timestamp, packet_type,
    segment_num: nullableFinite(value.segment_num), total_segments: nullableFinite(value.total_segments),
    rssi: nullableFinite(value.rssi), snr: nullableFinite(value.snr), latency_ms: nullableFinite(value.latency_ms),
    progress: Math.min(100, Math.max(0, finite(value.progress) ?? 0)),
  };
}

export function normalizeClassifiedEvent(value: unknown): ImageClassifiedEvent | null {
  if (!isRecord(value)) return null;
  const id = string(value.id);
  const mission_id = string(value.mission_id);
  const classification = CLASSIFICATIONS.includes(value.classification as Classification) ? value.classification as Classification : null;
  const action = ACTIONS.includes(value.action as Action) ? value.action as Action : null;
  const confidence = finite(value.confidence);
  const priority = finite(value.priority);
  if (!id || !mission_id || !classification || !action || confidence === null || priority === null) return null;
  return { id, mission_id, classification, action, confidence: Math.min(1, Math.max(0, confidence)), priority };
}

export function normalizeProgressEvent(value: unknown): ImageProgressEvent | null {
  if (!isRecord(value)) return null;
  const id = string(value.id);
  const confirmed = finite(value.segments_confirmed);
  const total = finite(value.segments_total);
  const status = STATUSES.includes(value.status as ImageStatus) ? value.status as ImageStatus : null;
  if (!id || confirmed === null || total === null || !status) return null;
  return { id, segments_confirmed: Math.max(0, confirmed), segments_total: Math.max(0, total), status };
}

export function normalizeRetransmissionEvent(value: unknown): RetransmitRequestedEvent | null {
  if (!isRecord(value)) return null;
  const image_id = string(value.image_id);
  const mission_id = string(value.mission_id);
  if (!image_id || !mission_id || !Array.isArray(value.missing_segments)) return null;
  const missing_segments = value.missing_segments.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0);
  return { image_id, mission_id, missing_segments };
}
