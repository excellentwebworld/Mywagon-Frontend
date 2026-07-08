import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Shipment } from '../../context/AppContext';
import { statusBadgeClass } from '../../pages/ManageShipments/utils/listingUtils';
import { RowExpansionPending } from './RowExpansionPending';
import { RowExpansionStatus } from './RowExpansionStatus';

interface ShipmentTableProps {
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

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
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
          <th className="acts" />
        </tr>
      </thead>
      <tbody>
        {shipments.length === 0 ? (
          <tr>
            <td colSpan={11} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--text-tertiary)' }}>
              {t('noShipmentsFound')}
            </td>
          </tr>
        ) : (
          shipments.map((s) => {
            const isExpanded = expandedId === s.id;
            const isPending = s.status === 'pending';
            const badgeClass = statusBadgeClass(s.status, s.at_risk);

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
                      {s.date}
                      {s.customer.length > 0 && ` · ${t('orders')}: ${s.customer.reduce((n, c) => n + (c.orders?.length || 0), 0)}`}
                    </div>
                  </td>
                  <td>
                    <div className="lane">
                      {s.origin} <span className="arr">→</span> {s.dest}
                    </div>
                    {s.via && (
                      <div className="lane-stops">
                        <span className="lane-via">{s.via}</span>
                      </div>
                    )}
                    <div className="sub">🔵 {s.date}</div>
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
                          {t('atRiskLate')}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`vis vis-${s.vis === 'public' ? 'pub' : 'priv'}`}>{t(s.vis)}</span>
                    {s.vis === 'private' && <div className="sub">{t('invited')}: 5</div>}
                  </td>
                  <td>
                    {isPending ? (
                      s.bids > 0 ? (
                        <div className="bids-cell">
                          <span className="bids-ct">
                            {s.bids} {t('bids')}
                          </span>
                          {s.best_bid && (
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
                              <span className="co-badge-tbl co-up">
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
                    ) : isPending ? (
                      <span className="uncov">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        {t('uncoveredLabel')}
                      </span>
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td>
                    {isPending || s.price == null ? (
                      <span className="sub">—</span>
                    ) : (
                      <>
                        <span className="price">€ {s.price}</span>
                        <span className={s.price_type === 'contract' ? 'chip-cont' : 'chip-spot'}>
                          {s.price_type === 'contract' ? 'CONTRACT' : 'SPOT'}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className="ago">{s.updated}</span>
                  </td>
                  <td className="acts" onClick={(e) => e.stopPropagation()}>
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
