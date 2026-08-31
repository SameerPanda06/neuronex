import type { DataSource, ConnectionState } from '../types';
import type {
  Image, ImageProgress, ImageStatus, ReorderRequest, RetransmissionAckRequest,
  ScheduleRevolutionRequest, Telemetry, TelemetryUpdateEvent, PacketType,
} from '../../types';
import { REPLAY_SPEED } from '../../config/runtime';
import { computeMockImageStats, computeMockRetransmissionStats, computeMockRevolutionStats } from '../mock/mockData';
import { ReplayEngine } from './replayEngine';

export class ReplayDataSource implements DataSource {
  private readonly engine = new ReplayEngine(REPLAY_SPEED);
  private readonly connectionListeners = new Set<(state: ConnectionState) => void>();
  private running = false;
  private lastTelemetryAt: string | null = null;
  private lastImageEventAt: string | null = null;

  constructor() {
    this.engine.on<TelemetryUpdateEvent>('telemetry:update', () => {
      this.lastTelemetryAt = new Date().toISOString();
      this.notify();
    });
    ['image:classified', 'image:progress', 'image:status'].forEach((event) => {
      this.engine.on(event, () => {
        this.lastImageEventAt = new Date().toISOString();
        this.notify();
      });
    });
  }

  telemetry = {
    getLatest: async () => {
      const telemetry = this.engine.getTelemetry();
      const latest = telemetry[0] ?? null;
      const latestByImage = new Map<string, Telemetry>();
      telemetry.forEach((item) => { if (!latestByImage.has(item.image_id)) latestByImage.set(item.image_id, item); });
      return { latest_overall: latest, latest_per_image: [...latestByImage.values()] };
    },
    getHistory: async (params?: { image_id?: string; mission_id?: string; hours?: number; limit?: number }) => {
      const telemetry = this.engine.getTelemetry(params?.limit ?? 50).filter((item) =>
        (!params?.image_id || item.image_id === params.image_id) && (!params?.mission_id || item.mission_id === params.mission_id));
      const by_type = { DATA: [], ACK: [], NACK: [], META: [], STATUS: [], DONE: [], TELEMETRY: [] } as Record<PacketType, Telemetry[]>;
      telemetry.forEach((item) => by_type[item.packet_type].push(item));
      return { telemetry, by_type, count: telemetry.length, since: telemetry[telemetry.length - 1]?.timestamp ?? '' };
    },
    getSignal: async (params?: { image_id?: string; hours?: number }) => {
      const telemetry = this.engine.getTelemetry().filter((item) => !params?.image_id || item.image_id === params.image_id);
      const summarize = (values: number[]) => values.length ? { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length, current: values[0] } : undefined;
      const rssi = telemetry.map((item) => item.rssi).filter((value): value is number => value !== null);
      const snr = telemetry.map((item) => item.snr).filter((value): value is number => value !== null);
      return { telemetry, stats: { rssi: summarize(rssi), snr: summarize(snr) }, count: telemetry.length };
    },
    subscribeTelemetry: (callback: Parameters<DataSource['telemetry']['subscribeTelemetry']>[0]) => this.engine.on('telemetry:update', callback),
  };

  images = {
    list: async (params?: Parameters<DataSource['images']['list']>[0]) => {
      const result = this.engine.getImages(params);
      return { ...result, limit: params?.limit ?? 100, offset: params?.offset ?? 0 };
    },
    get: async (id: string) => { const item = this.engine.getImage(id); if (!item) throw new Error(`Image not found: ${id}`); return item; },
    progress: async (id: string): Promise<ImageProgress> => {
      const item = this.engine.getImage(id); if (!item) throw new Error(`Image not found: ${id}`);
      return { image_id: item.id, status: item.status, total_segments: item.total_segments, segments_confirmed: item.segments_confirmed, current_segment: item.current_segment, progress_percent: item.progress_percent, rssi: item.rssi, snr: item.snr, throughput_bps: item.throughput_bps, latency_ms_tx: item.latency_ms_tx };
    },
    stats: async () => computeMockImageStats(this.engine.getImages().images),
    subscribeClassified: (callback: Parameters<DataSource['images']['subscribeClassified']>[0]) => this.engine.on('image:classified', callback),
    subscribeProgress: (callback: Parameters<DataSource['images']['subscribeProgress']>[0]) => this.engine.on('image:progress', callback),
    subscribeStatus: (callback: (event: { image_id: string; status: ImageStatus }) => void) => this.engine.on('image:status', callback),
  };

  queue = {
    get: async () => { const queue = this.engine.getQueue(); return { queue, count: queue.length }; },
    reorder: async (items: ReorderRequest[]) => { const updated = this.engine.reorder(items); return { updated, count: updated.length }; },
    next: async () => ({ next: this.engine.getNextImage() }),
    subscribeQueue: (callback: (data: { queue: Image[] }) => void) => this.engine.on('queue:update', callback),
    subscribeReordered: (callback: (data: { queue: ReorderRequest[] }) => void) => this.engine.on('queue:reordered', callback),
  };

  retransmissions = {
    list: async (params?: Parameters<DataSource['retransmissions']['list']>[0]) => { const retransmissions = this.engine.getRetransmissions(params); return { retransmissions, count: retransmissions.length }; },
    get: async (id: number) => { const item = this.engine.getRetransmissions().find((entry) => entry.id === id); if (!item) throw new Error(`Retransmission not found: ${id}`); return item; },
    ack: async (data: RetransmissionAckRequest) => { const item = this.engine.acknowledge(data.retransmit_id, data.image_id); if (!item) throw new Error('Retransmission not found'); return { retransmission: item, message: 'Replay acknowledgement applied' }; },
    complete: async (id: number) => ({ success: this.engine.completeRetransmission(id), id }),
    stats: async () => computeMockRetransmissionStats(this.engine.getRetransmissions()),
    subscribeRequested: (callback: Parameters<DataSource['retransmissions']['subscribeRequested']>[0]) => this.engine.on('retransmit:requested', callback),
    subscribeAckConfirmed: (callback: Parameters<DataSource['retransmissions']['subscribeAckConfirmed']>[0]) => this.engine.on('retransmit:ack:confirmed', callback),
  };

  revolutions = {
    list: async (params?: Parameters<DataSource['revolutions']['list']>[0]) => { const revolutions = this.engine.getRevolutions(params); return { revolutions, count: revolutions.length }; },
    get: async (num: number) => { const item = this.engine.getRevolution(num); if (!item) throw new Error(`Revolution not found: ${num}`); return item; },
    current: async () => ({ current: this.engine.getCurrentRevolution() }),
    status: async () => ({ active: this.engine.getCurrentRevolution() !== null, revolution: this.engine.getCurrentRevolution(), time_remaining: this.engine.getTimeRemaining(), next_revolution: null, time_until_next: null }),
    stats: async () => computeMockRevolutionStats(this.engine.getRevolutions()),
    schedule: async (_data: ScheduleRevolutionRequest) => { throw new Error('Replay fixture is read-only'); },
    start: async (_num: number) => { throw new Error('Replay fixture is read-only'); },
    completeRevolution: async (_num: number, _data: { images_completed?: string[]; images_failed?: string[]; total_segments_transmitted?: number; total_segments_confirmed?: number }) => { throw new Error('Replay fixture is read-only'); },
    subscribeStart: (callback: Parameters<DataSource['revolutions']['subscribeStart']>[0]) => this.engine.on('revolution:start', callback),
    subscribeEnd: (callback: Parameters<DataSource['revolutions']['subscribeEnd']>[0]) => this.engine.on('revolution:end', callback),
  };

  async connect(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lastTelemetryAt = null;
    this.lastImageEventAt = null;
    this.engine.reset();
    this.engine.start();
    this.notify();
  }

  disconnect(): void {
    this.running = false;
    this.engine.stop();
    this.notify();
  }

  getConnectionState(): ConnectionState {
    return { connected: this.running, statusText: 'MISSION REPLAY', mode: 'replay', restStatus: 'disconnected', socketStatus: 'disconnected', telemetryFreshness: this.lastTelemetryAt ? 'current' : 'no_data', lastTelemetryAt: this.lastTelemetryAt, lastImageEventAt: this.lastImageEventAt, lastSuccessfulRestAt: null };
  }

  subscribeConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    callback(this.getConnectionState());
    return () => this.connectionListeners.delete(callback);
  }

  private notify(): void { const state = this.getConnectionState(); this.connectionListeners.forEach((callback) => callback(state)); }
}
