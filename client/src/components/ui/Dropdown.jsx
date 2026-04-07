import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function Dropdown({ trigger, items, align = 'left', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={clsx('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger || (
          <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-800">
            <ChevronDown size={14} />
          </button>
        )}
      </div>
      {open && (
        <div
          className={clsx(
            'absolute z-50 mt-1 min-w-[180px] rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-900 animate-scale-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items?.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 border-t border-surface-200 dark:border-surface-700" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                    : 'text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800'
                )}
              >
                {item.icon && <item.icon size={14} />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
