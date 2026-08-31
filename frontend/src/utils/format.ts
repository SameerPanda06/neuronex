// Utility Functions - TypeScript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Classification, ImageStatus } from '../types';

export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${bps.toFixed(0)} bps`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function formatProgress(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) return '—';
  return `${Math.round(percent * 10) / 10}%`;
}

export function getStatusColor(status: ImageStatus | string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    classified: 'text-neuronex-300 bg-neuronex-500/10 border-neuronex-500/20',
    queued: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    transmitting: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    complete: 'text-green-400 bg-green-500/10 border-green-500/20',
    discarded: 'text-red-400 bg-red-500/10 border-red-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return colors[status] || 'text-neuronex-400 bg-white/5 border-white/10';
}

export function getClassificationColor(classification: Classification | null | undefined): string {
  switch (classification) {
    case 'CLEAR': return 'bg-green-500/10 border-green-500/30 text-green-400';
    case 'CLOUDY': return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    case 'NOT_VISIBLE': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    default: return 'bg-white/5 border-white/10 text-neuronex-400';
  }
}

export function getClassificationIcon(classification: Classification | null | undefined): string {
  switch (classification) {
    case 'CLEAR': return '☀️';
    case 'CLOUDY': return '☁️';
    case 'NOT_VISIBLE': return '🌫️';
    default: return '❓';
  }
}

export function getStatusIcon(status: ImageStatus | string): string {
  switch (status) {
    case 'complete': return '✅';
    case 'transmitting': return '📡';
    case 'queued': return '⏳';
    case 'discarded': return '🗑️';
    case 'failed': return '❌';
    default: return '📸';
  }
}

export function getSignalQualityClass(rssi: number | null | undefined): string {
  if (rssi === null || rssi === undefined) return 'text-neuronex-400';
  if (rssi >= -70) return 'text-green-400';
  if (rssi >= -85) return 'text-lime-400';
  if (rssi >= -100) return 'text-yellow-400';
  if (rssi >= -115) return 'text-orange-400';
  return 'text-red-400';
}

export function getSnrQualityClass(snr: number | null | undefined): string {
  if (snr === null || snr === undefined) return 'text-neuronex-400';
  if (snr >= 10) return 'text-green-400';
  if (snr >= 5) return 'text-lime-400';
  if (snr >= 0) return 'text-yellow-400';
  if (snr >= -5) return 'text-orange-400';
  return 'text-red-400';
}