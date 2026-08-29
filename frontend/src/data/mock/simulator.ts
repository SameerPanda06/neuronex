import type {
  Image,
  Telemetry,
  Retransmission,
  Revolution,
  TelemetryUpdateEvent,
  ImageProgressEvent,
  RetransmitRequestedEvent,
  RevolutionStartEvent,
  RevolutionEndEvent,
  ReorderRequest,
  ScheduleRevolutionRequest,
} from '../../types';
import {
  INITIAL_MOCK_IMAGES,
  INITIAL_MOCK_RETRANSMISSIONS,
  INITIAL_MOCK_REVOLUTIONS,
  generateInitialTelemetryHistory,
} from './mockData';

type Listener<T> = (data: T) => void;

export class MockMissionSimulator {
  private images: Image[] = [];
  private retransmissions: Retransmission[] = [];
  private revolutions: Revolution[] = [];
  private telemetryHistory: Telemetry[] = [];

  private timerId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private tickCount = 0;

  // Revolution countdown in seconds
  private revolutionTimeRemaining = 40;

  // Listeners
  private listeners: Map<string, Set<Listener<any>>> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.images = JSON.parse(JSON.stringify(INITIAL_MOCK_IMAGES));
    this.retransmissions = JSON.parse(JSON.stringify(INITIAL_MOCK_RETRANSMISSIONS));
    this.revolutions = JSON.parse(JSON.stringify(INITIAL_MOCK_REVOLUTIONS));
    this.telemetryHistory = generateInitialTelemetryHistory(25);
    this.tickCount = 0;
    this.revolutionTimeRemaining = 35;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  public on<T>(event: string, callback: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit<T>(event: string, data: T) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[MockMissionSimulator] Listener error for ${event}:`, err);
      }
    });
  }

  private tick() {
    this.tickCount++;

    // 1. Update Revolution state
    this.tickRevolution();

    // 2. Transmit active image segments
    this.tickTransmission();

    // 3. Occasional retransmission event trigger
    this.tickRetransmissions();
  }

  private tickRevolution() {
    const activeRev = this.revolutions.find((r) => r.status === 'active');
    if (!activeRev) {
      // If no active revolution, maybe start next scheduled one if ready
      const scheduled = this.revolutions.find((r) => r.status === 'scheduled');
      if (scheduled && this.tickCount % 60 === 0) {
        scheduled.status = 'active';
        scheduled.started_at = new Date().toISOString();
        this.revolutionTimeRemaining = scheduled.window_duration_sec || 60;
        const startEvent: RevolutionStartEvent = {
          revolution_num: scheduled.revolution_num,
          mission_id: scheduled.mission_id,
          window_sec: scheduled.window_duration_sec,
          images_in_window: scheduled.images_planned || [],
          started_at: scheduled.started_at,
        };
        this.emit('revolution:start', startEvent);
      }
      return;
    }

    this.revolutionTimeRemaining = Math.max(0, this.revolutionTimeRemaining - 1);

    if (this.revolutionTimeRemaining <= 0) {
      // Complete active revolution
      activeRev.status = 'completed';
      activeRev.completed_at = new Date().toISOString();
      const endEvent: RevolutionEndEvent = {
        revolution_num: activeRev.revolution_num,
        mission_id: activeRev.mission_id,
        completed: activeRev.images_completed || [],
        failed: activeRev.images_failed || [],
        total_segments_transmitted: activeRev.total_segments_transmitted,
        total_segments_confirmed: activeRev.total_segments_confirmed,
        ended_at: activeRev.completed_at,
      };
      this.emit('revolution:end', endEvent);

      // Schedule next revolution in 60 ticks
      const nextNum = activeRev.revolution_num + 1;
      let nextRev = this.revolutions.find((r) => r.revolution_num === nextNum);
      if (!nextRev) {
        nextRev = {
          id: nextNum,
          revolution_num: nextNum,
          mission_id: activeRev.mission_id,
          window_start: new Date(Date.now() + 60000).toISOString(),
          window_end: new Date(Date.now() + 120000).toISOString(),
          window_duration_sec: 60,
          images_planned: [],
          images_completed: [],
          images_failed: [],
          status: 'scheduled',
          total_segments_planned: 120,
          total_segments_transmitted: 0,
          total_segments_confirmed: 0,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
        };
        this.revolutions.push(nextRev);
      }
    }
  }

  private tickTransmission() {
    let activeImage = this.images.find((img) => img.status === 'transmitting');

    // If no transmitting image, activate next queued image if revolution is active
    if (!activeImage) {
      const activeRev = this.revolutions.find((r) => r.status === 'active');
      const nextQueued = this.images.find((img) => img.status === 'queued');
      if (activeRev && nextQueued) {
        nextQueued.status = 'transmitting';
        nextQueued.transmitted_at = new Date().toISOString();
        activeImage = nextQueued;
        this.emit('image:status', { image_id: nextQueued.id, status: 'transmitting' });
      }
    }

    if (!activeImage) return;

    // Simulate signal metrics oscillation
    const noise = Math.sin(this.tickCount * 0.3);
    const rssi = Math.round(-74 + noise * 6 + (Math.random() * 4 - 2));
    const snr = parseFloat((8.5 + noise * 1.8 + (Math.random() * 0.8 - 0.4)).toFixed(1));
    const throughput_bps = Math.round(4800 + noise * 400);
    const latency_ms_tx = Math.round(42 + noise * 5);

    const totalSegs = activeImage.total_segments || 100;
    const increment = Math.floor(Math.random() * 2) + 1;
    const newConfirmed = Math.min(totalSegs, activeImage.segments_confirmed + increment);
    const newProgress = Math.round((newConfirmed / totalSegs) * 100);

    activeImage.segments_confirmed = newConfirmed;
    activeImage.current_segment = Math.min(totalSegs, newConfirmed + 1);
    activeImage.progress_percent = newProgress;
    activeImage.rssi = rssi;
    activeImage.snr = snr;
    activeImage.throughput_bps = throughput_bps;
    activeImage.latency_ms_tx = latency_ms_tx;
    activeImage.updated_at = new Date().toISOString();

    // Update active revolution stats
    const activeRev = this.revolutions.find((r) => r.status === 'active');
    if (activeRev) {
      activeRev.total_segments_transmitted += increment;
      activeRev.total_segments_confirmed = Math.min(
        activeRev.total_segments_planned,
        activeRev.total_segments_confirmed + increment
      );
    }

    // Telemetry tick
    const telemetryPacket: Telemetry = {
      id: Date.now(),
      image_id: activeImage.id,
      mission_id: activeImage.mission_id,
      packet_type: this.tickCount % 6 === 0 ? 'TELEMETRY' : 'DATA',
      segment_num: activeImage.current_segment,
      total_segments: totalSegs,
      rssi,
      snr,
      latency_ms: latency_ms_tx,
      timestamp: new Date().toISOString(),
      raw_payload: null,
    };

    this.telemetryHistory.unshift(telemetryPacket);
    if (this.telemetryHistory.length > 50) {
      this.telemetryHistory.pop();
    }

    // Emit telemetry:update
    const telemetryEvent: TelemetryUpdateEvent = {
      image_id: activeImage.id,
      mission_id: activeImage.mission_id,
      packet_type: telemetryPacket.packet_type,
      segment_num: telemetryPacket.segment_num,
      total_segments: totalSegs,
      rssi,
      snr,
      latency_ms: latency_ms_tx,
      timestamp: telemetryPacket.timestamp,
      progress: newProgress,
    };
    this.emit('telemetry:update', telemetryEvent);

    // Emit image:progress
    const progressEvent: ImageProgressEvent = {
      id: activeImage.id,
      segments_confirmed: newConfirmed,
      segments_total: totalSegs,
      status: activeImage.status,
    };
    this.emit('image:progress', progressEvent);

    // Check completion
    if (newConfirmed >= totalSegs) {
      activeImage.status = 'complete';
      activeImage.completed_at = new Date().toISOString();
      this.emit('image:status', { image_id: activeImage.id, status: 'complete' });

      if (activeRev) {
        if (!activeRev.images_completed) activeRev.images_completed = [];
        if (!activeRev.images_completed.includes(activeImage.id)) {
          activeRev.images_completed.push(activeImage.id);
        }
      }

      // Next queued image can start in next tick
      const nextQueued = this.images.find((img) => img.status === 'queued');
      if (nextQueued) {
        this.emit('queue:update', { queue: this.getQueue() });
      }
    }
  }

  private tickRetransmissions() {
    // Every 25 ticks, simulate a packet drop / retransmission request if not already pending
    if (this.tickCount % 25 === 0) {
      const activeImage = this.images.find((img) => img.status === 'transmitting');
      const existingPending = this.retransmissions.some((r) => r.status === 'pending');

      if (activeImage && !existingPending && activeImage.segments_confirmed > 10) {
        const segA = Math.max(1, activeImage.segments_confirmed - 5);
        const segB = Math.max(1, activeImage.segments_confirmed - 2);
        const missing = Array.from(new Set([segA, segB]));

        const newRetrans: Retransmission = {
          id: Date.now(),
          image_id: activeImage.id,
          mission_id: activeImage.mission_id,
          missing_segments: missing,
          requested_at: new Date().toISOString(),
          acknowledged_at: null,
          completed_at: null,
          status: 'pending',
        };

        this.retransmissions.unshift(newRetrans);
        const reqEvent: RetransmitRequestedEvent = {
          image_id: activeImage.id,
          mission_id: activeImage.mission_id,
          missing_segments: missing,
        };
        this.emit('retransmit:requested', reqEvent);
      }
    }
  }

  // --- Data Access Methods ---

  public getImages(params?: {
    status?: string;
    classification?: string;
    mission_id?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  }): { images: Image[]; total: number } {
    let result = [...this.images];

    if (params?.status) {
      result = result.filter((img) => img.status === params.status);
    }
    if (params?.classification) {
      result = result.filter((img) => img.classification === params.classification);
    }
    if (params?.mission_id) {
      result = result.filter((img) => img.mission_id === params.mission_id);
    }

    if (params?.sort) {
      const sortKey = params.sort as keyof Image;
      const asc = params.order === 'asc';
      result.sort((a, b) => {
        const valA = a[sortKey] ?? 0;
        const valB = b[sortKey] ?? 0;
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    const total = result.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;
    const paginated = result.slice(offset, offset + limit);

    return { images: paginated, total };
  }

  public getImage(id: string): Image | undefined {
    return this.images.find((img) => img.id === id);
  }

  public getQueue(): Image[] {
    return this.images.filter((img) => img.status === 'queued' || img.status === 'transmitting');
  }

  public reorderQueue(items: ReorderRequest[]): Image[] {
    const orderMap = new Map(items.map((it, idx) => [it.id, idx]));
    this.images.forEach((img) => {
      if (orderMap.has(img.id)) {
        img.priority = (orderMap.get(img.id) || 0) + 1;
      }
    });

    this.emit('queue:reordered', { queue: items });
    const updatedQueue = this.getQueue();
    this.emit('queue:update', { queue: updatedQueue });
    return updatedQueue;
  }

  public getNextImage(): Image | null {
    return this.images.find((img) => img.status === 'queued') || null;
  }

  public getTelemetryHistory(_hours = 24, limit = 50): Telemetry[] {
    return this.telemetryHistory.slice(0, limit);
  }

  public getRetransmissions(params?: { status?: string; image_id?: string; limit?: number }): Retransmission[] {
    let list = [...this.retransmissions];
    if (params?.status) {
      list = list.filter((r) => r.status === params.status);
    }
    if (params?.image_id) {
      list = list.filter((r) => r.image_id === params.image_id);
    }
    return list.slice(0, params?.limit || 50);
  }

  public ackRetransmission(id?: number, imageId?: string): Retransmission | null {
    const item = this.retransmissions.find(
      (r) => (id && r.id === id) || (imageId && r.image_id === imageId && r.status === 'pending')
    );
    if (item) {
      item.status = 'acknowledged';
      item.acknowledged_at = new Date().toISOString();
      this.emit('retransmit:ack:confirmed', { received: { retransmit_id: item.id, image_id: item.image_id } });

      // Automatically simulate completion 2s later
      setTimeout(() => {
        item.status = 'completed';
        item.completed_at = new Date().toISOString();
        this.emit('retransmit:ack:confirmed', {
          received: { retransmit_id: item.id, image_id: item.image_id },
          status: 'completed',
          completed_at: item.completed_at,
        });
      }, 2000);
      return item;
    }
    return null;
  }

  public completeRetransmission(id: number): boolean {
    const item = this.retransmissions.find((r) => r.id === id);
    if (item) {
      item.status = 'completed';
      item.completed_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  public getRevolutions(params?: { mission_id?: string; status?: string; limit?: number }): Revolution[] {
    let list = [...this.revolutions];
    if (params?.mission_id) {
      list = list.filter((r) => r.mission_id === params.mission_id);
    }
    if (params?.status) {
      list = list.filter((r) => r.status === params.status);
    }
    return list.slice(0, params?.limit || 50);
  }

  public getRevolution(num: number): Revolution | undefined {
    return this.revolutions.find((r) => r.revolution_num === num);
  }

  public getCurrentRevolution(): Revolution | null {
    return this.revolutions.find((r) => r.status === 'active') || null;
  }

  public getRevolutionStatus() {
    const active = this.getCurrentRevolution();
    const next = this.revolutions.find((r) => r.status === 'scheduled') || null;
    return {
      active: active !== null,
      revolution: active,
      time_remaining: active ? this.revolutionTimeRemaining : null,
      next_revolution: next,
      time_until_next: next ? 180 : null,
    };
  }

  public scheduleRevolution(data: ScheduleRevolutionRequest): Revolution {
    const newRev: Revolution = {
      id: data.revolution_num,
      revolution_num: data.revolution_num,
      mission_id: data.mission_id,
      window_start: data.window_start,
      window_end: new Date(new Date(data.window_start).getTime() + 60000).toISOString(),
      window_duration_sec: 60,
      images_planned: data.images_planned,
      images_completed: [],
      images_failed: [],
      status: 'scheduled',
      total_segments_planned: 120,
      total_segments_transmitted: 0,
      total_segments_confirmed: 0,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };
    this.revolutions.push(newRev);
    return newRev;
  }

  public getAllImages() {
    return this.images;
  }

  public getAllRevolutions() {
    return this.revolutions;
  }

  public getAllRetransmissions() {
    return this.retransmissions;
  }
}

export const mockSimulator = new MockMissionSimulator();
