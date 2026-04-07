import { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import clsx from 'clsx';

const SearchInput = forwardRef(function SearchInput(
  {
    value: controlledValue,
    defaultValue = '',
    onChange,
    onSearch,
    debounceMs = 300,
    placeholder = 'Search...',
    disabled = false,
    className,
    wrapperClassName,
    ...props
  },
  ref
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedSearch = useCallback(
    (searchValue) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch?.(searchValue);
      }, debounceMs);
    },
    [debounceMs, onSearch]
  );

  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
      debouncedSearch(newValue);
    },
    [controlledValue, onChange, debouncedSearch]
  );

  const handleClear = useCallback(() => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    onSearch?.('');
    inputRef.current?.focus();
  }, [controlledValue, onChange, onSearch]);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className={clsx('relative', wrapperClassName)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search size={16} className="text-surface-400 dark:text-surface-500" aria-hidden="true" />
      </div>
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'block w-full rounded-lg border border-surface-300 py-2 pl-9 pr-9 text-sm',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-200',
          'placeholder:text-surface-400',
          'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500',
          'dark:focus:ring-brand-800',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&::-webkit-search-cancel-button]:hidden',
          className
        )}
        {...props}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className={clsx(
            'absolute inset-y-0 right-0 flex items-center pr-3',
            'text-surface-400 hover:text-surface-600 transition-colors duration-150',
            'dark:text-surface-500 dark:hover:text-surface-300'
          )}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
});

export default SearchInput;
