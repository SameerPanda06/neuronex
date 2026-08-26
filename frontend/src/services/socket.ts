// Socket.IO Client Service
import { io, Socket } from 'socket.io-client';
import type {
  RetransmitAckEvent,
  QueueReorderEvent,
  ImageDiscardEvent,
} from '../types';

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  // Event listeners
  private listeners: Map<string, Set<EventCallback<any>>> = new Map();

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const wsUrl = url || import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[Socket] Connected:', this.socket?.id);
        this.dispatch('connected', { connected: true });
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('[Socket] Disconnected:', reason);
        this.dispatch('disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.error('[Socket] Connection error:', error.message);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      // Register all event handlers
      this.registerEventHandlers();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  // Subscribe to events
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback);
  }

  // Emit to server
  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  // Server -> Client events
  private registerEventHandlers(): void {
    if (!this.socket) return;

    const events = [
      'telemetry:update',
      'image:classified',
      'image:progress',
      'retransmit:requested',
      'revolution:start',
      'revolution:end',
      'queue:update',
      'image:status',
      'connected',
      'disconnected',
      'pong',
      'telemetry:subscribed',
      'telemetry:unsubscribed',
      'queue:subscribed',
      'queue:unsubscribed',
      'retransmit:ack:confirmed',
      'queue:reordered',
      'image:discarded',
      'revolution:triggered',
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data: any) => {
        this.dispatch(event, data);
      });
    });
  }

  private dispatch<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[Socket] Callback error for ${event}:`, error);
      }
    });
  }

  // Convenience methods for Client -> Server events
  joinTelemetry(): void {
    this.emit('join:telemetry', {});
  }

  leaveTelemetry(): void {
    this.emit('leave:telemetry', {});
  }

  joinQueue(): void {
    this.emit('join:queue', {});
  }

  leaveQueue(): void {
    this.emit('leave:queue', {});
  }

  acknowledgeRetransmission(data: RetransmitAckEvent): void {
    this.emit('retransmit:ack', data);
  }

  reorderQueue(data: QueueReorderEvent[]): void {
    this.emit('queue:reorder', data);
  }

  discardImage(data: ImageDiscardEvent): void {
    this.emit('image:discard', data);
  }

  triggerRevolution(data: any): void {
    this.emit('revolution:trigger', data);
  }

  ping(): void {
    this.emit('ping', { timestamp: Date.now() });
  }
}

// Singleton instance
export const socketService = new SocketService();

// React hook for using socket
export function useSocket() {
  return socketService;
}