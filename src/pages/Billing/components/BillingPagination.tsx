import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  loading?: boolean;
  label?: string;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
};

function buildPages(current: number, last: number): number[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= last - 2) {
    pages.add(last - 1);
    pages.add(last - 2);
    pages.add(last - 3);
  }
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= last)
    .sort((a, b) => a - b);
}

export const BillingPagination: React.FC<Props> = ({
  page,
  lastPage,
  total,
  perPage,
  loading = false,
  label = 'items',
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50],
}) => {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const pages = buildPages(page, Math.max(lastPage, 1));

  return (
    <div className="billing-pag ab-pag">
      <div className="pag-info">
        {total === 0
          ? t('billingPage.showingNone', 'Showing 0 of 0')
          : t('billingPage.showingRange', 'Showing {{from}}–{{to}} of {{total}}', {
              from,
              to,
              total,
            })}{' '}
        {label}
        {onPerPageChange ? (
          <select
            className="pag-length-sel"
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            disabled={loading}
            aria-label={t('billingPage.rowsPerPage', 'Rows per page')}
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>
                {n} / {t('common.page', 'page')}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="pag-controls">
        <div className="pag-btns">
          <button
            type="button"
            className="pg-btn"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(1)}
            aria-label={t('common.firstPage', 'First page')}
          >
            «
          </button>
          <button
            type="button"
            className="pg-btn"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('common.prev', 'Prev')}
          >
            ‹
          </button>
          {pages.map((p, idx) => {
            const prev = pages[idx - 1];
            const gap = prev !== undefined && p - prev > 1;
            return (
              <React.Fragment key={p}>
                {gap ? <span className="pg-ellipsis">…</span> : null}
                <button
                  type="button"
                  className={`pg-btn ${p === page ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                  disabled={loading}
                >
                  {p}
                </button>
              </React.Fragment>
            );
          })}
          <button
            type="button"
            className="pg-btn"
            disabled={page >= lastPage || loading}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('common.next', 'Next')}
          >
            ›
          </button>
          <button
            type="button"
            className="pg-btn"
            disabled={page >= lastPage || loading}
            onClick={() => onPageChange(lastPage)}
            aria-label={t('common.lastPage', 'Last page')}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};
