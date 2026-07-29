/**
 * PaginationBar — Shared table footer with:
 *  - "Showing X–Y of Z" label
 *  - Per-page selector (10 / 20 / 50 / 100)
 *  - Page navigation buttons (« ‹ N/M › »)
 *
 * Used by: Orders, Partners, Product Master, Address Book
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

export default function PaginationBar({
  showFrom, showTo, totalCount,
  pageSize, setPageSize,
  safePage, totalPages,
  setPage,
  itemLabel, // optional — override "items" word
}) {
  const { t } = useTranslation();
  const { T } = useTheme();

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0 flex-wrap gap-2"
      style={{ borderTop: `1px solid ${T.bd}`, background: T.sf }}
    >
      <div style={{ fontSize: 12, color: T.t3 }}>
        {t('common.showing', 'Showing')}{' '}
        <strong style={{ color: T.t1 }}>{showFrom}–{showTo}</strong>{' '}
        {t('common.of', 'of')}{' '}
        <strong style={{ color: T.t1 }}>{totalCount}</strong>{' '}
        {itemLabel || t('common.items', 'items')}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 11, color: T.t3 }}>{t('common.perPage', 'Per page')}</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 rounded cursor-pointer outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}
          >
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <PgBtn T={T} disabled={safePage <= 1} onClick={() => setPage(1)}>«</PgBtn>
          <PgBtn T={T} disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>‹</PgBtn>
          <span style={{ fontSize: 12, color: T.t1, fontWeight: 600, padding: '0 8px', fontFamily: "'JetBrains Mono', monospace" }}>
            {safePage} / {totalPages}
          </span>
          <PgBtn T={T} disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>›</PgBtn>
          <PgBtn T={T} disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>»</PgBtn>
        </div>
      </div>
    </div>
  );
}

function PgBtn({ T, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="rounded cursor-pointer border-none font-semibold"
      style={{
        padding: '4px 8px', fontSize: 12,
        background: disabled ? 'transparent' : T.sa,
        color: disabled ? T.t3 : T.t1,
        border: `1px solid ${disabled ? 'transparent' : T.bd}`,
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = T.sh; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = disabled ? 'transparent' : T.sa; }}
    >
      {children}
    </button>
  );
}
