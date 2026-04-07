import { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

const Select = forwardRef(function Select(
  {
    label,
    helperText,
    error,
    options = [],
    placeholder = 'Select an option',
    searchable = false,
    disabled = false,
    value,
    onChange,
    id,
    className,
    wrapperClassName,
    ...props
  },
  ref
) {
  const selectId = id || props.name || label?.replace(/\s+/g, '-').toLowerCase();
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = useCallback(
    (option) => {
      onChange?.(option.value);
      setOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => !prev);
    setSearchQuery('');
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        containerRef.current?.focus();
      }
      if (e.key === 'ArrowDown' && !open) {
        e.preventDefault();
        setOpen(true);
      }
    },
    [open]
  );

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={wrapperClassName}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
        <button
          ref={ref}
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          aria-describedby={clsx(error && errorId, !error && helperText && helperId) || undefined}
          disabled={disabled}
          onClick={handleToggle}
          className={clsx(
            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-500 text-red-900 focus:border-red-500 focus:ring-red-200 dark:text-red-300 dark:focus:ring-red-800'
              : 'border-surface-300 text-surface-900 focus:border-brand-500 focus:ring-brand-200 dark:border-surface-600 dark:focus:ring-brand-800',
            !selectedOption && 'text-surface-400 dark:text-surface-500',
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={clsx(
              'ml-2 shrink-0 text-surface-400 transition-transform duration-200',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={label || 'Select options'}
            className={clsx(
              'absolute z-50 mt-1 w-full rounded-lg border shadow-lg',
              'animate-scale-in',
              'bg-white dark:bg-surface-800',
              'border-surface-200 dark:border-surface-700',
              'max-h-60 overflow-auto'
            )}
          >
            {searchable && (
              <div className="border-b border-surface-200 p-2 dark:border-surface-700">
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className={clsx(
                      'w-full rounded-md border border-surface-200 bg-white py-1.5 pl-8 pr-8 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500',
                      'dark:bg-surface-700 dark:border-surface-600 dark:text-surface-100 dark:focus:ring-brand-800'
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option)}
                  className={clsx(
                    'flex w-full items-center px-3 py-2 text-left text-sm transition-colors duration-150',
                    'hover:bg-surface-50 dark:hover:bg-surface-700',
                    option.value === value
                      ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-950 dark:text-brand-300'
                      : 'text-surface-700 dark:text-surface-200'
                  )}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Select;
