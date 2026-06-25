import React from 'react';
import { Link } from 'react-router-dom';
import type { ErpOrder, ErpOrderSortField, ErpOrderTableSortField } from '../../pages/ErpOrders/types';
import {
  formatDateTime,
  formatProductsPreview,
  formatShipDate,
  truncateText,
} from '../../pages/ErpOrders/erpOrderUiUtils';
import { ErpOrdersFloatingSelectionBar } from './ErpOrdersFloatingSelectionBar';
import { ListSkeleton } from '../skeletons/ListSkeleton';
import type { ApiListMeta } from '../../api/types/addressBook';

const ST_CLS: Record<string, string> = {
  unplanned: 'st-new',
  planned: 'st-planned',
  on_trip: 'st-transit',
  completed: 'st-completed',
  canceled: 'st-canceled',
};

const TABLE_COL_COUNT = 11;

function SortColumnHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: ErpOrderTableSortField;
  sortField: ErpOrderSortField;
  sortDir: 'asc' | 'desc';
  onSort: (field: ErpOrderTableSortField) => void;
  className?: string;
}) {
  const isActive = sortField === field;
  const arrow = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↑';

  return (
    <th className={className}>
      <button
        type="button"
        className={`th-sort-btn${isActive ? ' active' : ''}`}
        onClick={() => onSort(field)}
      >
        {label}
        <span className="th-sort-arrow" aria-hidden="true">
          {arrow}
        </span>
      </button>
    </th>
  );
}

type Props = {
  t: (key: string, options?: Record<string, unknown>) => string;
  orders: ErpOrder[];
  listLoading: boolean;
  sortField: ErpOrderSortField;
  sortDir: 'asc' | 'desc';
  doSort: (field: ErpOrderTableSortField) => void;
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
  const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const total = listMeta.total ?? 0;
  const lastPage = listMeta.last_page ?? 1;
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  const pageButtons = Array.from({ length: Math.min(lastPage, 7) }, (_, i) => i + 1);

  return (
    <>
      <div className="erp-list-pane anim">
        <div className="erp-list-toolbar">
          <span>
            {listLoading && orders.length === 0
              ? '…'
              : t('erpOrdersShowingCount', { count: orders.length, total })}
          </span>
        </div>

        <div className={`erp-tbl-scroll table-scroll-host${listLoading && orders.length === 0 ? ' loading-active' : ''}`}>
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
                    disabled={listLoading && orders.length === 0}
                  />
                </th>
                <SortColumnHeader
                  label={t('erpOrdersColOrderId')}
                  field="orderReference"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={doSort}
                />
                <SortColumnHeader
                  label={t('erpOrdersColCustomer')}
                  field="customer"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={doSort}
                />
                <th>{t('erpOrdersColShipFrom')}</th>
                <th>{t('erpOrdersColShipTo')}</th>
                <SortColumnHeader
                  label={t('erpOrdersColDeliveryDate')}
                  field="deliveryDate"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={doSort}
                />
                <th className="hide-lg">{t('erpOrdersColProducts')}</th>
                <th>{t('erpOrdersColStatus')}</th>
                <th className="hide-xl">{t('erpOrdersColLinkedLoad')}</th>
                <SortColumnHeader
                  label={t('erpOrdersColLastUpdate')}
                  field="updatedAt"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={doSort}
                  className="hide-xl"
                />
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && !listLoading ? (
                <tr>
                  <td colSpan={TABLE_COL_COUNT} className="erp-empty-cell">
                    <div className="erp-empty-state">
                      <div className="erp-empty-icon">📦</div>
                      <div className="erp-empty-title">{t('erpOrdersEmptyTitle')}</div>
                      <div className="erp-empty-desc">{t('erpOrdersNoResults')}</div>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 && listLoading ? (
                <ListSkeleton type="table" rowCount={8} columnCount={TABLE_COL_COUNT} />
              ) : (
                orders.map((o) => {
                  const isRowSelected = selectedOrderId === o.id;
                  const isChecked = selectedIds.has(o.id);

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
                      <td className="cell-date">{formatShipDate(o.deliveryDate)}</td>
                      <td className="hide-lg cell-prod">
                        {formatProductsPreview(o.productsPreview, o.productCount)}
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
                      <td className="cell-sync hide-xl">{formatDateTime(o.updatedAt)}</td>
                      <td />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="erp-pag">
          <div className="erp-pag-info">
            {total === 0
              ? `${t('erpOrdersShowing', { start: 0, end: 0, total: 0 })}`
              : t('erpOrdersShowing', { start, end, total })}
            <select
              className="erp-page-size pag-length-sel"
              value={perPage}
              onChange={(e) => setPageSize(Number(e.target.value))}
              disabled={listLoading}
              aria-label={t('erpOrdersPageSize')}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n} / {t('page')}
                </option>
              ))}
            </select>
          </div>
          <div className="erp-pag-btns">
            <button type="button" className="pg-btn" disabled={currentPage <= 1 || listLoading} onClick={() => goToPage(currentPage - 1)}>
              ‹
            </button>
            {pageButtons.map((n) => (
              <button
                key={n}
                type="button"
                className={`pg-btn${currentPage === n ? ' act' : ''}`}
                disabled={listLoading}
                onClick={() => goToPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" className="pg-btn" disabled={currentPage >= lastPage || listLoading} onClick={() => goToPage(currentPage + 1)}>
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
