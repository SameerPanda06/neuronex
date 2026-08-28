import type {
  Image,
  Telemetry,
  Retransmission,
  Revolution,
  ImagesStats,
  RevolutionStats,
  RetransmissionStats,
} from '../../types';

const NOW = Date.now();
const ISO_NOW = new Date(NOW).toISOString();
const ISO_MINUS_10M = new Date(NOW - 10 * 60 * 1000).toISOString();
const ISO_MINUS_1H = new Date(NOW - 60 * 60 * 1000).toISOString();
const ISO_MINUS_2H = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
const ISO_PLUS_4H = new Date(NOW + 4 * 60 * 60 * 1000).toISOString();
const ISO_PLUS_8H = new Date(NOW + 8 * 60 * 60 * 1000).toISOString();

export const INITIAL_MOCK_IMAGES: Image[] = [
  {
    id: 'IMG-000101',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000101.jpg',
    classification: 'CLEAR',
    confidence: 0.962,
    all_probabilities: {
      CLEAR: 0.962,
      CLOUDY: 0.031,
      NOT_VISIBLE: 0.007,
      UNKNOWN: 0.0,
    },
    latency_ms: 142,
    classified_at: ISO_MINUS_10M,
    action: 'keep',
    priority: 1,
    jpeg_quality: 85,
    status: 'transmitting',
    total_segments: 120,
    segments_confirmed: 58,
    current_segment: 59,
    chunk_size: 256,
    rssi: -72,
    snr: 9.4,
    throughput_bps: 4800,
    latency_ms_tx: 45,
    progress_percent: 48,
    created_at: ISO_MINUS_1H,
    updated_at: ISO_NOW,
    transmitted_at: ISO_MINUS_10M,
    completed_at: null,
  },
  {
    id: 'IMG-000102',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000102.jpg',
    classification: 'CLEAR',
    confidence: 0.915,
    all_probabilities: {
      CLEAR: 0.915,
      CLOUDY: 0.068,
      NOT_VISIBLE: 0.017,
      UNKNOWN: 0.0,
    },
    latency_ms: 138,
    classified_at: ISO_MINUS_10M,
    action: 'keep',
    priority: 2,
    jpeg_quality: 80,
    status: 'queued',
    total_segments: 96,
    segments_confirmed: 0,
    current_segment: 0,
    chunk_size: 256,
    rssi: null,
    snr: null,
    throughput_bps: null,
    latency_ms_tx: null,
    progress_percent: 0,
    created_at: ISO_MINUS_1H,
    updated_at: ISO_NOW,
    transmitted_at: null,
    completed_at: null,
  },
  {
    id: 'IMG-000103',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000103.jpg',
    classification: 'CLOUDY',
    confidence: 0.842,
    all_probabilities: {
      CLEAR: 0.112,
      CLOUDY: 0.842,
      NOT_VISIBLE: 0.046,
      UNKNOWN: 0.0,
    },
    latency_ms: 155,
    classified_at: ISO_MINUS_1H,
    action: 'defer',
    priority: 3,
    jpeg_quality: 60,
    status: 'queued',
    total_segments: 80,
    segments_confirmed: 0,
    current_segment: 0,
    chunk_size: 256,
    rssi: null,
    snr: null,
    throughput_bps: null,
    latency_ms_tx: null,
    progress_percent: 0,
    created_at: ISO_MINUS_2H,
    updated_at: ISO_NOW,
    transmitted_at: null,
    completed_at: null,
  },
  {
    id: 'IMG-000104',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000104.jpg',
    classification: 'NOT_VISIBLE',
    confidence: 0.978,
    all_probabilities: {
      CLEAR: 0.005,
      CLOUDY: 0.017,
      NOT_VISIBLE: 0.978,
      UNKNOWN: 0.0,
    },
    latency_ms: 120,
    classified_at: ISO_MINUS_2H,
    action: 'discard',
    priority: 9,
    jpeg_quality: 40,
    status: 'discarded',
    total_segments: 64,
    segments_confirmed: 0,
    current_segment: 0,
    chunk_size: 256,
    rssi: null,
    snr: null,
    throughput_bps: null,
    latency_ms_tx: null,
    progress_percent: 0,
    created_at: ISO_MINUS_2H,
    updated_at: ISO_MINUS_2H,
    transmitted_at: null,
    completed_at: null,
  },
  {
    id: 'IMG-000099',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000099.jpg',
    classification: 'CLEAR',
    confidence: 0.985,
    all_probabilities: {
      CLEAR: 0.985,
      CLOUDY: 0.012,
      NOT_VISIBLE: 0.003,
      UNKNOWN: 0.0,
    },
    latency_ms: 132,
    classified_at: ISO_MINUS_2H,
    action: 'keep',
    priority: 1,
    jpeg_quality: 85,
    status: 'complete',
    total_segments: 110,
    segments_confirmed: 110,
    current_segment: 110,
    chunk_size: 256,
    rssi: -68,
    snr: 10.8,
    throughput_bps: 5120,
    latency_ms_tx: 40,
    progress_percent: 100,
    created_at: ISO_MINUS_2H,
    updated_at: ISO_MINUS_1H,
    transmitted_at: ISO_MINUS_2H,
    completed_at: ISO_MINUS_1H,
  },
  {
    id: 'IMG-000100',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000100.jpg',
    classification: 'CLOUDY',
    confidence: 0.791,
    all_probabilities: {
      CLEAR: 0.154,
      CLOUDY: 0.791,
      NOT_VISIBLE: 0.055,
      UNKNOWN: 0.0,
    },
    latency_ms: 160,
    classified_at: ISO_MINUS_2H,
    action: 'defer',
    priority: 4,
    jpeg_quality: 60,
    status: 'complete',
    total_segments: 75,
    segments_confirmed: 75,
    current_segment: 75,
    chunk_size: 256,
    rssi: -79,
    snr: 6.2,
    throughput_bps: 3800,
    latency_ms_tx: 52,
    progress_percent: 100,
    created_at: ISO_MINUS_2H,
    updated_at: ISO_MINUS_1H,
    transmitted_at: ISO_MINUS_2H,
    completed_at: ISO_MINUS_1H,
  },
  {
    id: 'IMG-000105',
    mission_id: 'NEX-000001',
    file_path: '/images/IMG-000105.jpg',
    classification: 'CLEAR',
    confidence: 0.934,
    all_probabilities: {
      CLEAR: 0.934,
      CLOUDY: 0.051,
      NOT_VISIBLE: 0.015,
      UNKNOWN: 0.0,
    },
    latency_ms: 140,
    classified_at: ISO_MINUS_10M,
    action: 'keep',
    priority: 2,
    jpeg_quality: 80,
    status: 'queued',
    total_segments: 105,
    segments_confirmed: 0,
    current_segment: 0,
    chunk_size: 256,
    rssi: null,
    snr: null,
    throughput_bps: null,
    latency_ms_tx: null,
    progress_percent: 0,
    created_at: ISO_MINUS_10M,
    updated_at: ISO_NOW,
    transmitted_at: null,
    completed_at: null,
  },
];

export const INITIAL_MOCK_RETRANSMISSIONS: Retransmission[] = [
  {
    id: 1001,
    image_id: 'IMG-000101',
    mission_id: 'NEX-000001',
    missing_segments: [12, 27, 43],
    requested_at: new Date(NOW - 3 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    completed_at: null,
    status: 'pending',
  },
  {
    id: 1000,
    image_id: 'IMG-000099',
    mission_id: 'NEX-000001',
    missing_segments: [5, 19, 82],
    requested_at: ISO_MINUS_2H,
    acknowledged_at: new Date(NOW - 110 * 60 * 1000).toISOString(),
    completed_at: new Date(NOW - 105 * 60 * 1000).toISOString(),
    status: 'completed',
  },
];

export const INITIAL_MOCK_REVOLUTIONS: Revolution[] = [
  {
    id: 14,
    revolution_num: 14,
    mission_id: 'NEX-000001',
    window_start: ISO_MINUS_2H,
    window_end: new Date(NOW - (2 * 60 * 60 - 60) * 1000).toISOString(),
    window_duration_sec: 60,
    images_planned: [
      { id: 'IMG-000099', priority: 1 },
      { id: 'IMG-000100', priority: 2 },
    ],
    images_completed: ['IMG-000099', 'IMG-000100'],
    images_failed: [],
    status: 'completed',
    total_segments_planned: 185,
    total_segments_transmitted: 185,
    total_segments_confirmed: 185,
    created_at: ISO_MINUS_2H,
    started_at: ISO_MINUS_2H,
    completed_at: new Date(NOW - (2 * 60 * 60 - 60) * 1000).toISOString(),
  },
  {
    id: 15,
    revolution_num: 15,
    mission_id: 'NEX-000001',
    window_start: new Date(NOW - 25 * 1000).toISOString(),
    window_end: new Date(NOW + 35 * 1000).toISOString(),
    window_duration_sec: 60,
    images_planned: [
      { id: 'IMG-000101', priority: 1 },
      { id: 'IMG-000102', priority: 2 },
    ],
    images_completed: [],
    images_failed: [],
    status: 'active',
    total_segments_planned: 216,
    total_segments_transmitted: 65,
    total_segments_confirmed: 58,
    created_at: ISO_MINUS_1H,
    started_at: new Date(NOW - 25 * 1000).toISOString(),
    completed_at: null,
  },
  {
    id: 16,
    revolution_num: 16,
    mission_id: 'NEX-000001',
    window_start: ISO_PLUS_4H,
    window_end: new Date(NOW + (4 * 60 * 60 + 60) * 1000).toISOString(),
    window_duration_sec: 60,
    images_planned: [
      { id: 'IMG-000103', priority: 3 },
      { id: 'IMG-000105', priority: 2 },
    ],
    images_completed: [],
    images_failed: [],
    status: 'scheduled',
    total_segments_planned: 185,
    total_segments_transmitted: 0,
    total_segments_confirmed: 0,
    created_at: ISO_NOW,
    started_at: null,
    completed_at: null,
  },
  {
    id: 17,
    revolution_num: 17,
    mission_id: 'NEX-000001',
    window_start: ISO_PLUS_8H,
    window_end: new Date(NOW + (8 * 60 * 60 + 60) * 1000).toISOString(),
    window_duration_sec: 60,
    images_planned: [],
    images_completed: [],
    images_failed: [],
    status: 'scheduled',
    total_segments_planned: 0,
    total_segments_transmitted: 0,
    total_segments_confirmed: 0,
    created_at: ISO_NOW,
    started_at: null,
    completed_at: null,
  },
];

export function generateInitialTelemetryHistory(count = 25): Telemetry[] {
  const history: Telemetry[] = [];
  const baseTime = NOW;
  const types: Telemetry['packet_type'][] = ['DATA', 'DATA', 'ACK', 'DATA', 'TELEMETRY', 'DATA'];

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(baseTime - i * 4000).toISOString();
    const packet_type = types[i % types.length];
    const segment_num = Math.max(1, 58 - i);
    const rssi = -70 - Math.floor((Math.sin(i * 0.5) + 1) * 12);
    const snr = parseFloat((8.5 + Math.sin(i * 0.4) * 2.5).toFixed(1));

    history.push({
      id: 10000 + i,
      image_id: 'IMG-000101',
      mission_id: 'NEX-000001',
      packet_type,
      segment_num: packet_type === 'DATA' || packet_type === 'ACK' ? segment_num : null,
      total_segments: 120,
      rssi,
      snr,
      latency_ms: 40 + (i % 5) * 3,
      timestamp,
      raw_payload: null,
    });
  }

  return history;
}

export function computeMockImageStats(images: Image[]): ImagesStats {
  const by_status = {
    pending: 0,
    classified: 0,
    queued: 0,
    transmitting: 0,
    complete: 0,
    discarded: 0,
    failed: 0,
  };

  const by_classification = {
    CLEAR: 0,
    CLOUDY: 0,
    NOT_VISIBLE: 0,
    UNKNOWN: 0,
  };

  const by_action = {
    keep: 0,
    defer: 0,
    discard: 0,
  };

  images.forEach((img) => {
    if (by_status[img.status] !== undefined) by_status[img.status]++;
    if (img.classification && by_classification[img.classification] !== undefined) {
      by_classification[img.classification]++;
    }
    if (img.action && by_action[img.action] !== undefined) {
      by_action[img.action]++;
    }
  });

  const total = images.length;
  const complete = by_status.complete;
  const transmitting = by_status.transmitting;
  const pending = by_status.pending + by_status.queued + by_status.classified;
  const completion_rate = total > 0 ? Math.round((complete / total) * 100) : 0;

  return {
    total,
    by_status,
    by_classification,
    by_action,
    transmitting,
    complete,
    pending,
    completion_rate,
  };
}

export function computeMockRevolutionStats(revolutions: Revolution[]): RevolutionStats {
  const total_revolutions = revolutions.length;
  const completed = revolutions.filter((r) => r.status === 'completed').length;
  const active = revolutions.filter((r) => r.status === 'active').length;
  const scheduled = revolutions.filter((r) => r.status === 'scheduled').length;

  const total_segments_planned = revolutions.reduce((s, r) => s + r.total_segments_planned, 0);
  const total_segments_confirmed = revolutions.reduce((s, r) => s + r.total_segments_confirmed, 0);
  const overall_success_rate =
    total_segments_planned > 0
      ? Math.round((total_segments_confirmed / total_segments_planned) * 100)
      : 100;

  return {
    total_revolutions,
    completed,
    active,
    scheduled,
    total_segments_planned,
    total_segments_confirmed,
    overall_success_rate,
  };
}

export function computeMockRetransmissionStats(retransmissions: Retransmission[]): RetransmissionStats {
  const total = retransmissions.length;
  const pending = retransmissions.filter((r) => r.status === 'pending').length;
  const acknowledged = retransmissions.filter((r) => r.status === 'acknowledged').length;
  const completed = retransmissions.filter((r) => r.status === 'completed').length;
  const by_image: Record<string, number> = {};

  retransmissions.forEach((r) => {
    by_image[r.image_id] = (by_image[r.image_id] || 0) + 1;
  });

  return {
    total,
    pending,
    acknowledged,
    completed,
    by_image,
  };
}
