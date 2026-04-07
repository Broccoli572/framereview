import { useCallback, useState } from 'react';
import clsx from 'clsx';

function Switch({
  checked: controlledChecked = false,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  id,
  size = 'md',
  className,
  ...props
}) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const switchId = id || props.name || label?.replace(/\s+/g, '-').toLowerCase();

  const toggle = useCallback(() => {
    if (disabled) return;
    const newChecked = !isChecked;
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    onChange?.(newChecked);
  }, [disabled, isControlled, isChecked, onChange]);

  const sizeConfig = {
    sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translate: { on: 18, off: 3 } },
    md: { track: 'h-6 w-11', thumb: 'h-4 w-4', translate: { on: 22, off: 3 } },
  };

  const config = sizeConfig[size];
  const translateX = isChecked ? config.translate.on : config.translate.off;

  const switchEl = (
    <button
      id={switchId}
      role="switch"
      type="button"
      aria-checked={isChecked}
      aria-label={label}
      disabled={disabled}
      onClick={toggle}
      className={clsx(
        'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-surface-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        config.track,
        isChecked
          ? 'bg-brand-600'
          : 'bg-surface-300 dark:bg-surface-600',
        className
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          config.thumb,
          'absolute top-[2px] left-[2px]'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        aria-hidden="true"
      />
    </button>
  );

  if (label) {
    return (
      <label
        htmlFor={switchId}
        className={clsx(
          'inline-flex items-center gap-2.5 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {switchEl}
        <span className="text-sm text-surface-700 dark:text-surface-300">{label}</span>
      </label>
    );
  }

  return switchEl;
}

export default Switch;
