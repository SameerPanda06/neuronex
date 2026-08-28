import {
  imagesApi,
  telemetryApi,
  queueApi,
  retransmitApi,
  revolutionsApi,
} from '../../services/api';
import { socketService } from '../../services/socket';
import type {
  DataSource,
  TelemetryDataSource,
  ImagesDataSource,
  QueueDataSource,
  RetransmissionDataSource,
  RevolutionsDataSource,
  ConnectionState,
} from '../types';

class LiveTelemetryDataSource implements TelemetryDataSource {
  async getLatest() {
    const res = await telemetryApi.latest();
    return res.data;
  }

  async getHistory(params?: { image_id?: string; mission_id?: string; hours?: number; limit?: number }) {
    const res = await telemetryApi.history(params);
    return res.data;
  }

  async getSignal(params?: { image_id?: string; hours?: number }) {
    const res = await telemetryApi.signal(params);
    return res.data;
  }

  subscribeTelemetry(callback: (update: any) => void): () => void {
    const unsub = socketService.on('telemetry:update', callback);
    socketService.joinTelemetry();
    return () => {
      unsub();
      socketService.leaveTelemetry();
    };
  }
}

class LiveImagesDataSource implements ImagesDataSource {
  async list(params?: {
    status?: string;
    classification?: string;
    mission_id?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  }) {
    const res = await imagesApi.list(params);
    return res.data;
  }

  async get(id: string) {
    const res = await imagesApi.get(id);
    return res.data;
  }

  async progress(id: string) {
    const res = await imagesApi.progress(id);
    return res.data;
  }

  async stats() {
    const res = await imagesApi.stats();
    return res.data;
  }

  subscribeClassified(callback: (event: any) => void): () => void {
    return socketService.on('image:classified', callback);
  }

  subscribeProgress(callback: (event: any) => void): () => void {
    return socketService.on('image:progress', callback);
  }

  subscribeStatus(callback: (event: any) => void): () => void {
    return socketService.on('image:status', callback);
  }
}

class LiveQueueDataSource implements QueueDataSource {
  async get() {
    const res = await queueApi.get();
    return res.data;
  }

  async reorder(items: any[]) {
    const res = await queueApi.reorder(items);
    return res.data;
  }

  async next() {
    const res = await queueApi.next();
    return res.data;
  }

  subscribeQueue(callback: (data: any) => void): () => void {
    const unsub = socketService.on('queue:update', callback);
    socketService.joinQueue();
    return () => {
      unsub();
      socketService.leaveQueue();
    };
  }

  subscribeReordered(callback: (data: any) => void): () => void {
    return socketService.on('queue:reordered', callback);
  }
}

class LiveRetransmissionDataSource implements RetransmissionDataSource {
  async list(params?: { status?: string; image_id?: string; limit?: number }) {
    const res = await retransmitApi.list(params);
    return res.data;
  }

  async get(id: number) {
    const res = await retransmitApi.get(id);
    return res.data;
  }

  async ack(data: any) {
    const res = await retransmitApi.ack(data);
    return res.data;
  }

  async complete(id: number) {
    const res = await retransmitApi.complete(id);
    return res.data || { success: true, id };
  }

  async stats() {
    const res = await retransmitApi.stats();
    return res.data;
  }

  subscribeRequested(callback: (event: any) => void): () => void {
    return socketService.on('retransmit:requested', callback);
  }

  subscribeAckConfirmed(callback: (event: any) => void): () => void {
    return socketService.on('retransmit:ack:confirmed', callback);
  }
}

class LiveRevolutionsDataSource implements RevolutionsDataSource {
  async list(params?: { mission_id?: string; status?: string; limit?: number }) {
    const res = await revolutionsApi.list(params);
    return res.data;
  }

  async get(num: number) {
    const res = await revolutionsApi.get(num);
    return res.data;
  }

  async current() {
    const res = await revolutionsApi.current();
    return res.data;
  }

  async status() {
    const res = await revolutionsApi.status();
    return res.data;
  }

  async stats() {
    const res = await revolutionsApi.stats();
    return res.data;
  }

  async schedule(data: any) {
    const res = await revolutionsApi.schedule(data);
    return res.data;
  }

  async start(num: number) {
    const res = await revolutionsApi.start(num);
    return res.data;
  }

  async completeRevolution(num: number, data: any) {
    const res = await revolutionsApi.complete(num, data);
    return res.data;
  }

  subscribeStart(callback: (event: any) => void): () => void {
    return socketService.on('revolution:start', callback);
  }

  subscribeEnd(callback: (event: any) => void): () => void {
    return socketService.on('revolution:end', callback);
  }
}

export class LiveDataSource implements DataSource {
  public telemetry = new LiveTelemetryDataSource();
  public images = new LiveImagesDataSource();
  public queue = new LiveQueueDataSource();
  public retransmissions = new LiveRetransmissionDataSource();
  public revolutions = new LiveRevolutionsDataSource();

  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private connected = false;

  constructor() {
    socketService.on('connected', () => {
      this.connected = true;
      this.notifyConnectionListeners();
    });

    socketService.on('disconnected', () => {
      this.connected = false;
      this.notifyConnectionListeners();
    });
  }

  async connect(): Promise<void> {
    try {
      await socketService.connect();
      this.connected = socketService.isConnected();
    } catch {
      this.connected = false;
    }
    this.notifyConnectionListeners();
  }

  disconnect(): void {
    socketService.disconnect();
    this.connected = false;
    this.notifyConnectionListeners();
  }

  getConnectionState(): ConnectionState {
    return {
      connected: this.connected,
      statusText: this.connected ? 'LIVE HARDWARE' : 'BACKEND OFFLINE',
      mode: 'live',
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
        console.error('[LiveDataSource] Connection listener error:', err);
      }
    });
  }
}
