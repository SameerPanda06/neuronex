import type {
  Image, ImageClassifiedEvent, ImageProgressEvent, ImageStatus, Retransmission,
  Revolution, RevolutionEndEvent, RevolutionStartEvent, Telemetry, TelemetryUpdateEvent,
} from '../../types';
import { REPLAY_IMAGES, REPLAY_MISSION_ID, REPLAY_REVOLUTION, REPLAY_REVOLUTIONS, REPLAY_STARTED_AT } from './fixtures/missionReplay';

type Listener = (data: unknown) => void;
const clone = <T>(value: T): T => structuredClone(value);

export class ReplayEngine {
  private images: Image[] = [];
  private telemetry: Telemetry[] = [];
  private retransmissions: Retransmission[] = [];
  private revolutions: Revolution[] = [];
  private listeners = new Map<string, Set<Listener>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickNumber = 0;
  private telemetryId = 1;

  constructor(private readonly speed = 1) { this.reset(); }

  reset(): void {
    this.stop();
    this.images = clone(REPLAY_IMAGES);
    this.revolutions = clone(REPLAY_REVOLUTIONS);
    this.telemetry = [];
    this.retransmissions = [];
    this.tickNumber = 0;
    this.telemetryId = 1;
  }

  start(): void {
    if (this.timer) return;
    this.emitRevolutionStart();
    this.timer = setInterval(() => this.tick(), Math.max(100, 1000 / this.speed));
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  on<T>(event: string, callback: (data: T) => void): () => void {
    const callbacks = this.listeners.get(event) ?? new Set<Listener>();
    callbacks.add(callback as Listener);
    this.listeners.set(event, callbacks);
    return () => callbacks.delete(callback as Listener);
  }

  getImages(params?: { status?: string; classification?: string; mission_id?: string; limit?: number; offset?: number; sort?: string; order?: string }) {
    let images = this.images.filter((item) =>
      (!params?.status || item.status === params.status)
      && (!params?.classification || item.classification === params.classification)
      && (!params?.mission_id || item.mission_id === params.mission_id));
    if (params?.sort) {
      const key = params.sort as keyof Image;
      images = [...images].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * (params.order === 'asc' ? 1 : -1));
    }
    const total = images.length;
    const offset = params?.offset ?? 0;
    return { images: clone(images.slice(offset, offset + (params?.limit ?? 100))), total };
  }

  getImage(id: string): Image | undefined { return clone(this.images.find((item) => item.id === id)); }
  getQueue(): Image[] { return clone(this.images.filter((item) => item.status === 'queued' || item.status === 'transmitting')); }
  getNextImage(): Image | null { return clone(this.images.find((item) => item.status === 'queued') ?? null); }
  getTelemetry(limit = 50): Telemetry[] { return clone(this.telemetry.slice(0, limit)); }
  getRetransmissions(params?: { status?: string; image_id?: string; limit?: number }): Retransmission[] {
    return clone(this.retransmissions.filter((item) =>
      (!params?.status || item.status === params.status) && (!params?.image_id || item.image_id === params.image_id)
    ).slice(0, params?.limit ?? 50));
  }
  getRevolutions(params?: { mission_id?: string; status?: string; limit?: number }): Revolution[] {
    return clone(this.revolutions.filter((item) =>
      (!params?.mission_id || item.mission_id === params.mission_id) && (!params?.status || item.status === params.status)
    ).slice(0, params?.limit ?? 50));
  }
  getRevolution(num: number): Revolution | undefined { return clone(this.revolutions.find((item) => item.revolution_num === num)); }
  getCurrentRevolution(): Revolution | null { return clone(this.revolutions.find((item) => item.status === 'active') ?? null); }
  getTimeRemaining(): number | null { return this.getCurrentRevolution() ? Math.max(0, 24 - this.tickNumber) : null; }

  reorder(items: { id: string; priority: number }[]): Image[] {
    items.forEach(({ id, priority }) => { const item = this.images.find((image) => image.id === id); if (item) item.priority = priority; });
    this.emit('queue:reordered', { queue: items });
    const queue = this.getQueue();
    this.emit('queue:update', { queue });
    return queue;
  }

  acknowledge(id?: number, imageId?: string): Retransmission | null {
    const item = this.retransmissions.find((entry) => entry.status === 'pending' && (entry.id === id || entry.image_id === imageId));
    if (!item) return null;
    item.status = 'acknowledged';
    item.acknowledged_at = this.timeAt(this.tickNumber);
    this.emit('retransmit:ack:confirmed', { received: { retransmit_id: item.id, image_id: item.image_id }, status: 'acknowledged' });
    return clone(item);
  }

  completeRetransmission(id: number): boolean {
    const item = this.retransmissions.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = 'completed';
    item.completed_at = this.timeAt(this.tickNumber);
    this.emit('retransmit:ack:confirmed', { received: { retransmit_id: item.id, image_id: item.image_id }, status: 'completed', completed_at: item.completed_at });
    return true;
  }

  private tick(): void {
    this.tickNumber += 1;
    if (this.tickNumber <= 20) this.transmit(this.tickNumber <= 12 ? 'IMG-REPLAY-001' : 'IMG-REPLAY-002');
    if (this.tickNumber === 2) this.emitClassification('IMG-REPLAY-001');
    if (this.tickNumber === 4) this.emitClassification('IMG-REPLAY-002');
    if (this.tickNumber === 5) this.requestRetransmission();
    if (this.tickNumber === 6) this.emitClassification('IMG-REPLAY-003');
    if (this.tickNumber === 7) this.acknowledge(2101);
    if (this.tickNumber === 9) this.completeRetransmission(2101);
    if (this.tickNumber === 12) this.completeImage('IMG-REPLAY-001');
    if (this.tickNumber === 13) this.setImageStatus('IMG-REPLAY-002', 'transmitting');
    if (this.tickNumber === 20) this.completeImage('IMG-REPLAY-002');
    if (this.tickNumber === 24) this.completeRevolution();
  }

  private transmit(id: string): void {
    const item = this.images.find((image) => image.id === id);
    const revolution = this.revolutions[0];
    if (!item || !item.total_segments || item.status === 'complete') return;
    const confirmed = Math.min(item.total_segments, item.segments_confirmed + (id.endsWith('001') ? 5 : 5));
    const phase = this.tickNumber % 8;
    item.segments_confirmed = confirmed;
    item.current_segment = confirmed;
    item.progress_percent = Math.min(100, Math.round(confirmed / item.total_segments * 100));
    item.rssi = [-82, -79, -75, -71, -68, -70, -74, -78][phase];
    item.snr = [5.2, 6.1, 7.4, 9.2, 10.8, 9.7, 8.1, 6.5][phase];
    item.throughput_bps = [3200, 3700, 4300, 5100, 5600, 5250, 4600, 3900][phase];
    item.latency_ms_tx = [61, 56, 49, 42, 38, 41, 47, 54][phase];
    item.updated_at = this.timeAt(this.tickNumber);
    revolution.total_segments_transmitted = Math.min(revolution.total_segments_planned, revolution.total_segments_transmitted + 5);
    revolution.total_segments_confirmed = Math.min(revolution.total_segments_transmitted, revolution.total_segments_confirmed + 5);
    const telemetry: Telemetry = {
      id: this.telemetryId++, image_id: item.id, mission_id: item.mission_id,
      packet_type: this.tickNumber % 5 === 0 ? 'TELEMETRY' : 'DATA', segment_num: confirmed,
      total_segments: item.total_segments, rssi: item.rssi, snr: item.snr,
      latency_ms: item.latency_ms_tx, timestamp: item.updated_at, raw_payload: null,
    };
    this.telemetry.unshift(telemetry);
    const update: TelemetryUpdateEvent = { ...telemetry, progress: item.progress_percent };
    this.emit('telemetry:update', update);
    const progress: ImageProgressEvent = { id: item.id, segments_confirmed: confirmed, segments_total: item.total_segments, status: item.status };
    this.emit('image:progress', progress);
  }

  private requestRetransmission(): void {
    const retransmission: Retransmission = {
      id: 2101, image_id: 'IMG-REPLAY-001', mission_id: REPLAY_MISSION_ID,
      missing_segments: [17, 23], requested_at: this.timeAt(this.tickNumber),
      acknowledged_at: null, completed_at: null, status: 'pending',
    };
    this.retransmissions.unshift(retransmission);
    this.emit('retransmit:requested', { image_id: retransmission.image_id, mission_id: retransmission.mission_id, missing_segments: retransmission.missing_segments });
  }

  private emitClassification(id: string): void {
    const item = this.images.find((image) => image.id === id);
    if (!item?.classification || !item.action || item.confidence === null) return;
    const event: ImageClassifiedEvent = { id: item.id, mission_id: item.mission_id, classification: item.classification, confidence: item.confidence, priority: item.priority, action: item.action };
    this.emit('image:classified', event);
  }

  private completeImage(id: string): void {
    const item = this.images.find((image) => image.id === id);
    if (!item || !item.total_segments) return;
    item.segments_confirmed = item.total_segments;
    item.current_segment = item.total_segments;
    item.progress_percent = 100;
    item.completed_at = this.timeAt(this.tickNumber);
    this.setImageStatus(id, 'complete');
    const revolution = this.revolutions[0];
    revolution.images_completed = Array.from(new Set([...(revolution.images_completed ?? []), id]));
    this.emit('queue:update', { queue: this.getQueue() });
  }

  private setImageStatus(id: string, status: ImageStatus): void {
    const item = this.images.find((image) => image.id === id);
    if (!item) return;
    item.status = status;
    if (status === 'transmitting') item.transmitted_at = this.timeAt(this.tickNumber);
    this.emit('image:status', { image_id: id, status });
    this.emit('queue:update', { queue: this.getQueue() });
  }

  private emitRevolutionStart(): void {
    const event: RevolutionStartEvent = { revolution_num: REPLAY_REVOLUTION, mission_id: REPLAY_MISSION_ID, window_sec: 30, images_in_window: clone(this.revolutions[0].images_planned ?? []), started_at: REPLAY_STARTED_AT };
    this.emit('revolution:start', event);
  }

  private completeRevolution(): void {
    const revolution = this.revolutions[0];
    revolution.status = 'completed';
    revolution.completed_at = this.timeAt(this.tickNumber);
    const event: RevolutionEndEvent = {
      revolution_num: revolution.revolution_num, mission_id: revolution.mission_id,
      completed: clone(revolution.images_completed ?? []), failed: [],
      total_segments_transmitted: revolution.total_segments_transmitted,
      total_segments_confirmed: revolution.total_segments_confirmed, ended_at: revolution.completed_at,
    };
    this.emit('revolution:end', event);
  }

  private timeAt(seconds: number): string { return new Date(Date.parse(REPLAY_STARTED_AT) + seconds * 1000).toISOString(); }
  private emit(event: string, data: unknown): void { this.listeners.get(event)?.forEach((callback) => callback(clone(data))); }
}
