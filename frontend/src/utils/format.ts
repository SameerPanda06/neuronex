// Utility Functions
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ImageStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatBps(bps: number | null): string {
  if (bps === null || bps === undefined) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${bps.toFixed(0)} bps`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function formatProgress(percent: number): string {
  return `${Math.round(percent * 10) / 10}%`;
}

export function getSegmentProgress(confirmed: number, total: number | null): number {
  if (!total || total === 0) return 0;
  return Math.min(100, (confirmed / total) * 100);
}

export function truncate(str: string | null, length: number): string {
  if (!str) return '—';
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getClassificationColor(classification: string | null): string {
  switch (classification) {
    case 'CLEAR':
      return 'bg-green-500 text-white';
    case 'CLOUDY':
      return 'bg-yellow-500 text-white';
    case 'NOT_VISIBLE':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getClassificationIcon(classification: string | null): string {
  switch (classification) {
    case 'CLEAR':
      return '☀️';
    case 'CLOUDY':
      return '☁️';
    case 'NOT_VISIBLE':
      return '🌫️';
    default:
      return '❓';
  }
}

export function getStatusColor(status: ImageStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-green-500 text-white';
    case 'transmitting':
      return 'bg-blue-500 text-white animate-pulse';
    case 'queued':
    case 'classified':
      return 'bg-indigo-500 text-white';
    case 'pending':
      return 'bg-gray-500 text-white';
    case 'discarded':
      return 'bg-red-500 text-white';
    case 'failed':
      return 'bg-red-700 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getActionColor(action: string | null): string {
  switch (action) {
    case 'keep':
      return 'text-green-400';
    case 'defer':
      return 'text-yellow-400';
    case 'discard':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}