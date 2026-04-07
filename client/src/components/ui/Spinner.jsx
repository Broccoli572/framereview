import clsx from 'clsx';

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

function Spinner({
  size = 'md',
  className,
  label = 'Loading',
  overlay = false,
  overlayTransparent = false,
}) {
  const spinner = (
    <svg
      className={clsx(
        'animate-spin rounded-full border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={label}
    >
      <circle
        className="opacity-25"
        cx="50%"
        cy="50%"
        r="40%"
        stroke="currentColor"
        strokeWidth="inherit"
        fill="none"
      />
      <circle
        className="opacity-75"
        cx="50%"
        cy="50%"
        r="40%"
        stroke="currentColor"
        strokeWidth="inherit"
        fill="none"
        strokeDasharray="60 80"
        strokeLinecap="round"
      />
      <span className="sr-only">{label}</span>
    </svg>
  );

  if (overlay) {
    return (
      <div
        className={clsx(
          'absolute inset-0 z-40 flex items-center justify-center',
          overlayTransparent ? 'bg-transparent' : 'bg-white/60 dark:bg-surface-900/60'
        )}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default Spinner;
