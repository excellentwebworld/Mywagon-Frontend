import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ErpOrder, ErpOrderSortField } from '../../pages/ErpOrders/types';
import {
  ERP_SOURCE_STYLE,
  formatDateTime,
  formatShipDate,
  getOrderListTotals,
  getShipUrgency,
  shouldSuggestSplit,
  truncateText,
} from '../../pages/ErpOrders/erpOrderUiUtils';
import { ErpOrdersFloatingSelectionBar } from './ErpOrdersFloatingSelectionBar';
import type { ApiListMeta } from '../../api/types/addressBook';

const ST_CLS: Record<string, string> = {
  unplanned: 'st-new',
  planned: 'st-planned',
  on_trip: 'st-transit',
  completed: 'st-completed',
  canceled: 'st-canceled',
};

type SortCol = ErpOrderSortField | 'source' | 'linkedLoad' | null;

type Props = {
  t: (key: string, options?: Record<string, unknown>) => string;
  orders: ErpOrder[];
  listLoading: boolean;
  sortField: ErpOrderSortField;
  sortDir: 'asc' | 'desc';
  doSort: (field: ErpOrderSortField) => void;
  openDrawer: (id: string) => void;
  statusLabel: (status: ErpOrder['status']) => string;
  selectedIds: Set<string>;
  selectedOrderId: string | null;
  toggleSelect: (id: string) => void;
  toggleSelectAll: (checked: boolean) => void;
  clearSelection: () => void;
  onCreateLoad: () => void;
  listMeta: ApiListMeta;
  currentPage: number;
  perPage: number;
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

const mapSortCol = (col: SortCol): ErpOrderSortField | null => {
  if (!col || col === 'source') return null;
  if (col === 'linkedLoad') return 'orderReference';
  return col;
};

export const ErpOrdersTable: React.FC<Props> = ({
  t,
  orders,
  listLoading,
  sortField,
  sortDir,
  doSort,
  openDrawer,
  statusLabel,
  selectedIds,
  selectedOrderId,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  onCreateLoad,
  listMeta,
  currentPage,
  perPage,
  pageSizeOptions,
  goToPage,
  setPageSize,
}) => {
  const [uiSortCol, setUiSortCol] = useState<SortCol>(sortField);
  const [uiSortDir, setUiSortDir] = useState<'asc' | 'desc'>(sortDir);

  const handleHeaderClick = (col: SortCol) => {
    const apiField = mapSortCol(col);
    if (apiField) {
      doSort(apiField);
      setUiSortCol(col);
      setUiSortDir(sortField === apiField && sortDir === 'asc' ? 'desc' : 'asc');
      return;
    }
    if (uiSortCol !== col) {
      setUiSortCol(col);
      setUiSortDir('asc');
      return;
    }
    if (uiSortDir === 'asc') {
      setUiSortDir('desc');
      return;
    }
    setUiSortCol(null);
    setUiSortDir('asc');
  };

  const activeSortCol = mapSortCol(uiSortCol) ? uiSortCol : uiSortCol;
  const activeSortDir = mapSortCol(uiSortCol) ? sortDir : uiSortDir;

  const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const total = listMeta.total ?? 0;
  const lastPage = listMeta.last_page ?? 1;
  const pageButtons = Array.from({ length: Math.min(lastPage, 7) }, (_, i) => i + 1);

  return (
    <>
      <div className="tbl-wrap anim">
        <div className="tbl-count-bar">
          <span>
            {t('erpOrdersShowingCount', { count: orders.length, total })}
          </span>
        </div>
        <div className="tbl-scroll">
          <table className="t t-ref">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="chk"
                    checked={allOnPageSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label={t('erpOrdersSelectAll')}
                  />
                </th>
                <SortTh label={t('erpOrdersColOrderId')} col="orderReference" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} />
                <SortTh label={t('erpOrdersColSource')} col="source" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} />
                <SortTh label={t('erpOrdersColCustomer')} col="customer" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} />
                <th>{t('erpOrdersColShipFrom')}</th>
                <th>{t('erpOrdersColShipTo')}</th>
                <SortTh label={t('erpOrdersShipDate')} col="shipDate" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} />
                <th className="hide-lg">{t('erpOrdersColProducts')}</th>
                <SortTh label={t('erpOrdersColStatus')} col="status" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} />
                <SortTh label={t('erpOrdersColLinkedLoad')} col="linkedLoad" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} className="hide-xl" />
                <SortTh label={t('erpOrdersColLastSync')} col="updatedAt" sortCol={activeSortCol} sortDir={activeSortDir} onClick={handleHeaderClick} className="hide-xl" />
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && !listLoading ? (
                <tr>
                  <td colSpan={12} className="erp-empty-cell">
                    <div className="erp-empty-state">
                      <div className="erp-empty-icon">📦</div>
                      <div className="erp-empty-title">{t('erpOrdersEmptyTitle')}</div>
                      <div className="erp-empty-desc">{t('erpOrdersNoResults')}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isRowSelected = selectedOrderId === o.id;
                  const isChecked = selectedIds.has(o.id);
                  const totals = getOrderListTotals(o);
                  const urgency = getShipUrgency(o.shipDate, t);
                  const needsSplit = shouldSuggestSplit(o);

                  return (
                    <tr
                      key={o.id}
                      className={`erp-row${isRowSelected ? ' row-open' : ''}${isChecked ? ' sel' : ''}`}
                      onClick={() => openDrawer(o.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="chk"
                          checked={isChecked}
                          onChange={() => toggleSelect(o.id)}
                        />
                      </td>
                      <td>
                        <div className="cell-id">{o.orderReference}</div>
                        {o.erpReference ? <div className="cell-erp">{o.erpReference}</div> : null}
                      </td>
                      <td>
                        <span className="erp-source-pill">
                          <span>{ERP_SOURCE_STYLE.icon}</span>
                          <span>{t(ERP_SOURCE_STYLE.labelKey)}</span>
                        </span>
                      </td>
                      <td className="cell-cust">
                        {o.highPriority && <span className="pri-badge urgent">⚡</span>}
                        {o.customerName}
                      </td>
                      <td className="hide-md">
                        <div className="cell-loc">📍 {truncateText(o.shipFrom)}</div>
                      </td>
                      <td className="hide-md">
                        <div className="cell-loc">📍 {truncateText(o.shipTo)}</div>
                      </td>
                      <td className="cell-date">
                        <div className="erp-ship-date-cell">
                          <span>{formatShipDate(o.shipDate || o.deliveryDate)}</span>
                          {urgency && (
                            <span className="erp-urgency-badge" style={{ background: urgency.bg, color: urgency.fg, borderColor: urgency.bd }}>
                              {urgency.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hide-lg cell-prod">
                        <span className="erp-prod-summary">
                          {totals.lineCount} {t('erpOrdersLinesShort')} · {totals.pallets} {t('erpOrdersPltShort')} · {totals.weightTons}
                          {t('erpOrdersTonsShort')}
                        </span>
                        {needsSplit && (
                          <span className="erp-split-flag" title={t('erpOrdersSuggestSplit')}>
                            ⚠ {t('erpOrdersSuggestSplit')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`st ${ST_CLS[o.status] || ''}`}>{statusLabel(o.status)}</span>
                      </td>
                      <td className="cell-load hide-xl">
                        {o.linkedLoadSid ? (
                          <Link to={`/shipments/${o.linkedLoadId || o.linkedLoadSid}`} onClick={(e) => e.stopPropagation()}>
                            {o.linkedLoadSid}
                          </Link>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td className="cell-sync hide-xl">
                        <span className="dq-dot ok" />
                        {formatDateTime(o.updatedAt)}
                      </td>
                      <td />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="pag">
          <div className="pag-info">
            {total > 0
              ? t('erpOrdersShowing', {
                  start: (currentPage - 1) * perPage + 1,
                  end: Math.min(currentPage * perPage, total),
                  total,
                })
              : ''}
            {total > 0 && (
              <select
                className="erp-page-size"
                value={perPage}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label={t('erpOrdersPageSize')}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} / {t('page')}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="pag-btns">
            <button type="button" className="pg-btn" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              ‹
            </button>
            {pageButtons.map((n) => (
              <button
                key={n}
                type="button"
                className={`pg-btn${currentPage === n ? ' act' : ''}`}
                onClick={() => goToPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" className="pg-btn" disabled={currentPage >= lastPage} onClick={() => goToPage(currentPage + 1)}>
              ›
            </button>
          </div>
        </div>
      </div>

      <ErpOrdersFloatingSelectionBar
        t={t}
        selectedCount={selectedIds.size}
        onCreateLoad={onCreateLoad}
        onClear={clearSelection}
      />
    </>
  );
};

function SortTh({
  label,
  col,
  sortCol,
  sortDir,
  onClick,
  className,
}: {
  label: string;
  col: SortCol;
  sortCol: SortCol;
  sortDir: 'asc' | 'desc';
  onClick: (col: SortCol) => void;
  className?: string;
}) {
  const isActive = sortCol === col;
  const ascActive = isActive && sortDir === 'asc';
  const descActive = isActive && sortDir === 'desc';
  return (
    <th
      className={`sort-th${isActive ? ' sorted' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onClick(col)}
    >
      <span className="sort-th-inner">
        <span>{label}</span>
        <span className="sort-chevs">
          <span className={`sort-chev up${ascActive ? ' act' : ''}`}>▲</span>
          <span className={`sort-chev down${descActive ? ' act' : ''}`}>▼</span>
        </span>
      </span>
    </th>
  );
}
