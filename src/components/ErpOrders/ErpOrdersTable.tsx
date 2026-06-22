import React from 'react';
import { Link } from 'react-router-dom';
import { TableLoadingOverlay } from '../ui/TableLoadingOverlay';
import type { ErpOrder, ErpOrderSortField } from '../../pages/ErpOrders/types';

const ST_CLS: Record<string, string> = {
  unplanned: 'st-new',
  planned: 'st-planned',
  on_trip: 'st-transit',
  completed: 'st-completed',
  canceled: 'st-canceled',
};

const fmtD = (d: string) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDT = (d: string) => {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

type Props = {
  t: (key: string) => string;
  orders: ErpOrder[];
  listLoading: boolean;
  sortField: ErpOrderSortField;
  sortDir: 'asc' | 'desc';
  doSort: (field: ErpOrderSortField) => void;
  openDrawer: (id: string) => void;
  statusLabel: (status: ErpOrder['status']) => string;
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
}) => {
  const sortIcon = (field: ErpOrderSortField) => {
    if (sortField !== field) return '↕';
    return sortDir === 'asc' ? '▲' : '▼';
  };

  return (
    <div className="tbl-wrap table-scroll-host">
      <TableLoadingOverlay active={listLoading} />
      <div className="tbl-scroll">
        <table className="t">
          <thead>
            <tr>
              <th onClick={() => doSort('orderReference')} className={sortField === 'orderReference' ? 'sorted' : ''}>
                {t('erpOrdersColOrderId')} <span className="s-arr">{sortIcon('orderReference')}</span>
              </th>
              <th onClick={() => doSort('customer')} className={sortField === 'customer' ? 'sorted' : ''}>
                {t('erpOrdersColCustomer')} <span className="s-arr">{sortIcon('customer')}</span>
              </th>
              <th>{t('erpOrdersColShipFrom')}</th>
              <th>{t('erpOrdersColShipTo')}</th>
              <th onClick={() => doSort('deliveryDate')} className={sortField === 'deliveryDate' ? 'sorted' : ''}>
                {t('erpOrdersColDeliveryDate')} <span className="s-arr">{sortIcon('deliveryDate')}</span>
              </th>
              <th>{t('erpOrdersColProducts')}</th>
              <th onClick={() => doSort('status')} className={sortField === 'status' ? 'sorted' : ''}>
                {t('erpOrdersColStatus')} <span className="s-arr">{sortIcon('status')}</span>
              </th>
              <th>{t('erpOrdersColLinkedLoad')}</th>
              <th onClick={() => doSort('updatedAt')} className={sortField === 'updatedAt' ? 'sorted' : ''}>
                {t('erpOrdersColLastUpdate')} <span className="s-arr">{sortIcon('updatedAt')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !listLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary, #8E8E9A)' }}>
                  {t('erpOrdersNoResults')}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} onClick={() => openDrawer(o.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="cell-id">{o.orderReference}</div>
                    {o.erpReference ? <div className="cell-erp">{o.erpReference}</div> : null}
                  </td>
                  <td className="cell-cust">
                    {o.highPriority && (
                      <span className="pri-badge urgent" style={{ marginRight: '5px' }}>
                        ⚡
                      </span>
                    )}
                    {o.customerName}
                  </td>
                  <td>
                    <div className="cell-loc">{o.shipFrom || '—'}</div>
                  </td>
                  <td>
                    <div className="cell-loc">{o.shipTo || '—'}</div>
                  </td>
                  <td className="cell-date">{fmtD(o.deliveryDate)}</td>
                  <td className="cell-prod">{o.productsPreview || '—'}</td>
                  <td>
                    <span className={`st ${ST_CLS[o.status] || ''}`}>{statusLabel(o.status)}</span>
                  </td>
                  <td className="cell-load">
                    {o.linkedLoadSid ? (
                      <Link to={`/shipments/${o.linkedLoadId || o.linkedLoadSid}`} onClick={(e) => e.stopPropagation()}>
                        {o.linkedLoadSid}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary, #8E8E9A)' }}>—</span>
                    )}
                  </td>
                  <td className="cell-sync">{fmtDT(o.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
