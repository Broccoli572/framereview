import { useMemo } from 'react';
import clsx from 'clsx';

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-surface-400 dark:bg-surface-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
};

const statusSizeClasses = {
  xs: 'h-1.5 w-1.5 ring-1',
  sm: 'h-2 w-2 ring-1',
  md: 'h-2.5 w-2 ring-2',
  lg: 'h-3 w-3 ring-2',
  xl: 'h-3.5 w-3.5 ring-2',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getInitialsColor(name) {
  if (!name) return 'bg-surface-400 dark:bg-surface-600';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-brand-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-violet-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  className,
  ...props
}) {
  const initials = useMemo(() => getInitials(name || alt), [name, alt]);
  const initialsBg = useMemo(() => getInitialsColor(name || alt), [name, alt]);

  return (
    <div className={clsx('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={clsx(
            sizeClasses[size],
            'rounded-full object-cover',
            'ring-2 ring-white dark:ring-surface-800'
          )}
          {...props}
        />
      ) : (
        <div
          className={clsx(
            sizeClasses[size],
            'flex items-center justify-center rounded-full font-medium text-white',
            initialsBg,
            'ring-2 ring-white dark:ring-surface-800'
          )}
          role="img"
          aria-label={alt || name || 'Avatar'}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full',
            statusColors[status],
            statusSizeClasses[size],
            'ring-white dark:ring-surface-800'
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export default Avatar;
