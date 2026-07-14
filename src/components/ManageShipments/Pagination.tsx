import React, { useMemo } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
}

const WINDOW_SIZE = 5;

function pageWindow(current: number, total: number, size = WINDOW_SIZE): number[] {
  if (total <= 0) return [];
  if (total <= size) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(size / 2));
  let end = start + size - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - size + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  t,
}) => {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  return (
    <div className="pag">
      <span className="pag-info">
        {t('showing')} {start}–{end} {t('of')} {total}
      </span>
      <div className="pag-btns">
        <button type="button" className="pg-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`pg-btn ${page === p ? 'act' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="pg-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
};
