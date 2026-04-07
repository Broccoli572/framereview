import { Inbox } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button';

function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  compact = false,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6' : 'py-12',
        className
      )}
    >
      <div
        className={clsx(
          'flex items-center justify-center rounded-full',
          'bg-surface-100 dark:bg-surface-800',
          compact ? 'mb-3 h-10 w-10' : 'mb-4 h-14 w-14'
        )}
      >
        <Icon
          size={compact ? 20 : 28}
          className="text-surface-400 dark:text-surface-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <h3
        className={clsx(
          'font-medium text-surface-900 dark:text-surface-100',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={clsx(
            'mt-1 max-w-sm text-surface-500 dark:text-surface-400',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className={clsx('flex items-center gap-2', compact ? 'mt-3' : 'mt-5')}>
          {actionLabel && (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button size="sm" variant="ghost" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
