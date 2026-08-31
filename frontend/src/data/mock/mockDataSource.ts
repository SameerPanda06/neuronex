import type {
  DataSource,
  TelemetryDataSource,
  ImagesDataSource,
  QueueDataSource,
  RetransmissionDataSource,
  RevolutionsDataSource,
  ConnectionState,
} from '../types';
import type {
  Image,
  ImagesResponse,
  ImageProgress,
  ImagesStats,
  TelemetryResponse,
  TelemetryHistory,
  SignalQuality,
  QueueResponse,
  ReorderRequest,
  NextImageResponse,
  RetransmissionsResponse,
  RetransmissionAckRequest,
  RetransmissionAckResponse,
  RetransmissionStats,
  Revolution,
  RevolutionsResponse,
  RevolutionStats,
  ScheduleRevolutionRequest,
  RevolutionStatusResponse,
  PacketType,
} from '../../types';
import { mockSimulator } from './simulator';
import {
  computeMockImageStats,
  computeMockRevolutionStats,
  computeMockRetransmissionStats,
} from './mockData';

class MockTelemetryDataSource implements TelemetryDataSource {
  async getLatest(): Promise<TelemetryResponse> {
    const history = mockSimulator.getTelemetryHistory(1, 10);
    const latestOverall = history[0] || null;
    return {
      latest_overall: latestOverall,
      latest_per_image: latestOverall ? [latestOverall] : [],
    };
  }

  async getHistory(params?: { image_id?: string; hours?: number; limit?: number }): Promise<TelemetryHistory> {
    const history = mockSimulator.getTelemetryHistory(params?.hours || 24, params?.limit || 50);
    const by_type: Record<PacketType, any[]> = {
      DATA: [],
      ACK: [],
      NACK: [],
      META: [],
      STATUS: [],
      DONE: [],
      TELEMETRY: [],
    };
    history.forEach((t) => {
      if (by_type[t.packet_type]) {
        by_type[t.packet_type].push(t);
      }
    });

    return {
      telemetry: history,
      by_type,
      count: history.length,
      since: new Date(Date.now() - (params?.hours || 24) * 3600000).toISOString(),
    };
  }

  async getSignal(params?: { image_id?: string; hours?: number }): Promise<SignalQuality> {
    const history = mockSimulator.getTelemetryHistory(params?.hours || 24, 30);
    const rssiValues = history.map((t) => t.rssi).filter((v): v is number => v !== null);
    const snrValues = history.map((t) => t.snr).filter((v): v is number => v !== null);

    const rssiStats =
      rssiValues.length > 0
        ? {
            min: Math.min(...rssiValues),
            max: Math.max(...rssiValues),
            avg: parseFloat((rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length).toFixed(1)),
            current: rssiValues[0] ?? -75,
          }
        : undefined;

    const snrStats =
      snrValues.length > 0
        ? {
            min: Math.min(...snrValues),
            max: Math.max(...snrValues),
            avg: parseFloat((snrValues.reduce((a, b) => a + b, 0) / snrValues.length).toFixed(1)),
            current: snrValues[0] ?? 8.5,
          }
        : undefined;

    return {
      telemetry: history,
      stats: {
        rssi: rssiStats,
        snr: snrStats,
      },
      count: history.length,
    };
  }

  subscribeTelemetry(callback: (update: any) => void): () => void {
    return mockSimulator.on('telemetry:update', callback);
  }
}

class MockImagesDataSource implements ImagesDataSource {
  async list(params?: {
    status?: string;
    classification?: string;
    mission_id?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  }): Promise<ImagesResponse> {
    const { images, total } = mockSimulator.getImages(params);
    return {
      images,
      total,
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    };
  }

  async get(id: string): Promise<Image> {
    const img = mockSimulator.getImage(id);
    if (!img) throw new Error(`Image not found: ${id}`);
    return JSON.parse(JSON.stringify(img));
  }

  async progress(id: string): Promise<ImageProgress> {
    const img = mockSimulator.getImage(id);
    if (!img) throw new Error(`Image not found: ${id}`);
    return {
      image_id: img.id,
      status: img.status,
      total_segments: img.total_segments,
      segments_confirmed: img.segments_confirmed,
      current_segment: img.current_segment,
      progress_percent: img.progress_percent,
      rssi: img.rssi,
      snr: img.snr,
      throughput_bps: img.throughput_bps,
      latency_ms_tx: img.latency_ms_tx,
    };
  }

  async stats(): Promise<ImagesStats> {
    return computeMockImageStats(mockSimulator.getAllImages());
  }

  subscribeClassified(callback: (event: any) => void): () => void {
    return mockSimulator.on('image:classified', callback);
  }

  subscribeProgress(callback: (event: any) => void): () => void {
    return mockSimulator.on('image:progress', callback);
  }

  subscribeStatus(callback: (event: any) => void): () => void {
    return mockSimulator.on('image:status', callback);
  }
}

class MockQueueDataSource implements QueueDataSource {
  async get(): Promise<QueueResponse> {
    const queue = mockSimulator.getQueue();
    return {
      queue,
      count: queue.length,
    };
  }

  async reorder(items: ReorderRequest[]): Promise<{ updated: Image[]; count: number }> {
    const updated = mockSimulator.reorderQueue(items);
    return {
      updated,
      count: updated.length,
    };
  }

  async next(): Promise<NextImageResponse> {
    const next = mockSimulator.getNextImage();
    return {
      next,
      message: next ? undefined : 'No queued images available',
    };
  }

  subscribeQueue(callback: (data: any) => void): () => void {
    return mockSimulator.on('queue:update', callback);
  }

  subscribeReordered(callback: (data: any) => void): () => void {
    return mockSimulator.on('queue:reordered', callback);
  }
}

class MockRetransmissionDataSource implements RetransmissionDataSource {
  async list(params?: { status?: string; image_id?: string; limit?: number }): Promise<RetransmissionsResponse> {
    const retransmissions = mockSimulator.getRetransmissions(params);
    return {
      retransmissions,
      count: retransmissions.length,
    };
  }

  async get(id: number) {
    const all = mockSimulator.getAllRetransmissions();
    const item = all.find((r) => r.id === id);
    if (!item) throw new Error(`Retransmission not found: ${id}`);
    return item;
  }

  async ack(data: RetransmissionAckRequest): Promise<RetransmissionAckResponse> {
    const item = mockSimulator.ackRetransmission(data.retransmit_id, data.image_id);
    if (!item) throw new Error('Failed to acknowledge retransmission');
    return {
      retransmission: item,
      message: 'Acknowledged successfully',
    };
  }

  async complete(id: number): Promise<{ success: boolean; id: number }> {
    const success = mockSimulator.completeRetransmission(id);
    return { success, id };
  }

  async stats(): Promise<RetransmissionStats> {
    return computeMockRetransmissionStats(mockSimulator.getAllRetransmissions());
  }

  subscribeRequested(callback: (event: any) => void): () => void {
    return mockSimulator.on('retransmit:requested', callback);
  }

  subscribeAckConfirmed(callback: (event: any) => void): () => void {
    return mockSimulator.on('retransmit:ack:confirmed', callback);
  }
}

class MockRevolutionsDataSource implements RevolutionsDataSource {
  async list(params?: { mission_id?: string; status?: string; limit?: number }): Promise<RevolutionsResponse> {
    const revolutions = mockSimulator.getRevolutions(params);
    return {
      revolutions,
      count: revolutions.length,
    };
  }

  async get(num: number): Promise<Revolution> {
    const rev = mockSimulator.getRevolution(num);
    if (!rev) throw new Error(`Revolution not found: ${num}`);
    return rev;
  }

  async current(): Promise<{ current: Revolution | null; message?: string }> {
    const current = mockSimulator.getCurrentRevolution();
    return {
      current,
      message: current ? undefined : 'No active revolution window',
    };
  }

  async status(): Promise<RevolutionStatusResponse> {
    return mockSimulator.getRevolutionStatus();
  }

  async stats(): Promise<RevolutionStats> {
    return computeMockRevolutionStats(mockSimulator.getAllRevolutions());
  }

  async schedule(data: ScheduleRevolutionRequest): Promise<{ revolution: Revolution }> {
    const revolution = mockSimulator.scheduleRevolution(data);
    return { revolution };
  }

  async start(num: number): Promise<{ revolution: Revolution }> {
    const rev = mockSimulator.getRevolution(num);
    if (!rev) throw new Error(`Revolution not found: ${num}`);
    rev.status = 'active';
    rev.started_at = new Date().toISOString();
    return { revolution: rev };
  }

  async completeRevolution(
    num: number,
    data: {
      images_completed?: string[];
      images_failed?: string[];
      total_segments_transmitted?: number;
      total_segments_confirmed?: number;
    }
  ): Promise<{ revolution: Revolution }> {
    const rev = mockSimulator.getRevolution(num);
    if (!rev) throw new Error(`Revolution not found: ${num}`);
    rev.status = 'completed';
    rev.completed_at = new Date().toISOString();
    if (data.images_completed) rev.images_completed = data.images_completed;
    if (data.images_failed) rev.images_failed = data.images_failed;
    if (data.total_segments_transmitted !== undefined) {
      rev.total_segments_transmitted = data.total_segments_transmitted;
    }
    if (data.total_segments_confirmed !== undefined) {
      rev.total_segments_confirmed = data.total_segments_confirmed;
    }
    return { revolution: rev };
  }

  subscribeStart(callback: (event: any) => void): () => void {
    return mockSimulator.on('revolution:start', callback);
  }

  subscribeEnd(callback: (event: any) => void): () => void {
    return mockSimulator.on('revolution:end', callback);
  }
}

export class MockDataSource implements DataSource {
  public telemetry = new MockTelemetryDataSource();
  public images = new MockImagesDataSource();
  public queue = new MockQueueDataSource();
  public retransmissions = new MockRetransmissionDataSource();
  public revolutions = new MockRevolutionsDataSource();

  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private connected = true;

  async connect(): Promise<void> {
    this.connected = true;
    mockSimulator.start();
    this.notifyConnectionListeners();
  }

  disconnect(): void {
    mockSimulator.stop();
    this.connected = false;
    this.notifyConnectionListeners();
  }

  getConnectionState(): ConnectionState {
    return {
      connected: this.connected,
      statusText: 'SIMULATION',
      mode: 'mock',
      restStatus: 'disconnected',
      socketStatus: 'disconnected',
      telemetryFreshness: 'current',
      lastTelemetryAt: null,
      lastImageEventAt: null,
      lastSuccessfulRestAt: null,
    };
  }

  subscribeConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    callback(this.getConnectionState());
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyConnectionListeners() {
    const state = this.getConnectionState();
    this.connectionListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('[MockDataSource] Connection listener error:', err);
      }
    });
  }
}
