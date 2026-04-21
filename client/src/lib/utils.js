import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || bytes == null) return '0 B';
  if (!Number.isFinite(bytes)) return '--';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

export function formatDate(date, style = 'default') {
  if (!date) return '--';

  let parsed;
  if (typeof date === 'string') {
    parsed = parseISO(date);
    if (Number.isNaN(parsed.getTime())) return '--';
  } else if (date instanceof Date) {
    parsed = date;
  } else {
    return '--';
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

export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '00:00';

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

export function formatTimecode(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '00:00:00:000';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);
  const pad = (value, width = 2) => String(value).padStart(width, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)}:${pad(milliseconds, 3)}`;
}

export function getInitials(name, max = 2) {
  if (!name) return '?';

  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length >= 2) {
    return parts
      .slice(0, max)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed)) {
    return trimmed.slice(0, max);
  }

  const capitals = trimmed.replace(/[^A-Z]/g, '');
  if (capitals.length >= 2) {
    return capitals.slice(0, max);
  }

  return trimmed.slice(0, max).toUpperCase();
}

export function getMediaType(mimeType, fileName) {
  const mime = String(mimeType || '').toLowerCase();
  const ext = String(fileName || '').split('.').pop()?.toLowerCase();

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

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function randomId(bytes = 8) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (item) => item.toString(16).padStart(2, '0')).join('');
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.slice(0, maxLength - 1)}…`;
}

export function formatRelativeTime(date) {
  return formatDate(date, 'relative');
}

export function getResolutionLabel(width, height) {
  if (!width || !height) return null;
  if (width >= 3840 || height >= 2160) return '4K';
  if (width >= 2560 || height >= 1440) return '2K';
  if (width >= 1920 || height >= 1080) return '1080p';
  if (width >= 1280 || height >= 720) return '720p';
  if (width >= 854 || height >= 480) return '480p';
  return `${width}x${height}`;
}
