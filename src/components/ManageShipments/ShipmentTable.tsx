import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Shipment } from '../../context/AppContext';
import {
  formatEuro,
  laneMidLabel,
  shipmentOrderSublabel,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
import { ListSkeleton } from '../skeletons/ListSkeleton';
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
        {shipments.length === 0 && !loading ? (
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
        ) : shipments.length === 0 && loading ? (
          <ListSkeleton type="table" rowCount={8} columnCount={TABLE_COL_COUNT} />
        ) : (
          shipments.map((row) => {
            const s = resolveShipment ? resolveShipment(row) : row;
            const isExpanded = expandedId === s.id;
            const isPending = s.status === 'pending';
            const badgeClass = statusBadgeClass(s.status);
            const channel = s.channel || (s.vis === 'public' ? 'public' : 'private');
            const received = s.bidsReceived ?? 0;
            const sent = s.bidsSent ?? 0;
            const quoted = formatEuro(s.quotedPrice ?? s.price);
            const agreed = formatEuro(s.agreedPrice);
            const pickLabel = s.pickDt || s.date;
            const delLabel = s.delDt;
            const detailLoading = detailLoadingIds?.has(s.id) ?? false;

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
                    <div className="sub">{shipmentOrderSublabel(s, t)}</div>
                  </td>
                  <td>
                    <div className="lane-stack">
                      <div className="lane-line">
                        <span className="lane-place">{s.origin}</span>
                        {pickLabel && (
                          <span className="lane-when">
                            {' '}
                            {t('laneAt')} {pickLabel}
                          </span>
                        )}
                      </div>
                      <div className="lane-mid">{laneMidLabel(s, t)}</div>
                      <div className="lane-line">
                        <span className="lane-place">{s.dest}</span>
                        {delLabel && (
                          <span className="lane-when">
                            {' '}
                            {t('laneAt')} {delLabel}
                          </span>
                        )}
                      </div>
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
                      {channel === 'public' ? t('publicChannel') : t('privateChannel')}
                    </span>
                  </td>
                  <td>
                    {received > 0 || sent > 0 ? (
                      <div className="bids-cell">
                        {received > 0 && (
                          <div className="bids-ct">{t('bidsReceivedCount', { count: received })}</div>
                        )}
                        {sent > 0 && (
                          <div className="bids-sent">{t('bidsSentCount', { count: sent })}</div>
                        )}
                      </div>
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
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td>
                    {quoted ? <span className="price">{quoted}</span> : <span className="sub">—</span>}
                  </td>
                  <td>
                    {agreed ? <span className="price agreed-price">{agreed}</span> : <span className="sub">—</span>}
                  </td>
                  <td className="col-last-update">
                    <span className="ago">{s.updated}</span>
                  </td>
                  <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      <RowActionsMenu
                        shipment={s}
                        onView={() => navigate(`/shipments/${s.id}`)}
                        onEdit={() => navigate(`/shipments/create?id=${s.id}`)}
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
                      {isPending ? (
                        <RowExpansionPending
                          shipment={s}
                          detailLoading={detailLoading}
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
                          detailLoading={detailLoading}
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
