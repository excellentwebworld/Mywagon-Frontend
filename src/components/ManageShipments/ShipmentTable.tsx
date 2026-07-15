import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  shipmentIdSublabel,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ListSkeleton } from '../skeletons/ListSkeleton';
import { RowExpansionSkeleton } from '../skeletons/ManageShipmentsSkeleton';
import { RowActionsMenu } from './RowActionsMenu';
import { RowExpansionPending } from './RowExpansionPending';
import { RowExpansionStatus } from './RowExpansionStatus';

const TABLE_COL_COUNT = 12;

interface ShipmentTableProps {
  loading?: boolean;
  shipments: Shipment[];
  selectedIds: Set<string>;
  expandedId: string | null;
  detailLoadingIds?: Set<string>;
  resolveShipment?: (s: Shipment) => Shipment;
  emptyReason?: 'default' | 'filters' | 'unsupported';
  onClearFilters?: () => void;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onCopyId: (id: string) => void;
  onDelete: (s: Shipment) => void;
  onEdit: (s: Shipment) => void;
  onViewNewTab: (s: Shipment) => void;
  onMessage: (s: Shipment, offerId?: string) => void;
  onAcceptOffer: (s: Shipment, offerId: string) => void;
  onRejectOffer: (s: Shipment, offerId: string) => void;
  onCounterOffer: (s: Shipment, offerId: string, amount: number) => void;
  onRemindInvitee: (s: Shipment, inviteeId: number) => void;
  onRemoveInvitee: (s: Shipment, inviteeId: number) => void;
  onInviteMore: (s: Shipment) => void;
  onEditBlocked?: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function LaneCell({
  shipment: s,
  t,
}: {
  shipment: Shipment;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const via = s.viaStops?.filter(Boolean) ?? [];
  const stopCount = s.stopCount ?? (via.length > 0 ? via.length + 2 : 2);
  const pickLabel = s.pickDt || s.date;
  const delLabel = s.delDt;

  return (
    <div className="lane-cell">
      <div className="lane">
        {s.origin} <span className="arr">→</span> {s.dest}
      </div>
      {via.length > 0 && (
        <div className="lane-stops">
          {via.map((v, i) => (
            <React.Fragment key={`${v}-${i}`}>
              {i > 0 && <span className="arr">→</span>}
              <span className="lane-via">{v}</span>
            </React.Fragment>
          ))}
          <span className="badge badge-gray lane-stop-badge">
            {stopCount} {t('stops').toLowerCase()}
          </span>
        </div>
      )}
      <div className="sub lane-dates">
        {pickLabel && (
          <>
            <span className="lane-dot lane-dot-pick" aria-hidden />
            {pickLabel}
          </>
        )}
        {pickLabel && delLabel && <span className="lane-date-sep"> · </span>}
        {delLabel && (
          <>
            <span className="lane-dot lane-dot-del" aria-hidden />
            {delLabel}
          </>
        )}
      </div>
    </div>
  );
}

function BidsCell({
  shipment: s,
  t,
}: {
  shipment: Shipment;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const isPending = s.status === 'pending';
  if (!isPending) {
    return <span className="sub">—</span>;
  }

  const offerCount = s.offers?.length ?? s.bidsReceived ?? s.bids ?? 0;
  const offerPrices =
    s.offers
      ?.map((o) => o.price)
      .filter((p): p is number => p != null && Number.isFinite(p)) ?? [];
  const bestFromOffers = offerPrices.length ? Math.min(...offerPrices) : null;
  const best = bestFromOffers ?? s.best_bid ?? null;
  const counterOffer = s.offers?.find((o) => o.counter)?.counter;
  const received = s.bidsReceived ?? 0;
  const sent = s.bidsSent ?? 0;

  if (offerCount <= 0 && received <= 0 && sent <= 0) {
    return <span className="sub">{t('noBids')}</span>;
  }

  const bidCount = offerCount > 0 ? offerCount : received;
  const bidWord = bidCount === 1 ? t('bid') : t('bids');

  return (
    <div className="bids-cell">
      {bidCount > 0 ? (
        <div>
          <span className="bids-ct">
            {bidCount} {bidWord}
          </span>
          {best != null && (
            <>
              {' '}
              · <span className="bids-best">{t('best')} {formatEuro(best)}</span>
            </>
          )}
        </div>
      ) : null}
      {sent > 0 && <div className="bids-sent">{t('bidsSentCount', { count: sent })}</div>}
      {s.bid_exp && (
        <div className="bids-exp">
          ⏱ {t('expires')} {s.bid_exp}
        </div>
      )}
      {counterOffer && (
        <span className={`co-badge-tbl ${counterOffer.dir === 'up' ? 'co-up' : 'co-down'}`}>
          ↩ {counterOffer.pct > 0 ? '+' : ''}
          {Math.round(counterOffer.pct)}% ({formatEuro(counterOffer.theirs)})
        </span>
      )}
    </div>
  );
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  loading = false,
  shipments,
  selectedIds,
  expandedId,
  detailLoadingIds,
  resolveShipment,
  emptyReason = 'default',
  onClearFilters,
  onSelectAll,
  onSelectRow,
  onToggleExpand,
  onCopyId,
  onDelete,
  onEdit,
  onViewNewTab,
  onMessage,
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
  onRemindInvitee,
  onRemoveInvitee,
  onInviteMore,
  onEditBlocked,
  t,
}) => {
  const navigate = useNavigate();
  const allSelected = shipments.length > 0 && selectedIds.size === shipments.length;

  const emptyMessage =
    emptyReason === 'unsupported'
      ? t('statusTabUnsupported')
      : emptyReason === 'filters'
        ? t('noShipmentsWithFilters')
        : t('noShipmentsFound');

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
          <th>{t('channelCol')}</th>
          <th>{t('bidsCol')}</th>
          <th>{t('transporterCol')}</th>
          <th>{t('quotedPriceCol')}</th>
          <th>{t('agreedPriceCol')}</th>
          <th className="col-last-update">{t('lastUpdateCol')}</th>
          <th className="col-actions">{t('actionsCol')}</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <ListSkeleton type="table" rowCount={8} columnCount={TABLE_COL_COUNT} />
        ) : shipments.length === 0 ? (
          <tr>
            <td colSpan={TABLE_COL_COUNT}>
              <div className="tbl-empty">
                <p className="tbl-empty-msg">{emptyMessage}</p>
                {emptyReason === 'filters' && onClearFilters ? (
                  <button type="button" className="tbl-empty-cta" onClick={onClearFilters}>
                    {t('clearAllFilters')}
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ) : (
          shipments.map((row) => {
            const s = resolveShipment ? resolveShipment(row) : row;
            const isExpanded = expandedId === s.id;
            const isPending = s.status === 'pending';
            const badgeClass = statusBadgeClass(s.status);
            const channel = s.channel || (s.vis === 'public' ? 'public' : 'private');
            const quoted = formatEuro(s.quotedPrice ?? s.price);
            const agreed = formatEuro(s.agreedPrice);
            const detailLoading = detailLoadingIds?.has(s.id) ?? false;
            const priceType = s.price_type === 'contract' ? 'contract' : 'spot';

            return (
              <React.Fragment key={s.id}>
                <tr className={isExpanded ? 'expanded' : ''} onClick={() => onToggleExpand(s.id)}>
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
                    <div className="sub">{shipmentIdSublabel(s, t)}</div>
                  </td>
                  <td>
                    <LaneCell shipment={s} t={t} />
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
                    {s.paymentStatus === 'paid' && (
                      <>
                        <br />
                        <span className="badge badge-success payment-subtag">
                          <span className="bdot" />
                          {t('paymentPaid')}
                        </span>
                      </>
                    )}
                    {s.paymentStatus === 'payment_pending' && (
                      <>
                        <br />
                        <span className="badge badge-warning payment-subtag">
                          <span className="bdot" />
                          {t('paymentPending')}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`vis vis-${channel === 'public' ? 'pub' : 'priv'}`}>
                      {channel === 'public' ? t('public') : t('private')}
                    </span>
                    {channel === 'private' && (
                      <div className="sub">
                        {t('invited')}: {s.invited ?? 0}
                      </div>
                    )}
                  </td>
                  <td>
                    <BidsCell shipment={s} t={t} />
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
                        </svg>
                        {t('uncovered')}
                      </span>
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td>
                    {quoted ? (
                      <>
                        <span className="price">{quoted}</span>
                        <span className={priceType === 'spot' ? 'chip-spot' : 'chip-cont'}>
                          {t(priceType)}
                        </span>
                      </>
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td>
                    {agreed ? (
                      <>
                        <span className="price agreed-price">{agreed}</span>
                        {s.carrier && (
                          <span className={priceType === 'spot' ? 'chip-spot' : 'chip-cont'}>
                            {t(priceType)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td className="col-last-update">
                    <span className="ago">{s.updated}</span>
                  </td>
                  <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      <button
                        type="button"
                        className="act-btn"
                        title={t('rowActionView')}
                        onClick={() => onViewNewTab(s)}
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
                        disabled
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <RowActionsMenu
                        shipment={s}
                        onView={() => navigate(`/shipments/${s.id}`)}
                        onEdit={() => onEdit(s)}
                        onDelete={() => onDelete(s)}
                        onEditBlocked={onEditBlocked}
                        t={t}
                      />
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="exp open">
                    <td colSpan={TABLE_COL_COUNT}>
                      {detailLoading ? (
                        <RowExpansionSkeleton variant={isPending ? 'pending' : 'status'} />
                      ) : isPending ? (
                        <RowExpansionPending
                          shipment={s}
                          detailLoading={false}
                          onEdit={() => onEdit(s)}
                          onViewNewTab={() => onViewNewTab(s)}
                          onCancel={() => onDelete(s)}
                          onMessage={(offerId) => onMessage(s, offerId)}
                          onAcceptOffer={(offerId) => onAcceptOffer(s, offerId)}
                          onRejectOffer={(offerId) => onRejectOffer(s, offerId)}
                          onCounterOffer={(offerId, amount) => onCounterOffer(s, offerId, amount)}
                          onRemindInvitee={(inviteeId) => onRemindInvitee(s, inviteeId)}
                          onRemoveInvitee={(inviteeId) => onRemoveInvitee(s, inviteeId)}
                          onInviteMore={() => onInviteMore(s)}
                          t={t}
                        />
                      ) : (
                        <RowExpansionStatus
                          shipment={s}
                          detailLoading={false}
                          onEdit={() => onEdit(s)}
                          onViewNewTab={() => onViewNewTab(s)}
                          onCancel={() => onDelete(s)}
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
