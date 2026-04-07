import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * Merge clsx classes with Tailwind merge to avoid conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size in human-readable form.
 *
 * formatBytes(1024)       → "1 KB"
 * formatBytes(1536000)    → "1.46 MB"
 * formatBytes(0)          → "0 B"
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || bytes == null) return '0 B';
  if (!Number.isFinite(bytes)) return '—';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

/**
 * Format a date string or Date object.
 *
 * formatDate('2026-04-07T10:30:00Z') → "2026-04-07 18:30"
 * formatDate(date, 'relative')        → "3 hours ago"
 * formatDate(date, 'short')           → "04-07 18:30"
 */
export function formatDate(date, style = 'default') {
  if (!date) return '—';

  let parsed;
  if (typeof date === 'string') {
    parsed = parseISO(date);
    if (isNaN(parsed.getTime())) return '—';
  } else if (date instanceof Date) {
    parsed = date;
  } else {
    return '—';
  }

  switch (style) {
    case 'relative':
      return formatDistanceToNow(parsed, { addSuffix: true, locale: zhCN });
    case 'short':
      return format(parsed, 'MM-dd HH:mm', { locale: zhCN });
    case 'long':
      return format(parsed, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
    case 'date':
      return format(parsed, 'yyyy-MM-dd', { locale: zhCN });
    case 'time':
      return format(parsed, 'HH:mm:ss', { locale: zhCN });
    default:
      return format(parsed, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  }
}

/**
 * Format seconds into HH:MM:SS or MM:SS.
 *
 * formatDuration(90)   → "01:30"
 * formatDuration(3723) → "1:02:03"
 * formatDuration(0)    → "00:00"
 */
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '00:00';

  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(sec)}`;
  }
  return `${pad(m)}:${pad(sec)}`;
}

/**
 * Format timecode for video review: HH:MM:SS:mmm
 */
export function formatTimecode(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '00:00:00:000';

  const s = seconds;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);

  const pad = (n, len = 2) => String(n).padStart(len, '0');

  return `${pad(h)}:${pad(m)}:${pad(sec)}:${pad(ms, 3)}`;
}

/**
 * Get initials from a name string.
 *
 * getInitials('John Doe')       → "JD"
 * getInitials('FrameReview')    → "FR"
 * getInitials('张三')           → "张三"
 */
export function getInitials(name, max = 2) {
  if (!name) return '?';

  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length >= 2) {
    return parts
      .slice(0, max)
      .map((p) => p.charAt(0))
      .join('')
      .toUpperCase();
  }

  // Single word / CJK characters
  if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed)) {
    return trimmed.slice(0, max);
  }

  // CamelCase → extract capital letters
  const caps = trimmed.replace(/[^A-Z]/g, '');
  if (caps.length >= 2) {
    return caps.slice(0, max);
  }

  return trimmed.slice(0, max).toUpperCase();
}

/**
 * Resolve media type from MIME type or extension.
 */
export function getMediaType(mimeType, fileName) {
  const mime = (mimeType || '').toLowerCase();
  const ext = (fileName || '').split('.').pop()?.toLowerCase();

  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'prores', 'mxf'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'tiff', 'bmp', 'psd', 'ai'].includes(ext)) {
    return 'image';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)) {
    return 'document';
  }
  return 'other';
}

/**
 * Debounce utility.
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate a random hex string of given byte length.
 */
export function randomId(bytes = 8) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Format relative time (alias for formatDate with 'relative' style).
 */
export function formatRelativeTime(date) {
  return formatDate(date, 'relative');
}

/**
 * Get a resolution badge label.
 */
export function getResolutionLabel(width, height) {
  if (!width || !height) return null;
  if (width >= 3840 || height >= 2160) return '4K';
  if (width >= 2560 || height >= 1440) return '2K';
  if (width >= 1920 || height >= 1080) return '1080p';
  if (width >= 1280 || height >= 720) return '720p';
  if (width >= 854 || height >= 480) return '480p';
  return `${width}×${height}`;
}
