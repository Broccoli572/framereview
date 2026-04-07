import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input(
  { label, error, helperText, leftIcon: LeftIcon, rightIcon: RightIcon, className, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <LeftIcon size={16} className="text-surface-400" />
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors duration-150',
            'placeholder:text-surface-400',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-surface-50 disabled:opacity-60',
            'dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100',
            'dark:placeholder:text-surface-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
              : 'border-surface-300',
            LeftIcon && 'pl-10',
            RightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {RightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <RightIcon size={16} className="text-surface-400" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-surface-500">{helperText}</p>
      )}
    </div>
  );
});

export default Input;
