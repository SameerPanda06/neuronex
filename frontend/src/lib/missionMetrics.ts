import type { Image, Retransmission, RetransmissionStats, Revolution } from '../types';

export type DeliveryHealth = 'OPTIMAL' | 'GOOD' | 'DEGRADED' | 'POOR' | 'NO DATA';

export interface DeliveryMetric {
  confirmed: number;
  attempted: number;
  percentage: number | null;
  health: DeliveryHealth;
}

export function safePercentage(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
}

export function getDeliveryHealth(percentage: number | null): DeliveryHealth {
  if (percentage === null) return 'NO DATA';
  if (percentage >= 97) return 'OPTIMAL';
  if (percentage >= 90) return 'GOOD';
  if (percentage >= 75) return 'DEGRADED';
  return 'POOR';
}

export function deriveSegmentDelivery(revolutions: Revolution[]): DeliveryMetric {
  const attemptedRevolutions = revolutions.filter((rev) => rev.total_segments_transmitted > 0);
  const attempted = attemptedRevolutions.reduce((sum, rev) => sum + rev.total_segments_transmitted, 0);
  const confirmed = attemptedRevolutions.reduce((sum, rev) => sum + rev.total_segments_confirmed, 0);
  const percentage = safePercentage(confirmed, attempted);
  return { confirmed, attempted, percentage, health: getDeliveryHealth(percentage) };
}

export function deriveRevolutionDelivery(revolution: Revolution): DeliveryMetric {
  const attempted = revolution.total_segments_planned;
  const confirmed = revolution.total_segments_confirmed;
  const percentage = safePercentage(confirmed, attempted);
  return { confirmed, attempted, percentage, health: getDeliveryHealth(percentage) };
}

export function deriveRetransmissionStats(items: Retransmission[]): RetransmissionStats {
  const by_image: Record<string, number> = {};
  items.forEach((item) => {
    by_image[item.image_id] = (by_image[item.image_id] ?? 0) + 1;
  });
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'pending').length,
    acknowledged: items.filter((item) => item.status === 'acknowledged').length,
    completed: items.filter((item) => item.status === 'completed').length,
    by_image,
  };
}

export function countImageActions(images: Image[]) {
  return images.reduce(
    (counts, image) => {
      if (image.action) counts[image.action] += 1;
      return counts;
    },
    { keep: 0, defer: 0, discard: 0 }
  );
}
