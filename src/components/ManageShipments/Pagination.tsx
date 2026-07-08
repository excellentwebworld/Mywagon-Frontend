import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
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

  return (
    <div className="pag">
      <span className="pag-info">
        {t('showing')} {start}–{end} {t('of')} {total}
      </span>
      <div className="pag-btns">
        <button type="button" className="pg-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
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
