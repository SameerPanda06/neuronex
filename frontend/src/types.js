// Type definitions matching backend API contract
// Keep in sync with backend/openapi.yaml and CONTRACT.md

// Classification = "CLEAR" | "CLOUDY" | "NOT_VISIBLE" | "UNKNOWN";
// Action = "keep" | "defer" | "discard";
// ImageStatus = "pending" | "classified" | "queued" | "transmitting" | "complete" | "discarded" | "failed";
// RevolutionStatus = "scheduled" | "active" | "completed";
// RetransmissionStatus = "pending" | "acknowledged" | "completed";
// PacketType = "DATA" | "ACK" | "NACK" | "META" | "STATUS" | "DONE" | "TELEMETRY";

/**
 * @typedef {Object} Image
 * @property {string} id
 * @property {string} mission_id
 * @property {string} file_path
 * @property {string|null} classification
 * @property {number|null} confidence
 * @property {Object|null} all_probabilities
 * @property {number|null} latency_ms
 * @property {string|null} classified_at
 * @property {string|null} action
 * @property {number} priority
 * @property {number|null} jpeg_quality
 * @property {string} status
 * @property {number|null} total_segments
 * @property {number} segments_confirmed
 * @property {number} current_segment
 * @property {number|null} chunk_size
 * @property {number|null} rssi
 * @property {number|null} snr
 * @property {number|null} throughput_bps
 * @property {number|null} latency_ms_tx
 * @property {number} progress_percent
 * @property {string|null} created_at
 * @property {string|null} updated_at
 * @property {string|null} transmitted_at
 * @property {string|null} completed_at
 */

/**
 * @typedef {Object} Telemetry
 * @property {number} id
 * @property {string} image_id
 * @property {string} mission_id
 * @property {string} packet_type
 * @property {number|null} segment_num
 * @property {number|null} total_segments
 * @property {number|null} rssi
 * @property {number|null} snr
 * @property {number|null} latency_ms
 * @property {string} timestamp
 * @property {string|null} raw_payload
 */

/**
 * @typedef {Object} Retransmission
 * @property {number} id
 * @property {string} image_id
 * @property {string} mission_id
 * @property {number[]} missing_segments
 * @property {string} requested_at
 * @property {string|null} acknowledged_at
 * @property {string|null} completed_at
 * @property {string} status
 * @property {number} segments_retransmitted
 */

/**
 * @typedef {Object} Revolution
 * @property {number} id
 * @property {number} revolution_num
 * @property {string} mission_id
 * @property {string} window_start
 * @property {string} window_end
 * @property {number} window_duration_sec
 * @property {number} images_planned
 * @property {number[]} images_completed
 * @property {number[]} images_failed
 * @property {string} status
 * @property {number} total_segments_planned
 * @property {number} total_segments_transmitted
 * @property {number} total_segments_confirmed
 * @property {string} created_at
 * @property {string|null} started_at
 * @property {string|null} ended_at
 */

// API Response types (documentation only)
/**
 * @typedef {Object} ImagesResponse
 * @property {Image[]} images
 * @property {number} total
 * @property {number} limit
 * @property {number} offset
 */

/**
 * @typedef {Object} ImagesStats
 * @property {number} total
 * @property {Object} by_status
 * @property {Object} by_classification
 * @property {number} avg_confidence
 * @property {number} total_segments
 * @property {number} confirmed_segments
 */

// ... other response types follow same pattern