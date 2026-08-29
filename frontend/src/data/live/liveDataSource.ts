import {
  imagesApi,
  telemetryApi,
  queueApi,
  retransmitApi,
  revolutionsApi,
  healthApi,
} from '../../services/api';
import { socketService } from '../../services/socket';
import {
  normalizeClassifiedEvent,
  normalizeProgressEvent,
  normalizeRetransmissionEvent,
  normalizeTelemetryEvent,
} from './normalize';
import type {
  ImageClassifiedEvent, ImageProgressEvent, RetransmitRequestedEvent, TelemetryUpdateEvent,
} from '../../types';
import type {
  DataSource,
  TelemetryDataSource,
  ImagesDataSource,
  QueueDataSource,
  RetransmissionDataSource,
  RevolutionsDataSource,
  ConnectionState,
  SocketConnectionStatus,
} from '../types';

const HEALTH_INTERVAL_MS = 12_000;
const TELEMETRY_STALE_MS = 15_000;

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

  subscribeTelemetry(callback: (update: TelemetryUpdateEvent) => void): () => void {
    const unsub = socketService.on<unknown>('telemetry:update', (value) => {
      const event = normalizeTelemetryEvent(value);
      if (event) callback(event);
    });
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

  subscribeClassified(callback: (event: ImageClassifiedEvent) => void): () => void {
    return socketService.on<unknown>('image:classified', (value) => {
      const event = normalizeClassifiedEvent(value);
      if (event) callback(event);
    });
  }

  subscribeProgress(callback: (event: ImageProgressEvent) => void): () => void {
    return socketService.on<unknown>('image:progress', (value) => {
      const event = normalizeProgressEvent(value);
      if (event) callback(event);
    });
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

  subscribeRequested(callback: (event: RetransmitRequestedEvent) => void): () => void {
    return socketService.on<unknown>('retransmit:requested', (value) => {
      const event = normalizeRetransmissionEvent(value);
      if (event) callback(event);
    });
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
  private restStatus: ConnectionState['restStatus'] = 'checking';
  private socketStatus: SocketConnectionStatus = 'disconnected';
  private lastTelemetryAt: string | null = null;
  private lastImageEventAt: string | null = null;
  private lastSuccessfulRestAt: string | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private freshnessTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckInFlight = false;
  private started = false;

  constructor() {
    socketService.on<SocketConnectionStatus>('socket:state', (status) => {
      this.socketStatus = status;
      this.notifyConnectionListeners();
    });
    socketService.on('telemetry:update', () => {
      this.lastTelemetryAt = new Date().toISOString();
      this.notifyConnectionListeners();
    });
    ['image:classified', 'image:progress', 'image:status'].forEach((event) => {
      socketService.on(event, () => {
        this.lastImageEventAt = new Date().toISOString();
        this.notifyConnectionListeners();
      });
    });
  }

  async connect(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.restStatus = 'checking';
    this.socketStatus = 'connecting';
    this.notifyConnectionListeners();
    void this.checkHealth();
    this.healthTimer = setInterval(() => void this.checkHealth(), HEALTH_INTERVAL_MS);
    this.freshnessTimer = setInterval(() => this.notifyConnectionListeners(), 2_000);
    try { await socketService.connect(); } catch { /* Reconnection remains active. */ }
  }

  disconnect(): void {
    this.started = false;
    if (this.healthTimer) clearInterval(this.healthTimer);
    if (this.freshnessTimer) clearInterval(this.freshnessTimer);
    this.healthTimer = null;
    this.freshnessTimer = null;
    socketService.disconnect();
    this.socketStatus = 'disconnected';
    this.restStatus = 'disconnected';
    this.notifyConnectionListeners();
  }

  getConnectionState(): ConnectionState {
    const telemetryFreshness = this.getTelemetryFreshness();
    const connected = this.restStatus === 'connected' && this.socketStatus === 'connected';
    let statusText: ConnectionState['statusText'] = 'RECONNECTING';
    if (this.restStatus === 'disconnected') statusText = 'BACKEND OFFLINE';
    else if (connected && telemetryFreshness === 'stale') statusText = 'STALE TELEMETRY';
    else if (connected) statusText = 'LIVE HARDWARE';
    return {
      connected,
      statusText,
      mode: 'live',
      restStatus: this.restStatus,
      socketStatus: this.socketStatus,
      telemetryFreshness,
      lastTelemetryAt: this.lastTelemetryAt,
      lastImageEventAt: this.lastImageEventAt,
      lastSuccessfulRestAt: this.lastSuccessfulRestAt,
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

  private getTelemetryFreshness(): ConnectionState['telemetryFreshness'] {
    if (!this.lastTelemetryAt) return 'no_data';
    const timestamp = Date.parse(this.lastTelemetryAt);
    return Number.isFinite(timestamp) && Date.now() - timestamp <= TELEMETRY_STALE_MS
      ? 'current'
      : 'stale';
  }

  private async checkHealth(): Promise<void> {
    if (!this.started || this.healthCheckInFlight) return;
    this.healthCheckInFlight = true;
    try {
      await healthApi.check();
      if (!this.started) return;
      this.restStatus = 'connected';
      this.lastSuccessfulRestAt = new Date().toISOString();
    } catch {
      if (!this.started) return;
      this.restStatus = 'disconnected';
    } finally {
      this.healthCheckInFlight = false;
      if (this.started) this.notifyConnectionListeners();
    }
  }
}
