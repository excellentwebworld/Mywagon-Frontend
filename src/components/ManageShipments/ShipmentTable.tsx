import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Shipment } from '../../context/AppContext';
import { statusBadgeClass } from '../../pages/ManageShipments/utils/listingUtils';
import { ListSkeleton } from '../skeletons/ListSkeleton';
import { RowExpansionPending } from './RowExpansionPending';
import { RowExpansionStatus } from './RowExpansionStatus';

const TABLE_COL_COUNT = 11;

interface ShipmentTableProps {
  loading?: boolean;
  shipments: Shipment[];
  selectedIds: Set<string>;
  expandedId: string | null;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onCopyId: (id: string) => void;
  onAward: (s: Shipment, carrier: string, price: number) => void;
  onInvite: () => void;
  onClone: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function orderCount(s: Shipment): number {
  if (s.ordersCount && s.ordersCount > 0) return s.ordersCount;
  const fromCustomers = s.customer.reduce((n, c) => n + (c.orders?.length || 0), 0);
  return fromCustomers || (s.ref ? 1 : 0);
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  loading = false,
  shipments,
  selectedIds,
  expandedId,
  onSelectAll,
  onSelectRow,
  onToggleExpand,
  onCopyId,
  onAward,
  onInvite,
  onClone,
  t,
}) => {
  const navigate = useNavigate();
  const allSelected = shipments.length > 0 && selectedIds.size === shipments.length;

  return (
    <table className="mgmt-t">
      <thead>
        <tr>
          <th className="chk">
            <input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
          </th>
          <th>{t('shipmentIdCol')}</th>
          <th>{t('laneColHeader')}</th>
          <th>{t('customerCol')}</th>
          <th>{t('status')}</th>
          <th>{t('visibilityCol')}</th>
          <th>{t('bidsCol')}</th>
          <th>{t('carrierCol')}</th>
          <th>{t('priceCol')}</th>
          <th>{t('lastUpdateCol')}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {shipments.length === 0 && !loading ? (
          <tr>
            <td colSpan={TABLE_COL_COUNT} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--text-tertiary)' }}>
              {t('noShipmentsFound')}
            </td>
          </tr>
        ) : shipments.length === 0 && loading ? (
          <ListSkeleton type="table" rowCount={8} columnCount={TABLE_COL_COUNT} />
        ) : (
          shipments.map((s) => {
            const isExpanded = expandedId === s.id;
            const isPending = s.status === 'pending';
            const badgeClass = statusBadgeClass(s.status, s.at_risk);
            const viaStops = s.viaStops?.length
              ? s.viaStops
              : s.via
                ? s.via.split(',').map((v) => v.trim()).filter(Boolean)
                : [];
            const stopCount = s.stopCount ?? (viaStops.length > 0 ? viaStops.length + 2 : undefined);
            const pickDt = s.pickDt || s.date;
            const delDt = s.delDt;
            const bidLabel = s.bids === 1 ? t('bid') : t('bids');

            return (
              <React.Fragment key={s.id}>
                <tr
                  className={isExpanded ? 'expanded' : ''}
                  onClick={() => onToggleExpand(s.id)}
                >
                  <td className="chk" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={(e) => onSelectRow(s.id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="sid">
                      <span>{s.autoId || s.id}</span>
                      <span
                        className="sid-copy"
                        title={t('copy')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyId(s.autoId || s.id);
                        }}
                      >
                        📋
                      </span>
                    </div>
                    <div className="sub">
                      {s.ref ? (
                        <>
                          {s.ref} · {t('orders')}: {orderCount(s)}
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="lane">
                      {s.origin} <span className="arr">→</span> {s.dest}
                    </div>
                    {viaStops.length > 0 && (
                      <div className="lane-stops">
                        {viaStops.map((stop, idx) => (
                          <React.Fragment key={`${s.id}-via-${idx}`}>
                            {idx > 0 && <span className="arr">→</span>}
                            <span className="lane-via">{stop}</span>
                          </React.Fragment>
                        ))}
                        {stopCount !== undefined && (
                          <span className="badge badge-gray" style={{ fontSize: 9, padding: '1px 5px' }}>
                            {stopCount} {t('stops').toLowerCase()}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="sub">
                      {pickDt && <>🔵 {pickDt}</>}
                      {delDt && (
                        <>
                          {' '}
                          · 🟢 {delDt}
                        </>
                      )}
                      {!pickDt && !delDt && '—'}
                    </div>
                  </td>
                  <td>
                    {s.customer.length ? (
                      <div className="cust-pills">
                        {s.customer.slice(0, 2).map((c, idx) => (
                          <span key={idx} className="cust-pill">
                            <span className="ci">🏪</span>
                            {c.name}
                          </span>
                        ))}
                        {s.customer.length > 2 && (
                          <span className="cust-overflow">+{s.customer.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>
                      <span className="bdot" />
                      {t(s.status)}
                    </span>
                    {s.at_risk && (
                      <>
                        <br />
                        <span className="badge badge-danger" style={{ marginTop: 4 }}>
                          <span className="bdot" />
                          {s.riskReason || t('atRiskLate')}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`vis vis-${s.vis === 'public' ? 'pub' : 'priv'}`}>{t(s.vis)}</span>
                    {s.vis === 'private' && (
                      <div className="sub">
                        {t('invited')}: {s.invited ?? 0}
                      </div>
                    )}
                  </td>
                  <td>
                    {isPending ? (
                      s.bids > 0 ? (
                        <div className="bids-cell">
                          <span className="bids-ct">
                            {s.bids} {bidLabel}
                          </span>
                          {s.best_bid != null && (
                            <span className="bids-best">
                              {' '}
                              · {t('best')} €{s.best_bid}
                            </span>
                          )}
                          {s.bid_exp && (
                            <>
                              <br />
                              <span className="bids-exp">⏱ {t('expires')} {s.bid_exp}</span>
                            </>
                          )}
                          {s.counter && (
                            <>
                              <br />
                              <span className={`co-badge-tbl ${s.counter.dir === 'up' ? 'co-up' : 'co-down'}`}>
                                ↩ {s.counter.pct} (€{s.counter.theirs})
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="sub">{t('noBids')}</span>
                      )
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td>
                    {s.carrier ? (
                      <div className="carrier-cell">
                        <span className="carrier-av">
                          {s.carrier_init || s.carrier.substring(0, 2).toUpperCase()}
                        </span>
                        {s.carrier}
                      </div>
                    ) : (
                      <span className="uncov">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                        {t('uncoveredLabel')}
                      </span>
                    )}
                  </td>
                  <td>
                    {s.price == null ? (
                      <span className="sub">—</span>
                    ) : (
                      <>
                        <span className="price">€ {s.price.toLocaleString()}</span>
                        <span className={s.price_type === 'contract' ? 'chip-cont' : 'chip-spot'}>
                          {s.price_type === 'contract' ? t('contract') : t('spot')}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className="ago">{s.updated}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      <button
                        type="button"
                        className="act-btn"
                        title={t('view')}
                        onClick={() => navigate(`/shipments/${s.id}`)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="act-btn"
                        title={t('clone')}
                        onClick={() => onClone(s.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button type="button" className="act-btn" title={t('more')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="exp open">
                    <td colSpan={11}>
                      {isPending ? (
                        <RowExpansionPending
                          shipment={s}
                          onAward={(carrier, price) => onAward(s, carrier, price)}
                          onInvite={onInvite}
                          onView={() => navigate(`/shipments/${s.id}`)}
                          t={t}
                        />
                      ) : (
                        <RowExpansionStatus
                          shipment={s}
                          onView={() => navigate(`/shipments/${s.id}`)}
                          t={t}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
};
