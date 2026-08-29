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
  Retransmission,
  RetransmissionsResponse,
  RetransmissionAckRequest,
  RetransmissionAckResponse,
  RetransmissionStats,
  Revolution,
  RevolutionsResponse,
  RevolutionStats,
  ScheduleRevolutionRequest,
  RevolutionStatusResponse,
  TelemetryUpdateEvent,
  ImageClassifiedEvent,
  ImageProgressEvent,
  RetransmitRequestedEvent,
  RevolutionStartEvent,
  RevolutionEndEvent,
  ImageStatus,
} from '../types';

export type RestConnectionStatus = 'checking' | 'connected' | 'disconnected';
export type SocketConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type TelemetryFreshness = 'current' | 'stale' | 'no_data';
export type ConnectionStatusType =
  | 'SIMULATION'
  | 'LIVE HARDWARE'
  | 'BACKEND OFFLINE'
  | 'RECONNECTING'
  | 'STALE TELEMETRY';

export interface ConnectionState {
  connected: boolean;
  statusText: ConnectionStatusType;
  mode: 'mock' | 'live';
  restStatus: RestConnectionStatus;
  socketStatus: SocketConnectionStatus;
  telemetryFreshness: TelemetryFreshness;
  lastTelemetryAt: string | null;
  lastImageEventAt: string | null;
  lastSuccessfulRestAt: string | null;
}

export interface TelemetryDataSource {
  getLatest(): Promise<TelemetryResponse>;
  getHistory(params?: { image_id?: string; mission_id?: string; hours?: number; limit?: number }): Promise<TelemetryHistory>;
  getSignal(params?: { image_id?: string; hours?: number }): Promise<SignalQuality>;
  subscribeTelemetry(callback: (update: TelemetryUpdateEvent) => void): () => void;
}

export interface ImagesDataSource {
  list(params?: {
    status?: string;
    classification?: string;
    mission_id?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  }): Promise<ImagesResponse>;
  get(id: string): Promise<Image>;
  progress(id: string): Promise<ImageProgress>;
  stats(): Promise<ImagesStats>;
  subscribeClassified(callback: (event: ImageClassifiedEvent) => void): () => void;
  subscribeProgress(callback: (event: ImageProgressEvent) => void): () => void;
  subscribeStatus(callback: (event: { image_id: string; status: ImageStatus }) => void): () => void;
}

export interface QueueDataSource {
  get(): Promise<QueueResponse>;
  reorder(items: ReorderRequest[]): Promise<{ updated: Image[]; count: number }>;
  next(): Promise<NextImageResponse>;
  subscribeQueue(callback: (data: { queue: Image[] }) => void): () => void;
  subscribeReordered(callback: (data: { queue: ReorderRequest[] }) => void): () => void;
}

export interface RetransmissionDataSource {
  list(params?: { status?: string; image_id?: string; limit?: number }): Promise<RetransmissionsResponse>;
  get(id: number): Promise<Retransmission>;
  ack(data: RetransmissionAckRequest): Promise<RetransmissionAckResponse>;
  complete(id: number): Promise<{ success: boolean; id: number }>;
  stats(): Promise<RetransmissionStats>;
  subscribeRequested(callback: (event: RetransmitRequestedEvent) => void): () => void;
  subscribeAckConfirmed(callback: (event: { received: { retransmit_id?: number; image_id?: string }; status?: 'acknowledged' | 'completed'; completed_at?: string }) => void): () => void;
}

export interface RevolutionsDataSource {
  list(params?: { mission_id?: string; status?: string; limit?: number }): Promise<RevolutionsResponse>;
  get(num: number): Promise<Revolution>;
  current(): Promise<{ current: Revolution | null; message?: string }>;
  status(): Promise<RevolutionStatusResponse>;
  stats(): Promise<RevolutionStats>;
  schedule(data: ScheduleRevolutionRequest): Promise<{ revolution: Revolution }>;
  start(num: number): Promise<{ revolution: Revolution }>;
  completeRevolution(
    num: number,
    data: {
      images_completed?: string[];
      images_failed?: string[];
      total_segments_transmitted?: number;
      total_segments_confirmed?: number;
    }
  ): Promise<{ revolution: Revolution }>;
  subscribeStart(callback: (event: RevolutionStartEvent) => void): () => void;
  subscribeEnd(callback: (event: RevolutionEndEvent) => void): () => void;
}

export interface DataSource {
  telemetry: TelemetryDataSource;
  images: ImagesDataSource;
  queue: QueueDataSource;
  retransmissions: RetransmissionDataSource;
  revolutions: RevolutionsDataSource;
  connect(): Promise<void>;
  disconnect(): void;
  getConnectionState(): ConnectionState;
  subscribeConnectionState(callback: (state: ConnectionState) => void): () => void;
}
