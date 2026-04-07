import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className={clsx(
          'relative w-full rounded-xl bg-white shadow-xl dark:bg-surface-900 animate-scale-in',
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-start justify-between border-b border-surface-200 px-6 py-4 dark:border-surface-800">
            <div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
