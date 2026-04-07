import clsx from 'clsx';

const variantClasses = {
  default:
    'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
  success:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  brand:
    'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
};

const dotColorClasses = {
  default: 'bg-surface-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  brand: 'bg-brand-500',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
};

function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  ...props
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', dotColorClasses[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
