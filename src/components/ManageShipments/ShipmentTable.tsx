import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Shipment } from '../../context/AppContext';
import { isAiCreatedDraft } from '../../pages/ManageShipments/aiDrafts';

/** Shared empty set, so a missing prop does not allocate one per render. */
const EMPTY_AI_IDS: Set<string> = new Set();
import type { StatusTabKey } from '../../pages/ManageShipments/utils/listingUtils';
import {
  formatEuro,
  laneMidLabel,
  shipmentIdSublabel,
} from '../../pages/ManageShipments/utils/listingUtils';
import { formatScheduleWindow } from '../../utils/dateDisplay';
import { formatUtcToDisplayDateTime } from '../../utils/timezone';
import { ListSkeleton } from '../skeletons/ListSkeleton';
import { RowExpansionSkeleton } from '../skeletons/ManageShipmentsSkeleton';
import { RowActionsMenu } from './RowActionsMenu';
import { RowExpansionPending } from './RowExpansionPending';
import { RowExpansionStatus } from './RowExpansionStatus';
import { CarrierAvatar } from './CarrierAvatar';
import { TransporterNameLink } from '../TransporterProfile/TransporterProfileContext';
import { LoadStatus } from '../ui/mv';

const BASE_COL_COUNT = 12;

interface ShipmentTableProps {
  loading?: boolean;
  shipments: Shipment[];
  /**
   * MS3-338 — ids the chat gateway says Vagon AI created.
   *
   * Passed in rather than read off the row: the core API has no created_by
   * column, so the shipment itself carries no clue about who made it.
   */
  aiDraftIds?: Set<string>;
  activeTab?: StatusTabKey;
  selectedIds: Set<string>;
  expandedId: string | null;
  detailLoadingIds?: Set<string>;
  detailRefreshingIds?: Set<string>;
  isDetailCached?: (id: string) => boolean;
  resolveShipment?: (s: Shipment) => Shipment;
  emptyReason?: 'default' | 'filters' | 'unsupported';
  onClearFilters?: () => void;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onRefreshDetail?: (id: string) => void;
  onCopyId: (id: string) => void;
  onDelete: (s: Shipment) => void;
  onEdit: (s: Shipment) => void;
  onViewNewTab: (s: Shipment) => void;
  onMessage: (s: Shipment, offerId?: string) => void;
  onAcceptOffer: (s: Shipment, offerId: string) => void;
  onRejectOffer: (s: Shipment, offerId: string) => void;
  onCounterOffer: (s: Shipment, offerId: string, amount: number, notes?: string) => void;
  onRemindInvitee: (s: Shipment, inviteeId: number) => void;
  onRemoveInvitee: (s: Shipment, inviteeId: number) => void;
  onInviteMore: (s: Shipment) => void;
  onEditBlocked?: () => void;
  t: (
    key: string,
    fallbackOrOptions?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => string;
}

function LaneCell({
  shipment: s,
  t,
}: {
  shipment: Shipment;
  t: (
    key: string,
    fallbackOrOptions?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => string;
}) {
  const pickLabel = formatScheduleWindow(s.pickDt, s.pickDtTo);
  const delLabel = formatScheduleWindow(s.delDt, s.delDtTo);
  const at = t('laneAt');
  const origin = (s.origin || '').trim();
  const dest = (s.dest || '').trim();

  const renderLaneLine = (place: string, when?: string | null) => {
    if (!place && !when) {
      return <div className="lane-line">—</div>;
    }
    return (
      <div className="lane-line">
        {place ? <span className="lane-place">{place}</span> : null}
        {place && when ? <span className="lane-at"> {at} </span> : null}
        {when ? <span className="lane-when">{when}</span> : null}
      </div>
    );
  };

  return (
    <div className="lane-cell lane-stack">
      {renderLaneLine(origin, pickLabel)}
      <div className="lane-mid">{laneMidLabel(s, t)}</div>
      {renderLaneLine(dest, delLabel)}
    </div>
  );
}

function BidsCell({
  shipment: s,
  t,
}: {
  shipment: Shipment;
  t: (
    key: string,
    fallbackOrOptions?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => string;
}) {
  if (s.status === 'draft') {
    return <span className="sub">—</span>;
  }

  if (s.status !== 'pending') {
    return <span className="sub">—</span>;
  }

  const received = s.bidsReceived ?? s.bids ?? s.offers?.length ?? 0;
  const sent = s.bidsSent ?? 0;

  if (received <= 0 && sent <= 0) {
    return <span className="sub">{t('noBids')}</span>;
  }

  return (
    <div className="bids-cell">
      {received > 0 && <div className="bids-ct">{t('bidsReceivedCount', { count: received })}</div>}
      {sent > 0 && <div className="bids-sent">{t('bidsSentCount', { count: sent })}</div>}
    </div>
  );
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  loading = false,
  shipments,
  aiDraftIds,
  activeTab = 'active',
  selectedIds,
  expandedId,
  detailLoadingIds,
  detailRefreshingIds,
  isDetailCached,
  resolveShipment,
  emptyReason = 'default',
  onClearFilters,
  onSelectAll,
  onSelectRow,
  onToggleExpand,
  onRefreshDetail,
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
  // Bids / interest only matter while loads are still open for bidding.
  const showBidsCol = activeTab === 'active' || activeTab === 'pending';
  const colCount = BASE_COL_COUNT + (showBidsCol ? 1 : 0);

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
          {showBidsCol ? <th>{t('bidsCol')}</th> : null}
          <th>{t('transporterCol')}</th>
          <th>{t('quotedPriceCol')}</th>
          <th>{t('agreedPriceCol')}</th>
          <th className="col-last-update">{t('lastUpdateCol')}</th>
          <th className="col-date-created">{t('dateCreatedCol')}</th>
          <th className="col-actions">{t('actionsCol')}</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <ListSkeleton type="table" rowCount={8} columnCount={colCount} />
        ) : shipments.length === 0 ? (
          <tr>
            <td colSpan={colCount}>
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
            // Summary cells always use the list-row snapshot so expand never rewrites visible cells.
            // Merged detail is only for the expansion panel (offers, stops, itinerary, etc.).
            const detail = resolveShipment ? resolveShipment(row) : row;
            const isExpanded = expandedId === row.id;
            const isPending = detail.status === 'pending';
            const channel = row.channel || (row.vis === 'public' ? 'public' : 'private');
            const quoted = formatEuro(row.quotedPrice ?? row.price);
            const agreed = formatEuro(row.agreedPrice);
            const detailLoading = detailLoadingIds?.has(row.id) ?? false;
            const detailRefreshing = detailRefreshingIds?.has(row.id) ?? false;
            const hasCachedDetail = isDetailCached?.(row.id) ?? false;
            // Skeleton only on cold open; cached open keeps content and refreshes in background.
            const showSkeleton = detailLoading && !hasCachedDetail;
            const detailBusy = detailLoading || detailRefreshing;
            const priceType = row.price_type === 'contract' ? 'contract' : 'spot';

            return (
              <React.Fragment key={row.id}>
                <tr className={isExpanded ? 'expanded' : ''} onClick={() => onToggleExpand(row.id)}>
                  <td className="chk" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={(e) => onSelectRow(row.id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="sid">
              {isAiCreatedDraft(row, aiDraftIds ?? EMPTY_AI_IDS) ? (
                <span
                  className="badge badge-info"
                  style={{ marginRight: 6, fontSize: 10, verticalAlign: 'middle' }}
                  title={t('aiCreatedDraftHint')}
                  data-ai-draft="1"
                >
                  AI
                </span>
              ) : null}
                      <span>{row.autoId || row.id}</span>
                      <span
                        className="sid-copy"
                        title={t('copy')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyId(row.autoId || row.id);
                        }}
                      >
                        📋
                      </span>
                    </div>
                    <div className="sub">{shipmentIdSublabel(row, t)}</div>
                  </td>
                  <td>
                    <LaneCell shipment={row} t={t} />
                  </td>
                  <td>
                    {row.customer.length ? (
                      <div className="cust-pills">
                        {row.customer.slice(0, 2).map((c, idx) => (
                          <span key={idx} className="cust-pill">
                            <span className="ci">🏪</span>
                            {c.name}
                          </span>
                        ))}
                        {row.customer.length > 2 && (
                          <span className="cust-overflow">+{row.customer.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="sub">—</span>
                    )}
                  </td>
                  <td className="col-status">
                    <div className="status-cell">
                      <span className={`status-box-wrap${row.at_risk ? ' is-at-risk' : ''}`}>
                        <LoadStatus
                          status={row.status}
                          bids={
                            row.status === 'pending' && (row.bidsReceived || row.bidsSent)
                              ? Number(row.bidsReceived || row.bidsSent)
                              : undefined
                          }
                          label={t(row.status)}
                        />
                        {row.at_risk ? (
                          <span
                            className="status-at-risk-warn"
                            aria-label={t('atRiskLate')}
                            title={t('atRiskLate')}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M12 3L22 21H2L12 3z" />
                            </svg>
                          </span>
                        ) : null}
                      </span>
                      {row.paymentStatus === 'paid' ? (
                        <span className="badge badge-success payment-subtag">
                          {t('paymentPaid')}
                        </span>
                      ) : null}
                      {row.paymentStatus === 'payment_pending' ? (
                        <span className="badge badge-warning payment-subtag">
                          {t('paymentPending')}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="col-vis">
                    <span className={`vis vis-${channel === 'public' ? 'pub' : 'priv'}`}>
                      {channel === 'public' ? t('public') : t('private')}
                    </span>
                    {channel === 'private' && row.status === 'pending' && (
                      <div className="sub">
                        {t('invited')}: {row.invited ?? 0}
                      </div>
                    )}
                  </td>
                  {showBidsCol ? (
                    <td>
                      <BidsCell shipment={row} t={t} />
                    </td>
                  ) : null}
                  <td>
                    {row.carrier ? (
                      <div className="carrier-cell">
                        <CarrierAvatar
                          name={row.carrier}
                          initials={row.carrier_init}
                          avatar={row.carrierAvatar}
                        />
                        <TransporterNameLink
                          id={row.carrierId}
                          type={row.carrierType}
                          name={row.carrier}
                        />
                      </div>
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
                        {row.carrier && (
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
                    <span className="ago">
                      {formatUtcToDisplayDateTime(row.updatedAt || row.updated || '') || '—'}
                    </span>
                  </td>
                  <td className="col-date-created">
                    <span className="ago">
                      {formatUtcToDisplayDateTime(row.createdAt || '') || '—'}
                    </span>
                  </td>
                  <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      <RowActionsMenu
                        shipment={row}
                        onView={() => navigate(`/shipments/${row.id}`)}
                        onEdit={() => onEdit(row)}
                        onDelete={() => onDelete(row)}
                        onEditBlocked={onEditBlocked}
                        t={t}
                      />
                    </div>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="exp open">
                    <td colSpan={colCount}>
                      {showSkeleton ? (
                        <RowExpansionSkeleton variant={isPending ? 'pending' : 'status'} />
                      ) : isPending ? (
                        <RowExpansionPending
                          shipment={detail}
                          detailLoading={detailBusy}
                          onRefresh={
                            onRefreshDetail ? () => onRefreshDetail(row.id) : undefined
                          }
                          onEdit={() => onEdit(detail)}
                          onViewNewTab={() => onViewNewTab(detail)}
                          onCancel={() => onDelete(detail)}
                          onMessage={(offerId) => onMessage(detail, offerId)}
                          onAcceptOffer={(offerId) => onAcceptOffer(detail, offerId)}
                          onRejectOffer={(offerId) => onRejectOffer(detail, offerId)}
                          onCounterOffer={(offerId, amount, notes) =>
                            onCounterOffer(detail, offerId, amount, notes)
                          }
                          onRemindInvitee={(inviteeId) => onRemindInvitee(detail, inviteeId)}
                          onRemoveInvitee={(inviteeId) => onRemoveInvitee(detail, inviteeId)}
                          onInviteMore={() => onInviteMore(detail)}
                          t={t}
                        />
                      ) : (
                        <RowExpansionStatus
                          shipment={detail}
                          detailLoading={detailBusy}
                          onRefresh={
                            onRefreshDetail ? () => onRefreshDetail(row.id) : undefined
                          }
                          onEdit={() => onEdit(detail)}
                          onViewNewTab={() => onViewNewTab(detail)}
                          onCancel={() => onDelete(detail)}
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
