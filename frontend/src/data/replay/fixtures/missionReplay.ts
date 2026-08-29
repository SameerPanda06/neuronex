import type { Image, Revolution } from '../../../types';

export const REPLAY_MISSION_ID = 'NEX-REPLAY-001';
export const REPLAY_REVOLUTION = 21;
export const REPLAY_STARTED_AT = '2026-08-29T06:30:00.000Z';

const image = (values: Partial<Image> & Pick<Image, 'id' | 'classification' | 'action' | 'priority' | 'status' | 'total_segments'>): Image => ({
  mission_id: REPLAY_MISSION_ID,
  file_path: '',
  confidence: null,
  all_probabilities: null,
  latency_ms: null,
  classified_at: null,
  jpeg_quality: 80,
  segments_confirmed: 0,
  current_segment: 0,
  chunk_size: 256,
  rssi: null,
  snr: null,
  throughput_bps: null,
  latency_ms_tx: null,
  progress_percent: 0,
  created_at: REPLAY_STARTED_AT,
  updated_at: REPLAY_STARTED_AT,
  transmitted_at: null,
  completed_at: null,
  ...values,
});

export const REPLAY_IMAGES: Image[] = [
  image({ id: 'IMG-REPLAY-001', classification: 'CLEAR', confidence: 0.96, action: 'keep', priority: 1, status: 'transmitting', total_segments: 60, classified_at: REPLAY_STARTED_AT, transmitted_at: REPLAY_STARTED_AT }),
  image({ id: 'IMG-REPLAY-002', classification: 'CLOUDY', confidence: 0.87, action: 'defer', priority: 3, status: 'queued', total_segments: 40, classified_at: REPLAY_STARTED_AT }),
  image({ id: 'IMG-REPLAY-003', classification: 'NOT_VISIBLE', confidence: 0.98, action: 'discard', priority: 9, status: 'discarded', total_segments: 30, classified_at: REPLAY_STARTED_AT }),
];

export const REPLAY_REVOLUTIONS: Revolution[] = [{
  id: 21,
  revolution_num: REPLAY_REVOLUTION,
  mission_id: REPLAY_MISSION_ID,
  window_start: REPLAY_STARTED_AT,
  window_end: '2026-08-29T06:30:30.000Z',
  window_duration_sec: 30,
  images_planned: [{ id: 'IMG-REPLAY-001', priority: 1 }, { id: 'IMG-REPLAY-002', priority: 3 }],
  images_completed: [],
  images_failed: [],
  status: 'active',
  total_segments_planned: 100,
  total_segments_transmitted: 0,
  total_segments_confirmed: 0,
  created_at: REPLAY_STARTED_AT,
  started_at: REPLAY_STARTED_AT,
  completed_at: null,
}];
