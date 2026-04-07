import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-900 dark:border-t-surface-100 border-x-transparent border-b-transparent border-4',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-900 dark:border-b-surface-100 border-x-transparent border-t-transparent border-4',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-900 dark:border-l-surface-100 border-y-transparent border-r-transparent border-4',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-900 dark:border-r-surface-100 border-y-transparent border-l-transparent border-4',
};

function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
  disabled = false,
  className,
  contentClassName,
}) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);

  const show = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [disabled, delay]);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={clsx(
            'absolute z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium',
            'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900',
            'animate-fade-in pointer-events-none shadow-lg',
            positionClasses[position],
            contentClassName
          )}
        >
          {content}
          <span className={clsx('absolute', arrowClasses[position])} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default Tooltip;
