// Socket.IO Client Service - TypeScript
import { io, Socket } from 'socket.io-client';

type EventCallback<T = any> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.connected = true;
        resolve();
        return;
      }

      const wsUrl = url || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || 'http://localhost:5000';

      this.socket = io(wsUrl, {
        // HTTP long-polling first (CORS-safe), then upgrade to websocket
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 15000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[Socket] Connected:', this.socket?.id);
        this.emit('connected', { connected: true });
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('[Socket] Disconnected:', reason);
        this.emit('disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.error('[Socket] Connection error:', error.message);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      // Server events - re-emit to local listeners
      const events = [
        'telemetry:update',
        'image:classified',
        'image:progress',
        'image:discarded',
        'revolution:start',
        'revolution:end',
        'retransmit:requested',
        'retransmit:ack:confirmed',
        'queue:update',
        'queue:reordered',
        'schedule:update',
      ];

      events.forEach((event) => {
        this.socket?.on(event, (data) => this.emit(event, data));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Callback error for ${event}:`, error);
        }
      });
    }
  }

  getConnectionState(): boolean {
    return this.connected;
  }

  // Client -> Server emits
  joinTelemetry() { this.socket?.emit('telemetry:join'); }
  leaveTelemetry() { this.socket?.emit('telemetry:leave'); }
  joinQueue() { this.socket?.emit('queue:join'); }
  leaveQueue() { this.socket?.emit('queue:leave'); }
  acknowledgeRetransmission(id: number) { this.socket?.emit('retransmit:ack', { id }); }
  reorderQueue(items: any[]) { this.socket?.emit('queue:reorder', { items }); }
  discardImage(id: string) { this.socket?.emit('image:discard', { id }); }
  triggerRevolution() { this.socket?.emit('revolution:trigger', {}); }
  ping() { this.socket?.emit('ping'); }
}

export const socketService = new SocketService();

export function useSocket() {
  return socketService;
}