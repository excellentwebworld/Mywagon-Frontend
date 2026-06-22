import React from 'react';
import type { ApiListMeta } from '../../api/types/addressBook';

type Props = {
  t: (key: string, options?: Record<string, unknown>) => string;
  listMeta: ApiListMeta;
  currentPage: number;
  perPage: number;
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export const ErpOrdersPagination: React.FC<Props> = ({
  t,
  listMeta,
  currentPage,
  perPage,
  pageSizeOptions,
  goToPage,
  setPageSize,
}) => {
  const total = listMeta.total ?? 0;
  const lastPage = listMeta.last_page ?? 1;
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  return (
    <div className="tbl-foot">
      <div className="tbl-foot-l">
        {t('erpOrdersShowing', { start, end, total })}
        <select value={perPage} onChange={(e) => setPageSize(Number(e.target.value))} style={{ marginLeft: 12 }}>
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n} / {t('page')}
            </option>
          ))}
        </select>
      </div>
      <div className="tbl-foot-r">
        <button type="button" className="btn btn-sm" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
          ‹
        </button>
        <span style={{ padding: '0 10px' }}>
          {currentPage} / {lastPage}
        </span>
        <button type="button" className="btn btn-sm" disabled={currentPage >= lastPage} onClick={() => goToPage(currentPage + 1)}>
          ›
        </button>
      </div>
    </div>
  );
};
