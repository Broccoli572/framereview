import { useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

const TOAST_TIMEOUT = 5000;
const MAX_TOASTS = 5;

const variantConfig = {
  success: {
    icon: CheckCircle2,
    container: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800 dark:text-green-200',
    messageColor: 'text-green-700 dark:text-green-300',
  },
  error: {
    icon: XCircle,
    container: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800 dark:text-red-200',
    messageColor: 'text-red-700 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800 dark:text-amber-200',
    messageColor: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    icon: Info,
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800 dark:text-blue-200',
    messageColor: 'text-blue-700 dark:text-blue-300',
  },
};

const ToastContext = createContext(null);

function ToastItem({ toast, onDismiss }) {
  const { variant = 'info', title, message, duration = TOAST_TIMEOUT } = toast;
  const config = variantConfig[variant];
  const Icon = config.icon;
  const timerRef = useRef(null);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="alert"
      className={clsx(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-slide-down',
        config.container
      )}
    >
      <Icon size={18} className={clsx('mt-0.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={clsx('text-sm font-semibold', config.titleColor)}>{title}</p>
        )}
        {message && (
          <p className={clsx('mt-0.5 text-sm', config.messageColor)}>{message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={clsx(
          'shrink-0 rounded p-0.5 transition-colors duration-150',
          'text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
        )}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

let toastCounter = 0;

function ToastProvider({ children, position = 'top-right' }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((props) => {
    const id = ++toastCounter;
    setToasts((prev) => {
      const next = [...prev, { id, ...props }];
      return next.slice(-MAX_TOASTS);
    });
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      success: (props) => addToast({ variant: 'success', ...normalizeProps(props) }),
      error: (props) => addToast({ variant: 'error', ...normalizeProps(props) }),
      warning: (props) => addToast({ variant: 'warning', ...normalizeProps(props) }),
      info: (props) => addToast({ variant: 'info', ...normalizeProps(props) }),
      dismiss: dismissToast,
    }),
    [addToast, dismissToast]
  );

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-label="Notifications"
          className={clsx(
            'fixed z-[200] flex flex-col gap-2 pointer-events-none',
            positionClasses[position]
          )}
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function normalizeProps(props) {
  if (typeof props === 'string') return { message: props };
  return props;
}

function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export { ToastProvider, useToast };
export default ToastProvider;
