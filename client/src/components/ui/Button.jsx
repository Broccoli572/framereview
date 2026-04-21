import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const variants = {
  primary:
    'bg-surface-900 text-white shadow-sm hover:-translate-y-0.5 hover:bg-surface-800 active:translate-y-0 active:bg-surface-950 focus-visible:ring-surface-500 dark:bg-surface-100 dark:text-surface-900 dark:hover:bg-white',
  secondary:
    'bg-surface-100 text-surface-700 ring-1 ring-inset ring-surface-200 hover:bg-surface-200 active:bg-surface-300 focus-visible:ring-surface-400 dark:bg-surface-800 dark:text-surface-200 dark:ring-surface-700 dark:hover:bg-surface-700 dark:active:bg-surface-600',
  ghost:
    'text-surface-600 hover:bg-surface-100 active:bg-surface-200 focus-visible:ring-surface-400 dark:text-surface-300 dark:hover:bg-surface-800 dark:active:bg-surface-700',
  danger:
    'bg-red-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0 active:bg-red-800 focus-visible:ring-red-500',
};

const sizes = {
  sm: 'h-8 rounded-lg px-3 text-xs gap-1.5',
  md: 'h-10 rounded-xl px-4 text-sm gap-2',
  lg: 'h-11 rounded-xl px-5 text-sm gap-2',
};

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 18,
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    type = 'button',
    className,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const iconSize = iconSizes[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium tracking-[0.01em] transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-surface-900',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={iconSize} aria-hidden="true" />
      ) : (
        LeftIcon && <LeftIcon size={iconSize} aria-hidden="true" />
      )}
      {children}
      {!loading && RightIcon && <RightIcon size={iconSize} aria-hidden="true" />}
    </button>
  );
});

export default Button;
