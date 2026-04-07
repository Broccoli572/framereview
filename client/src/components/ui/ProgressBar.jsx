import { useMemo } from 'react';
import clsx from 'clsx';

const variantClasses = {
  brand: 'bg-brand-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

function ProgressBar({
  value = 0,
  variant = 'brand',
  size = 'md',
  showLabel = false,
  labelPosition = 'right',
  animated = true,
  striped = false,
  className,
  barClassName,
}) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const label = useMemo(() => {
    if (!showLabel) return null;
    const text = `${Math.round(clampedValue)}%`;
    if (labelPosition === 'inside' && clampedValue > 10) {
      return (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
          {text}
        </span>
      );
    }
    return (
      <span className={clsx(
        'text-xs font-medium text-surface-600 dark:text-surface-400',
        labelPosition === 'right' && 'ml-2',
        labelPosition === 'left' && 'mr-2'
      )}>
        {text}
      </span>
    );
  }, [showLabel, clampedValue, labelPosition]);

  return (
    <div className={clsx('flex items-center', labelPosition === 'left' && 'flex-row', className)}>
      {labelPosition === 'left' && label}
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${Math.round(clampedValue)}%`}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantClasses[variant],
            animated && 'animate-pulse',
            striped && 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]',
            barClassName
          )}
          style={{ width: `${clampedValue}%` }}
        />
        {labelPosition === 'inside' && label}
      </div>
      {labelPosition === 'right' && label}
    </div>
  );
}

export default ProgressBar;
