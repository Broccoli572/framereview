import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import clsx from 'clsx';

function Table({
  columns = [],
  data = [],
  loading = false,
  emptyText = 'No data available',
  emptyIcon: EmptyIcon = Inbox,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSort,
  className,
  wrapperClassName,
}) {
  const [internalSortKey, setInternalSortKey] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState('asc');

  const isControlled = controlledSortKey !== undefined;
  const sortKey = isControlled ? controlledSortKey : internalSortKey;
  const sortDir = isControlled ? controlledSortDir : internalSortDir;

  const handleSort = (key) => {
    if (isControlled) {
      onSort?.(key);
      return;
    }
    setInternalSortKey((prev) => {
      if (prev === key) {
        setInternalSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setInternalSortDir('asc');
      return key;
    });
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) {
      return <ArrowUpDown size={14} className="text-surface-400" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={14} className="text-brand-600" />
    ) : (
      <ArrowDown size={14} className="text-brand-600" />
    );
  };

  return (
    <div
      className={clsx(
        'overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700',
        wrapperClassName
      )}
    >
      <table className={clsx('w-full text-sm', className)}>
        <thead>
          <tr className="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                  'text-surface-500 dark:text-surface-400',
                  col.sortable !== false && 'cursor-pointer select-none hover:text-surface-700 dark:hover:text-surface-200',
                  col.className
                )}
                onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <div className="flex items-center gap-1.5">
                  {col.title}
                  {col.sortable !== false && <SortIcon colKey={col.key} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
          {loading
            ? Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
                    </td>
                  ))}
                </tr>
              ))
            : sortedData.map((row, rowIdx) => (
                <tr
                  key={row.id ?? rowIdx}
                  className="transition-colors duration-150 hover:bg-surface-50 dark:hover:bg-surface-800/50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3 text-surface-700 dark:text-surface-300',
                        col.cellClassName
                      )}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && sortedData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-surface-400 dark:text-surface-500">
          <EmptyIcon size={40} className="mb-3" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm">{emptyText}</p>
        </div>
      )}
    </div>
  );
}

export default Table;

// Compound component API for flexible table layouts
export function Head({ children, className }) {
  return (
    <thead className={clsx('border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50', className)}>
      {children}
    </thead>
  );
}

export function Body({ children, className }) {
  return (
    <tbody className={clsx('divide-y divide-surface-200 dark:divide-surface-700', className)}>
      {children}
    </tbody>
  );
}

export function Row({ children, className, ...props }) {
  return (
    <tr
      className={clsx('transition-colors duration-150 hover:bg-surface-50 dark:hover:bg-surface-800/50', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function HeaderCell({ children, className, sortable, onClick }) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400',
        sortable && 'cursor-pointer select-none hover:text-surface-700 dark:hover:text-surface-200',
        className
      )}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

export function Cell({ children, className, ...props }) {
  return (
    <td className={clsx('px-4 py-3 text-surface-700 dark:text-surface-300', className)} {...props}>
      {children}
    </td>
  );
}
