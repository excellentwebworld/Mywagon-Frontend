import React from 'react';

interface PaginationProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  total: number;
  currentPage: number;
  perPage: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  t,
  total,
  currentPage,
  perPage,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
}) => {
  const pageStart = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const pageEnd = Math.min(currentPage * perPage, total);
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  function buildPageList(current: number, last: number): number[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages = new Set<number>([1, last, current, current - 1, current + 1, 2, last - 1]);
    return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  }

  const pages = buildPageList(currentPage, lastPage);

  return (
    <div className="pag">
      <div className="pag-info">
        {total === 0 ? 'Showing 0 of 0' : `Showing ${pageStart}–${pageEnd} of ${total}`}
      </div>
      <div className="pag-controls">
        {showPageSizeSelector && (
          <select
            className="pag-length-sel"
            value={perPage}
            onChange={(e) => {
              const size = Number(e.target.value);
              onPageSizeChange?.(size);
            }}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        <div className="pag-btns">
          <button
            type="button"
            className="pg-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
          >
            «
          </button>
          <button
            type="button"
            className="pg-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </button>
          {pages.map((p, idx) => {
            const prev = pages[idx - 1];
            const gap = prev !== undefined && p - prev > 1;
            return (
              <React.Fragment key={p}>
                {gap && <span className="pg-ellipsis">…</span>}
                <button
                  type="button"
                  className={`pg-btn ${p === currentPage ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              </React.Fragment>
            );
          })}
          <button
            type="button"
            className="pg-btn"
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </button>
          <button
            type="button"
            className="pg-btn"
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(lastPage)}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};