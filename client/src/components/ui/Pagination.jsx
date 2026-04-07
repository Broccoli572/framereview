import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function Pagination({
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
  showTotal = true,
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pages = useMemo(() => {
    const items = [];
    const delta = 1;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    items.push(1);
    if (left > 2) {
      items.push('start-ellipsis');
    }
    for (let i = left; i <= right; i++) {
      items.push(i);
    }
    if (right < totalPages - 1) {
      items.push('end-ellipsis');
    }
    if (totalPages > 1) {
      items.push(totalPages);
    }
    return items;
  }, [page, totalPages]);

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={clsx('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <div className="flex items-center gap-3 text-sm text-surface-600 dark:text-surface-400">
        {showTotal && total > 0 && (
          <span>
            Showing <span className="font-medium text-surface-900 dark:text-surface-100">{rangeStart}</span>-{''}
            <span className="font-medium text-surface-900 dark:text-surface-100">{rangeEnd}</span> of{' '}
            <span className="font-medium text-surface-900 dark:text-surface-100">{total}</span>
          </span>
        )}
        {showPageSize && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className={clsx(
              'rounded-md border border-surface-300 bg-white px-2 py-1 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500',
              'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200'
            )}
            aria-label="Page size"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange?.(1)}
          disabled={!canPrev}
          className={clsx(
            'inline-flex items-center justify-center rounded-md p-1.5 transition-colors duration-150',
            canPrev
              ? 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200'
              : 'cursor-not-allowed text-surface-300 dark:text-surface-600'
          )}
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange?.(page - 1)}
          disabled={!canPrev}
          className={clsx(
            'inline-flex items-center justify-center rounded-md p-1.5 transition-colors duration-150',
            canPrev
              ? 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200'
              : 'cursor-not-allowed text-surface-300 dark:text-surface-600'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, idx) =>
          typeof p === 'string' ? (
            <span
              key={p}
              className="px-1.5 text-surface-400 dark:text-surface-500 select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange?.(p)}
              aria-current={p === page ? 'page' : undefined}
              className={clsx(
                'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                'min-w-[2rem]',
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange?.(page + 1)}
          disabled={!canNext}
          className={clsx(
            'inline-flex items-center justify-center rounded-md p-1.5 transition-colors duration-150',
            canNext
              ? 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200'
              : 'cursor-not-allowed text-surface-300 dark:text-surface-600'
          )}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange?.(totalPages)}
          disabled={!canNext}
          className={clsx(
            'inline-flex items-center justify-center rounded-md p-1.5 transition-colors duration-150',
            canNext
              ? 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200'
              : 'cursor-not-allowed text-surface-300 dark:text-surface-600'
          )}
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
