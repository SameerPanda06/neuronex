import { io, type Socket } from 'socket.io-client';
import type { ImageDiscardEvent, QueueReorderEvent, RetransmitAckEvent } from '../types';
import type { SocketConnectionStatus } from '../data/types';
import { SOCKET_URL } from '../config/runtime';

type EventCallback<T> = (data: T) => void;
const FORWARDED_EVENTS = [
  'telemetry:update', 'image:classified', 'image:progress', 'retransmit:requested',
  'revolution:start', 'revolution:end', 'queue:update', 'image:status', 'pong',
  'telemetry:subscribed', 'telemetry:unsubscribed', 'queue:subscribed',
  'queue:unsubscribed', 'retransmit:ack:confirmed', 'queue:reordered',
  'image:discarded', 'revolution:triggered',
] as const;

class SocketService {
  private socket: Socket | null = null;
  private connectPromise: Promise<void> | null = null;
  private status: SocketConnectionStatus = 'disconnected';
  private listeners = new Map<string, Set<EventCallback<unknown>>>();
  private telemetrySubscribers = 0;
  private queueSubscribers = 0;

  connect(url = SOCKET_URL): Promise<void> {
    if (this.socket?.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    const socket = this.ensureSocket(url);
    this.setStatus(socket.active ? 'reconnecting' : 'connecting');
    this.connectPromise = new Promise<void>((resolve, reject) => {
      const finish = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onInitialError);
        this.connectPromise = null;
      };
      const onConnect = () => { finish(); resolve(); };
      const onInitialError = (error: Error) => { finish(); reject(error); };
      socket.once('connect', onConnect);
      socket.once('connect_error', onInitialError);
      socket.connect();
    });
    return this.connectPromise;
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.io.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connectPromise = null;
    this.setStatus('disconnected');
  }

  isConnected(): boolean { return this.socket?.connected === true; }
  getStatus(): SocketConnectionStatus { return this.status; }

  on<T>(event: string, callback: EventCallback<T>): () => void {
    const callbacks = this.listeners.get(event) ?? new Set<EventCallback<unknown>>();
    callbacks.add(callback as EventCallback<unknown>);
    this.listeners.set(event, callbacks);
    return () => callbacks.delete(callback as EventCallback<unknown>);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
  }

  emit(event: string, data: unknown): void { this.socket?.emit(event, data); }

  joinTelemetry(): void {
    this.telemetrySubscribers += 1;
    if (this.telemetrySubscribers === 1 && this.isConnected()) this.emit('join:telemetry', {});
  }
  leaveTelemetry(): void {
    this.telemetrySubscribers = Math.max(0, this.telemetrySubscribers - 1);
    if (this.telemetrySubscribers === 0 && this.isConnected()) this.emit('leave:telemetry', {});
  }
  joinQueue(): void {
    this.queueSubscribers += 1;
    if (this.queueSubscribers === 1 && this.isConnected()) this.emit('join:queue', {});
  }
  leaveQueue(): void {
    this.queueSubscribers = Math.max(0, this.queueSubscribers - 1);
    if (this.queueSubscribers === 0 && this.isConnected()) this.emit('leave:queue', {});
  }

  acknowledgeRetransmission(data: RetransmitAckEvent): void { this.emit('retransmit:ack', data); }
  reorderQueue(data: QueueReorderEvent[]): void { this.emit('queue:reorder', data); }
  discardImage(data: ImageDiscardEvent): void { this.emit('image:discard', data); }
  triggerRevolution(data: Record<string, unknown>): void { this.emit('revolution:trigger', data); }
  ping(): void { this.emit('ping', { timestamp: Date.now() }); }

  private ensureSocket(url: string): Socket {
    if (this.socket) return this.socket;
    const socket = io(url, {
      transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, reconnectionDelayMax: 15000, timeout: 10000, autoConnect: false,
    });
    this.socket = socket;
    socket.on('connect', () => {
      this.setStatus('connected');
      if (this.telemetrySubscribers > 0) this.emit('join:telemetry', {});
      if (this.queueSubscribers > 0) this.emit('join:queue', {});
    });
    socket.on('disconnect', () => this.setStatus(socket.active ? 'reconnecting' : 'disconnected'));
    socket.io.on('reconnect_attempt', () => this.setStatus('reconnecting'));
    socket.on('connect_error', () => this.setStatus(socket.active ? 'reconnecting' : 'disconnected'));
    FORWARDED_EVENTS.forEach((event) => socket.on(event, (data: unknown) => this.dispatch(event, data)));
    return socket;
  }

  private setStatus(status: SocketConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.dispatch('socket:state', status);
  }

  private dispatch<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach((callback) => {
      try { callback(data); } catch (error) { console.error(`[Socket] Callback error for ${event}:`, error); }
    });
  }
}

export const socketService = new SocketService();
export function useSocket() { return socketService; }
