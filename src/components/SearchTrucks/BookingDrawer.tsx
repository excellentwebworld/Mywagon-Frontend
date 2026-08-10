import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AvailableTruck,
  BookingDraft,
  FitValue,
  MatchScore,
  PendingMatchDetail,
  PendingMatchSnapshot,
  PendingMatchStop,
  PendingShipment,
} from '../../pages/SearchTrucks/types';
import { currencySymbol, formatMoney } from '../../pages/SearchTrucks/utils/money';
import type { ShipmentStop } from '../../context/AppContext';
import { ItineraryPreview } from '../ManageShipments/ItineraryPreview';
import { Pagination } from '../ManageShipments/Pagination';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';
import { utcToLocalParts, formatUtcToDisplayDateTime } from '../../utils/timezone';
import '../../styles/manage.css';

const PENDING_PAGE_SIZE = 10;

function pendingKey(p: PendingShipment): string {
  return String(p.id ?? p.sid);
}

function splitLane(lane: string): { origin: string; dest: string } {
  const parts = lane.split(/\s*→\s*|\s*->\s*/);
  if (parts.length >= 2) {
    return { origin: parts[0].trim() || '—', dest: parts.slice(1).join(' → ').trim() || '—' };
  }
  return { origin: lane || '—', dest: '—' };
}

function fitLabel(value: FitValue | undefined, t: (key: string) => string): string {
  if (value === 'yes') return t('satFitYes') || 'YES';
  if (value === 'partial') return t('satFitPartial') || 'PARTIAL';
  return t('satFitNo') || 'NO';
}

function fitIcon(value: FitValue | undefined): string {
  if (value === 'yes') return '✅';
  if (value === 'partial') return '◐';
  return '❌';
}

function fitColor(value: FitValue | undefined): string {
  if (value === 'yes') return 'var(--success)';
  if (value === 'partial') return 'var(--warning, #B45309)';
  return 'var(--danger, #DC2626)';
}

function schedulePartsFromStop(stop: PendingMatchStop): { date: string; timeStart: string; timeEnd: string } {
  const iso = stop.fromDateIso;
  if (iso) {
    const parts = utcToLocalParts(iso);
    if (parts) {
      const endIso = stop.toDateIso;
      const endParts = endIso ? utcToLocalParts(endIso) : null;
      return {
        date: parts.date || stop.date || '',
        timeStart: parts.time || stop.timeStart || '',
        timeEnd: endParts?.time || stop.timeEnd || parts.time || '',
      };
    }
  }
  if (stop.date || stop.timeStart) {
    return {
      date: stop.date || '',
      timeStart: stop.timeStart || '',
      timeEnd: stop.timeEnd || stop.timeStart || '',
    };
  }
  // Fallback: parse display "dd/mm/yyyy HH:mm"
  const raw = (stop.fromDate || '').trim();
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, hh, mm] = m;
    return {
      date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`,
      timeStart: hh != null && mm != null ? `${hh.padStart(2, '0')}:${mm}` : '',
      timeEnd: stop.timeEnd || '',
    };
  }
  return { date: '', timeStart: '', timeEnd: '' };
}

function formatProductLabel(name?: string | null, type?: string | null): string {
  const productName = (name || '').trim();
  const productType = (type || '').trim();
  if (productName && productType && productName.toLowerCase() !== productType.toLowerCase()) {
    return `${productType} · ${productName}`;
  }
  return productName || productType || '—';
}

/** Map bid-wizard snapshot stops into Manage Shipments `ShipmentStop` shape for ItineraryPreview. */
function snapshotStopsToShipmentStops(stops: PendingMatchStop[]): ShipmentStop[] {
  return stops.map((stop, index) => {
    const typeRaw = String(stop.type || '').toLowerCase();
    const type: 'pickup' | 'delivery' = typeRaw.includes('pick') ? 'pickup' : 'delivery';
    const when = schedulePartsFromStop(stop);
    const company = (stop.companyName || '').trim();
    const productRows =
      stop.products?.length > 0
        ? stop.products
        : stop.productName || stop.qty != null || stop.weight != null
          ? [
              {
                name: stop.productName ?? null,
                type: stop.productType ?? null,
                qty: stop.qty,
                qtyUnit: stop.qtyUnit ?? null,
                weight: stop.weight,
                weightUnit: stop.weightUnit ?? null,
              },
            ]
          : [];

    return {
      id: stop.id ?? index + 1,
      type,
      location: stop.locationName || stop.address || company || '—',
      address: stop.address || '',
      date: when.date,
      timeStart: when.timeStart,
      timeEnd: when.timeEnd,
      locationStatus: '0',
      pod: '0',
      customers:
        company || stop.orderId || productRows.length
          ? [
              {
                name: company || '—',
                orders:
                  productRows.length > 0
                    ? productRows.map((p) => ({
                        id: String(stop.orderId ?? ''),
                        products: formatProductLabel(p.name, p.type ?? stop.productType),
                        qty: p.qty ?? 0,
                        qtyUnit: p.qtyUnit || '',
                        weight: p.weight ?? 0,
                        weightUnit: p.weightUnit || '',
                      }))
                    : [
                        {
                          id: String(stop.orderId ?? ''),
                          products: formatProductLabel(stop.productName, stop.productType),
                          qty: stop.qty ?? 0,
                          qtyUnit: stop.qtyUnit || '',
                          weight: stop.weight ?? 0,
                          weightUnit: stop.weightUnit || '',
                        },
                      ],
              },
            ]
          : [],
    };
  });
}

function formatLaneLine(
  place: string,
  when: string | null | undefined,
  atLabel: string
): string {
  const p = (place || '').trim();
  const w = (when || '').trim();
  if (p && w) return `${p} ${atLabel} ${w}`;
  if (p) return p;
  if (w) return w;
  return '—';
}

function sidSublabel(p: PendingShipment, t: (key: string) => string): string {
  const ids = p.orderIds?.filter(Boolean) ?? [];
  const count = p.ordersCount ?? ids.length;
  if (count === 1) return ids[0] || '';
  if (count > 1) return `${count} ${(t('orders') || 'orders').toLowerCase()}`;
  return '';
}

function laneMidLabel(p: PendingShipment, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const intermediate =
    p.intermediateStops ?? Math.max((p.stops ?? 2) - 2, 0);
  if (intermediate <= 0) return t('directTrip') || 'Direct trip';
  return (
    t('intermediateStopsCount', { count: intermediate }) ||
    `${intermediate} intermediate stops`
  );
}

function VehiclesCell({
  truckTypes,
  cargoCategories,
  t,
}: {
  truckTypes?: string[];
  cargoCategories?: string[];
  t: (key: string) => string;
}) {
  const types = truckTypes ?? [];
  const specs = cargoCategories ?? [];
  if (types.length === 0 && specs.length === 0) {
    return <span className="sub">—</span>;
  }
  return (
    <div className="sat-bid-vehicles-cell">
      {types.length > 0 ? (
        <div className="sat-bid-chip-row">
          {types.slice(0, 2).map((v) => (
            <span key={v} className="sat-bid-chip">
              {v}
            </span>
          ))}
        </div>
      ) : null}
      {specs.length > 0 ? (
        <div className="sat-bid-cargo-specs" title={t('cargoSpecs') || 'Cargo specs'}>
          {specs.slice(0, 3).map((spec) => (
            <span key={spec} className="sat-bid-cargo-spec">
              {spec}
            </span>
          ))}
          {specs.length > 3 ? <span className="sat-bid-cargo-spec-more">+{specs.length - 3}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function PendingTableSkeleton({
  rows = 6,
  t,
}: {
  rows?: number;
  t: (key: string) => string;
}) {
  return (
    <div className="sat-bid-table-skel" role="status" aria-busy="true" aria-label={t('satLoadingPending') || 'Loading'}>
      <table className="sat-bid-table sat-bid-table--skel">
        <thead>
          <tr>
            <th>{t('shipmentIdCol') || 'Shipment ID'}</th>
            <th>{t('laneCol') || 'Lane'}</th>
            <th>{t('customerCol') || 'Customer'}</th>
            <th>{t('quotedPriceCol') || 'Quoted Price'}</th>
            <th>{t('quantity') || 'Quantity'}</th>
            <th>{t('satVehiclesCol') || 'Vehicles'}</th>
            <th className="sat-bid-col-choose">{t('satChooseShipment') || 'Choose'}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} aria-hidden>
              <td>
                <div className="sat-bid-skel-line sat-bid-skel-line--sid" />
                <div className="sat-bid-skel-line sat-bid-skel-line--sub" />
              </td>
              <td>
                <div className="sat-bid-skel-lane">
                  <div className="sat-bid-skel-line sat-bid-skel-line--lane" />
                  <div className="sat-bid-skel-line sat-bid-skel-line--mid" />
                  <div className="sat-bid-skel-line sat-bid-skel-line--lane" />
                </div>
              </td>
              <td>
                <div className="sat-bid-skel-pills">
                  <span className="sat-bid-skel-pill" />
                  <span className="sat-bid-skel-pill sat-bid-skel-pill--sm" />
                </div>
              </td>
              <td>
                <div className="sat-bid-skel-price">
                  <div className="sat-bid-skel-line sat-bid-skel-line--price" />
                  <span className="sat-bid-skel-chip" />
                </div>
              </td>
              <td>
                <div className="sat-bid-skel-line sat-bid-skel-line--sub" />
              </td>
              <td>
                <span className="sat-bid-skel-chip sat-bid-skel-chip--wide" />
              </td>
              <td className="sat-bid-col-choose">
                <span className="sat-bid-skel-btn" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchScoreSkeleton({ t }: { t: (key: string) => string }) {
  return (
    <div className="sat-pend-match sat-pend-match--skel" role="status" aria-busy="true">
      <h4>{t('satMatchScore')}</h4>
      <div className="sat-match-grid" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="sat-match-item sat-match-item--skel">
            <div className="sat-bid-skel-line sat-bid-skel-line--match-label" />
            <div className="sat-bid-skel-line sat-bid-skel-line--match-val" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TruckContextPanel({
  truck,
  t,
}: {
  truck: AvailableTruck;
  t: (key: string) => string;
}) {
  const showPrice = truck.price != null && !truck.priceBlurred;
  const availableFrom = [truck.startDt, truck.startTm].filter(Boolean).join(' ');
  const availableTo = truck.endDt
    ? [truck.endDt, truck.endTm].filter(Boolean).join(' ')
    : '';

  return (
    <aside className="sat-bid-left" aria-label={t('satAvailability') || 'Availability'}>
      <div className="sat-bid-left-card">
        <div className="sat-bid-left-head">
          <p className="sat-bid-left-kicker">{t('satPostedTruck') || 'Posted truck'}</p>
          <h3 className="sat-bid-left-title">{truck.carrier}</h3>
          <p className="sat-bid-left-sub">
            {truck.truckType}
            {truck.specs ? ` · ${truck.specs}` : ''}
          </p>
          <div className="sat-bid-left-meta">
            <span className={`sat-bg ${truck.vis === 'private' ? 'sat-bg-priv' : 'sat-bg-pub-m'}`}>
              {truck.vis === 'private' ? t('private') || 'Private' : t('public') || 'Public'}
            </span>
            {truck.preferred ? <span className="sat-bg sat-bg-ac">{t('satPreferred')}</span> : null}
            {truck.rating > 0 ? (
              <span className="sat-bid-left-rating" title={t('satRating') || 'Rating'}>
                ★ {truck.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="sat-bid-left-route" aria-label={t('satRoute')}>
          <div className="sat-bid-left-stop">
            <div className="sat-bid-left-stop-label">{t('pickup') || 'Pickup'}</div>
            <div className="sat-bid-left-stop-place">
              {truck.pickup}
              <span className="sat-bid-left-stop-meta"> · {truck.radius}km</span>
            </div>
          </div>
          <div className="sat-bid-left-arrow" aria-hidden>
            →
          </div>
          <div className="sat-bid-left-stop">
            <div className="sat-bid-left-stop-label">{t('satDestination') || 'Destination'}</div>
            <div className="sat-bid-left-stop-place">
              {truck.dest}
              {truck.destRadius != null ? (
                <span className="sat-bid-left-stop-meta"> · {truck.destRadius}km</span>
              ) : null}
            </div>
          </div>
        </div>

        <dl className="sat-bid-left-facts">
          <div className="sat-bid-left-fact">
            <dt>{t('satColAvailable') || 'Available'}</dt>
            <dd>
              <span>{availableFrom || '—'}</span>
              {availableTo ? (
                <>
                  <span className="sat-bid-left-fact-arrow" aria-hidden>
                    →
                  </span>
                  <span>{availableTo}</span>
                </>
              ) : null}
            </dd>
          </div>
          <div className="sat-bid-left-fact">
            <dt>{t('satCapacity') || 'Capacity'}</dt>
            <dd>{truck.capacity || '—'}</dd>
          </div>
          <div className="sat-bid-left-fact sat-bid-left-fact--price">
            <dt>{t('satStartingPrice')}</dt>
            <dd>
              {showPrice ? (
                <span className="sat-bid-left-price">{formatMoney(truck.price, truck.currency)}</span>
              ) : truck.priceBlurred ? (
                <span className="sat-muted">{t('satUpgradePlan') || 'Premium'}</span>
              ) : (
                <span className="sat-muted">{t('satNoStartingPrice')}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function MatchScorePanel({
  score,
  canView,
  loading,
  onUpgrade,
  t,
}: {
  score: MatchScore | null;
  canView: boolean;
  loading?: boolean;
  onUpgrade: () => void;
  t: (key: string) => string;
}) {
  const items: Array<{ key: 'capacity' | 'itinerary' | 'timing'; label: string; value?: FitValue; reason?: string }> = [
    {
      key: 'capacity',
      label: t('satCapacityFit'),
      value: score?.capacityFit,
      reason: score?.details?.capacity?.reason,
    },
    {
      key: 'itinerary',
      label: t('satItineraryFit') || t('satTripPreference'),
      value: score?.itineraryFit,
      reason: score?.details?.itinerary?.reason,
    },
    {
      key: 'timing',
      label: t('satTimingFit'),
      value: score?.timingFit,
      reason: score?.details?.timing?.reason,
    },
  ];

  return (
    <div className={`sat-pend-match ${!canView ? 'sat-pend-match--locked' : ''}`}>
      <h4>{t('satMatchScore')}</h4>
      {loading ? (
        <div className="sat-match-loading" role="status">
          {t('satMatchLoading') || 'Calculating match…'}
        </div>
      ) : (
        <div
          className="sat-match-grid"
          onClick={!canView ? onUpgrade : undefined}
          role={!canView ? 'button' : undefined}
          tabIndex={!canView ? 0 : undefined}
          onKeyDown={
            !canView
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onUpgrade();
                  }
                }
              : undefined
          }
          aria-label={!canView ? t('satMatchPremiumHint') : undefined}
        >
          {items.map((item) => (
            <div key={item.key} className="sat-match-item">
              <div className="label">{item.label}</div>
              <div className="val" style={{ color: canView ? fitColor(item.value) : undefined }}>
                {canView && score
                  ? `${fitLabel(item.value, t)} ${fitIcon(item.value)}`
                  : '••••'}
              </div>
              {canView && score && item.reason ? (
                <div className="sat-match-detail">{item.reason}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {!canView && !loading ? (
        <button
          type="button"
          className="sat-match-premium-hint sat-match-premium-hint--btn"
          onClick={onUpgrade}
        >
          {t('satMatchPremiumHint')}
        </button>
      ) : null}
    </div>
  );
}

function MatchScorePremiumDialog({
  open,
  upgradeUrl,
  onClose,
  t,
}: {
  open: boolean;
  upgradeUrl?: string;
  onClose: () => void;
  t: (key: string) => string;
}) {
  if (!open) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className="sat-gate-modal sat-match-premium-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sat-match-premium-title"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="sat-gate-modal__backdrop"
        onMouseDown={handleClose}
        role="presentation"
      />
      <div
        className="sat-gate-modal__panel"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sat-gate-modal__body">
          <h2 id="sat-match-premium-title" className="sat-gate-modal__title">
            {t('satMatchPremiumTitle') || 'Premium Feature'}
          </h2>
          <p className="sat-gate-modal__copy">
            {t('satMatchPremiumHint') ||
              'Premium Feature - upgrade to a higher plan to view'}
          </p>
        </div>
        <div className="sat-gate-modal__actions">
          <button type="button" className="sat-btn" onMouseDown={handleClose}>
            {t('close') || t('satRemindLater') || 'Close'}
          </button>
          {upgradeUrl ? (
            <a
              className="sat-btn sat-btn-pr"
              href={upgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('satUpgradeNow') || 'Upgrade Now'}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoadSnapshotPanel({
  snapshot,
  t,
}: {
  snapshot: PendingMatchSnapshot;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const stops = useMemo(() => snapshotStopsToShipmentStops(snapshot.stops), [snapshot.stops]);
  const lane = splitLane(snapshot.lane);
  const pickDt = snapshot.stops.find((s) => String(s.type || '').toLowerCase().includes('pick'))?.fromDate
    ?? null;
  const delDt = [...snapshot.stops]
    .reverse()
    .find((s) => !String(s.type || '').toLowerCase().includes('pick'))?.fromDate
    ?? null;

  return (
    <div className="sat-bid-snapshot">
      <div className="sat-bid-snap-head">
        <div className="sid">{snapshot.sid}</div>
        <div className="sat-bid-snap-lane">{snapshot.lane}</div>
        {(snapshot.customers ?? []).length > 0 ? (
          <div className="cust-pills" style={{ marginTop: 8 }}>
            {snapshot.customers.slice(0, 3).map((name, idx) => (
              <span key={`${name}-${idx}`} className="cust-pill">
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <section className="sat-bid-snap-section sat-bid-itin">
        {stops.length === 0 ? (
          <>
            <h4>{t('itinerary') || t('satItineraryStops') || 'Itinerary'}</h4>
            <p className="sub">{t('satNoStopDetails') || 'No stop details'}</p>
          </>
        ) : (
          <ItineraryPreview
            stops={stops}
            origin={lane.origin}
            dest={lane.dest}
            pickDt={pickDt}
            delDt={delDt}
            shipmentStatus="pending"
            defaultExpanded
            defaultCargoExpanded
            t={t}
          />
        )}
      </section>

      <div className="sat-bid-snap-grid">
        <section className="sat-bid-snap-section">
          <h4>{t('satVehiclesCol') || 'Vehicles'}</h4>
          <VehiclesCell
            truckTypes={snapshot.truckTypes}
            cargoCategories={snapshot.cargoCategories}
            t={t}
          />
        </section>

        <section className="sat-bid-snap-section">
          <h4>{t('quantity') || 'Quantity'}</h4>
          <div className="sat-bid-qty">
            {snapshot.quantityLabel || '—'}
          </div>
        </section>

        {snapshot.channel === 'private' ? (
          <section className="sat-bid-snap-section">
            <h4>{t('satPartnersCol') || 'Partners'}</h4>
            {snapshot.partners.length === 0 ? (
              <p className="sub">{t('satNoPartners') || 'No partners'}</p>
            ) : (
              <ul className="sat-bid-partner-list">
                {snapshot.partners.map((p) => (
                  <li key={p.id}>{p.name || `Partner #${p.partnerId ?? p.id}`}</li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="sat-bid-snap-section sat-bid-offers">
          <h4>{t('satCurrentOffers') || 'Current offers'}</h4>
          {snapshot.offers.length === 0 ? (
            <p className="sub">{t('satNoOffers') || 'No active offers'}</p>
          ) : (
            <div className="bids-card-list sat-bid-offers-list">
              {snapshot.offers.map((o) => {
                const name = o.name || o.carrierName || t('unknown') || 'Unknown';
                const rating = o.rating ?? 0;
                const ratingCount = o.ratingCount ?? 0;
                const roleLabel =
                  o.role === 'freelancer' ? t('freelancer') || 'Freelancer' : t('company') || 'Company';
                return (
                  <div key={o.id} className="bid-row sat-bid-offer-row">
                    <div className="bid-top">
                      <div className="bid-name">
                        <CarrierAvatar
                          name={name}
                          initials={o.initials}
                          avatar={o.avatar}
                          size={28}
                        />
                        <div className="bid-name-block">
                          <div className="bid-name-line">
                            <span className="bid-carrier-name">{name}</span>
                            {o.isPartner ? (
                              <span className="bids-partner-badge">{t('partner') || 'Partner'}</span>
                            ) : null}
                            <span className="badge badge-gray" style={{ fontSize: 9 }}>
                              {roleLabel}
                            </span>
                            {o.status ? (
                              <span className="badge badge-info" style={{ fontSize: 9 }}>
                                {o.status}
                              </span>
                            ) : null}
                          </div>
                          <div className="bid-subline">
                            <span>
                              {t('vatNumberLabel') || 'VAT'} {o.vat || t('nA') || 'N/A'}
                            </span>
                            <span className="bid-rating">
                              ★ {rating.toFixed(1)}/5 ({ratingCount})
                            </span>
                            {o.respondedAt ? (
                              <span>
                                {t('respondedAgo', {
                                  time: formatUtcToDisplayDateTime(o.respondedAt) || '—',
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {o.price != null ? (
                        <div className="bid-price">
                          {typeof o.price === 'number' ? formatMoney(o.price, 'EUR') : o.price}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="sat-bid-snap-section">
          <h4>{t('quotedPriceCol') || 'Quoted price'}</h4>
          <div className="sat-bid-price-cell">
            <span className="price">
              {snapshot.quotedPrice != null ? formatMoney(snapshot.quotedPrice, 'EUR') : '—'}
            </span>
            {snapshot.quotedPrice != null ? (
              <span className={snapshot.negotiable ? 'chip-cont' : 'chip-spot'}>
                {snapshot.negotiable ? t('contract') || 'CONTRACT' : t('spot') || 'SPOT'}
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

interface BookingDrawerProps {
  open: boolean;
  step: number;
  onStepChange: (step: number) => void;
  truck: AvailableTruck | null;
  pending: PendingShipment[];
  pendingLoading?: boolean;
  pendingFetchingMore?: boolean;
  pendingTotal?: number;
  pendingPage?: number;
  pendingLastPage?: number;
  pendingSearch?: string;
  onPendingSearchChange?: (search: string) => void;
  onPendingPageChange?: (page: number) => void;
  confirming?: boolean;
  selectedPendingIdx: number | null;
  onSelectPending: (idx: number | null) => void;
  onChooseShipment: (idx: number) => void;
  onCancelChoice: () => void;
  matchDetail: PendingMatchDetail | null;
  matchDetailLoading?: boolean;
  canViewMatchScore?: boolean;
  upgradeUrl?: string;
  draft: BookingDraft | null;
  onDraftChange: (patch: Partial<BookingDraft>) => void;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  open,
  step,
  onStepChange,
  truck,
  pending,
  pendingLoading,
  pendingFetchingMore,
  pendingTotal = 0,
  pendingPage = 1,
  pendingLastPage = 1,
  pendingSearch = '',
  onPendingSearchChange,
  onPendingPageChange,
  confirming,
  selectedPendingIdx,
  onSelectPending,
  onChooseShipment,
  onCancelChoice,
  matchDetail,
  matchDetailLoading,
  canViewMatchScore = false,
  upgradeUrl,
  draft,
  onDraftChange,
  onClose,
  onConfirm,
  t,
}) => {
  const [searchInput, setSearchInput] = useState(pendingSearch);
  const [matchPremiumOpen, setMatchPremiumOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchPremiumDismissedUntilRef = useRef(0);

  const selectedPending =
    selectedPendingIdx != null ? pending[selectedPendingIdx] : null;
  const snapshot = matchDetail?.snapshot ?? null;

  const showPrice = Boolean(truck && truck.price != null && !truck.priceBlurred);
  const loadQuoted = snapshot?.quotedPrice ?? selectedPending?.quotedPrice ?? null;
  const offerAmount = Number(String(draft?.offerPrice ?? '').trim());
  const offerValid =
    draft != null &&
    (draft.acceptStartingPrice ||
      draft.useLoadQuotedPrice ||
      (Number.isFinite(offerAmount) && offerAmount > 0));

  const openMatchPremiumDialog = () => {
    // Ignore ghost click / mouseenter right after Close (modal unmounts under cursor).
    if (Date.now() < matchPremiumDismissedUntilRef.current) return;
    setMatchPremiumOpen(true);
  };

  const closeMatchPremiumDialog = () => {
    matchPremiumDismissedUntilRef.current = Date.now() + 400;
    setMatchPremiumOpen(false);
  };

  useEffect(() => {
    if (!open) setMatchPremiumOpen(false);
  }, [open]);

  useEffect(() => {
    if (canViewMatchScore) setMatchPremiumOpen(false);
  }, [canViewMatchScore]);

  useEffect(() => {
    if (!open) return;
    setSearchInput(pendingSearch);
  }, [open, truck?.id, pendingSearch]);

  useEffect(() => {
    if (!open) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (searchInput === pendingSearch) return;
      onPendingSearchChange?.(searchInput);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput, open, onPendingSearchChange, pendingSearch]);

  if (!open || !truck || !draft) return null;

  return (
    <div
      className={`sat-drawer-bg ${open ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="sat-drawer sat-drawer--bid"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sat-drawer-title"
      >
        <div className="sat-drawer-h sat-bid-header">
          <div className="sat-bid-header-title">
            <p className="sat-drawer-kicker">{t('satBook')}</p>
            <h3 id="sat-drawer-title">{t('satBidWizardTitle') || 'Bid with existing shipment'}</h3>
          </div>

          <div className="sat-bid-header-actions">
            <nav className="sat-stepper sat-stepper--header" aria-label={t('satBook')}>
              {(
                [
                  { n: 1, label: t('satStepChoose') },
                  { n: 2, label: t('satStepReviewBid') || t('satStepTerms') },
                ] as const
              ).map((s) => {
                const done = step > s.n;
                const act = step === s.n;
                return (
                  <button
                    key={s.n}
                    type="button"
                    className={`sat-step ${act ? 'act' : ''} ${done ? 'done' : ''}`}
                    disabled={!done && !act}
                    onClick={() => done && onStepChange(s.n)}
                    aria-current={act ? 'step' : undefined}
                  >
                    <span className="sat-step-num">{done ? '✓' : s.n}</span>
                    <span className="sat-step-label">{s.label}</span>
                  </button>
                );
              })}
            </nav>

            <button type="button" className="sat-drawer-close" onClick={onClose} aria-label={t('close')}>
              ✕
            </button>
          </div>
        </div>

        <div className="sat-bid-split">
          <TruckContextPanel truck={truck} t={t} />

          <div className="sat-bid-right">
            <div className={`sat-drawer-body ${step === 1 ? 'sat-drawer-body--pend' : ''}`}>
              {step === 1 && (
                <div className="sat-pend-panel">
                  <div className="sat-pend-toolbar">
                    <div className="sat-pend-toolbar-row">
                      <label className="sat-pend-search">
                        <span className="sat-pend-search-icon" aria-hidden>
                          ⌕
                        </span>
                        <input
                          type="search"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder={t('satPendingSearchPh') || 'Search by ID, route, city…'}
                          aria-label={t('satPendingSearch') || 'Search pending shipments'}
                        />
                      </label>
                      <div className="sat-pend-count" aria-live="polite">
                        {pendingLoading ? '…' : pendingTotal}
                        <span>{t('satPendingCountLabel') || 'shipments'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sat-pend-list-wrap">
                    <div
                      ref={listRef}
                      className="sat-bid-table-wrap"
                      role="listbox"
                      aria-label={t('satStepChoose')}
                      aria-busy={pendingLoading || pendingFetchingMore || undefined}
                    >
                      {pendingLoading ? (
                        <PendingTableSkeleton rows={6} t={t} />
                      ) : pending.length === 0 ? (
                        <div className="sat-empty sat-pend-empty">
                          {pendingTotal === 0 && !pendingSearch
                            ? t('satNoPending') ||
                              'No matching pending shipments for this availability.'
                            : t('satPendingNoFilterResults') ||
                              'No shipments match your search or filters.'}
                        </div>
                      ) : (
                        <>
                          <table className="sat-bid-table">
                            <thead>
                              <tr>
                                <th>{t('shipmentIdCol') || 'Shipment ID'}</th>
                                <th>{t('laneCol') || 'Lane'}</th>
                                <th>{t('customerCol') || 'Customer'}</th>
                                <th>{t('quotedPriceCol') || 'Quoted Price'}</th>
                                <th>{t('quantity') || 'Quantity'}</th>
                                <th>{t('satVehiclesCol') || 'Vehicles'}</th>
                                <th className="sat-bid-col-choose">
                                  {t('satChooseShipment') || 'Choose'}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pending.map((p, idx) => {
                                const selected = selectedPendingIdx === idx;
                                const origin = p.origin || splitLane(p.lane).origin;
                                const dest = p.dest || splitLane(p.lane).dest;
                                const customers = p.customers ?? [];
                                const at = t('laneAt') || 'at';
                                const sub = sidSublabel(p, t);
                                const priceChip = p.negotiable ? 'chip-cont' : 'chip-spot';
                                const priceChipLabel = p.negotiable
                                  ? t('contract') || 'CONTRACT'
                                  : t('spot') || 'SPOT';
                                return (
                                  <tr
                                    key={pendingKey(p)}
                                    className={selected ? 'sel' : ''}
                                    role="option"
                                    aria-selected={selected}
                                  >
                                    <td>
                                      <div className="sid">{p.sid}</div>
                                      {p.exactMatch ? (
                                        <div className="sub">
                                          <span className="sat-bg sat-bg-ok">{t('satExactMatch')}</span>
                                        </div>
                                      ) : sub ? (
                                        <div className="sub">{sub}</div>
                                      ) : null}
                                    </td>
                                    <td>
                                      <div className="lane-cell">
                                        <div className="lane">
                                          {formatLaneLine(origin, p.pickupAt, at)}
                                        </div>
                                        <div className="lane-mid">{laneMidLabel(p, t)}</div>
                                        <div className="lane">
                                          {formatLaneLine(dest, p.deliveryAt, at)}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      {customers.length ? (
                                        <div className="cust-pills">
                                          {customers.slice(0, 2).map((name, cIdx) => (
                                            <span key={`${name}-${cIdx}`} className="cust-pill">
                                              {name}
                                            </span>
                                          ))}
                                          {customers.length > 2 ? (
                                            <span className="cust-overflow">
                                              +{customers.length - 2}
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <span className="sub">—</span>
                                      )}
                                    </td>
                                    <td>
                                      {p.quotedPrice != null ? (
                                        <div className="sat-bid-price-cell">
                                          <span className="price">
                                            {formatMoney(p.quotedPrice, 'EUR')}
                                          </span>
                                          <span className={priceChip}>{priceChipLabel}</span>
                                        </div>
                                      ) : (
                                        <span className="sub">—</span>
                                      )}
                                    </td>
                                    <td>
                                      {p.quantityLabel ? (
                                        <span className="sat-bid-qty">{p.quantityLabel}</span>
                                      ) : (
                                        <span className="sub">—</span>
                                      )}
                                    </td>
                                    <td>
                                      <VehiclesCell
                                        truckTypes={p.truckTypes}
                                        cargoCategories={p.cargoCategories}
                                        t={t}
                                      />
                                    </td>
                                    <td className="sat-bid-col-choose">
                                      <button
                                        type="button"
                                        className={`sat-bid-choose-btn ${selected ? 'is-selected' : ''}`}
                                        onClick={() => onChooseShipment(idx)}
                                        title={
                                          selected
                                            ? t('satDeselectShipment') || 'Click to deselect'
                                            : undefined
                                        }
                                      >
                                        {selected
                                          ? t('satDeselectShipment') || 'Deselect'
                                          : t('satChooseShipment') || 'Choose Shipment'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>

                    {!pendingLoading && pending.length > 0 ? (
                      <div className="sat-bid-pag-wrap">
                        <Pagination
                          page={pendingPage}
                          totalPages={Math.max(pendingLastPage, 1)}
                          total={pendingTotal}
                          perPage={PENDING_PAGE_SIZE}
                          onPageChange={(page) => {
                            if (pendingLoading || pendingFetchingMore) return;
                            onPendingPageChange?.(page);
                          }}
                          t={t}
                        />
                      </div>
                    ) : null}
                  </div>

                  {selectedPending && !pendingLoading ? (
                    matchDetailLoading ? (
                      <MatchScoreSkeleton t={t} />
                    ) : (
                      <MatchScorePanel
                        score={matchDetail?.matchScore ?? null}
                        canView={canViewMatchScore || Boolean(matchDetail?.canViewMatchScore)}
                        loading={false}
                        onUpgrade={openMatchPremiumDialog}
                        t={t}
                      />
                    )
                  ) : null}
                </div>
              )}

              {step === 2 && snapshot ? (
                <div className="sat-bid-step2">
                  <LoadSnapshotPanel snapshot={snapshot} t={t} />

                  <section className="sat-bid-offer-section">
                    <h4>{t('satOfferBid') || 'Offer / Bid'}</h4>
                    <p className="sat-muted sat-bid-offer-hint">
                      {t('satOfferBidHint') ||
                        'This is the only editable section. Send a different price than the load quote or the availability starting price.'}
                    </p>

                    {showPrice ? (
                      <label className="sat-price-opt">
                        <input
                          type="radio"
                          name="priceOpt"
                          checked={draft.acceptStartingPrice}
                          onChange={() =>
                            onDraftChange({
                              acceptStartingPrice: true,
                              useLoadQuotedPrice: false,
                              offerPrice: String(truck.price),
                            })
                          }
                        />
                        {t('satAcceptStarting')} ({formatMoney(truck.price, truck.currency)})
                      </label>
                    ) : null}

                    {loadQuoted != null ? (
                      <label className="sat-price-opt">
                        <input
                          type="radio"
                          name="priceOpt"
                          checked={draft.useLoadQuotedPrice && !draft.acceptStartingPrice}
                          onChange={() =>
                            onDraftChange({
                              acceptStartingPrice: false,
                              useLoadQuotedPrice: true,
                              offerPrice: String(loadQuoted),
                            })
                          }
                        />
                        {t('satUseLoadQuoted') || 'Use load quoted price'} (
                        {formatMoney(loadQuoted, 'EUR')})
                      </label>
                    ) : null}

                    <label className="sat-price-opt">
                      <input
                        type="radio"
                        name="priceOpt"
                        checked={!draft.acceptStartingPrice && !draft.useLoadQuotedPrice}
                        onChange={() =>
                          onDraftChange({
                            acceptStartingPrice: false,
                            useLoadQuotedPrice: false,
                          })
                        }
                      />
                      {t('satSendCustomOffer')}
                    </label>

                    {!draft.acceptStartingPrice && !draft.useLoadQuotedPrice ? (
                      <div className="sat-field">
                        <label htmlFor="sat-offer-price">
                          {t('satYourOffer')}
                          <span className="sat-req" aria-hidden>
                            *
                          </span>
                        </label>
                        <input
                          id="sat-offer-price"
                          type="number"
                          min={0}
                          step="any"
                          required
                          aria-required="true"
                          aria-invalid={!offerValid}
                          value={draft.offerPrice}
                          onChange={(e) =>
                            onDraftChange({
                              offerPrice: e.target.value,
                              acceptStartingPrice: false,
                              useLoadQuotedPrice: false,
                            })
                          }
                          placeholder={
                            showPrice
                              ? String(truck.price)
                              : loadQuoted != null
                                ? String(loadQuoted)
                                : ''
                          }
                        />
                        {!offerValid ? (
                          <p className="sat-field-error" role="alert">
                            {t('satOfferRequired') || 'Your offer is required.'}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="sat-bid-left-price" style={{ marginTop: 8 }}>
                        {draft.offerPrice
                          ? `${currencySymbol(truck.currency)} ${draft.offerPrice}`
                          : '—'}
                      </div>
                    )}

                    <div className="sat-field">
                      <label>{t('satNotesToProvider')}</label>
                      <textarea
                        value={draft.notes}
                        onChange={(e) => onDraftChange({ notes: e.target.value })}
                        placeholder={t('satTermsNotesPlaceholder')}
                      />
                    </div>
                  </section>
                </div>
              ) : null}

              {step === 2 && !snapshot ? (
                <div className="sat-empty">
                  {t('satSelectPendingFirst') || 'Select a pending shipment first.'}
                </div>
              ) : null}
            </div>

            <div className="sat-drawer-ft">
              {step === 1 && !selectedPending ? (
                <button type="button" className="sat-btn" onClick={onClose}>
                  {t('cancel')}
                </button>
              ) : null}
              {step === 1 && selectedPending ? (
                <>
                  <button
                    type="button"
                    className="sat-btn"
                    onClick={() => {
                      onCancelChoice();
                      onSelectPending(null);
                    }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    className="sat-btn sat-btn-pr"
                    disabled={matchDetailLoading || !matchDetail?.snapshot}
                    onClick={() => onStepChange(2)}
                  >
                    {t('satContinue') || t('satNext')} →
                  </button>
                </>
              ) : null}
              {step === 2 ? (
                <>
                  <button type="button" className="sat-btn" onClick={() => onStepChange(1)}>
                    {t('satGoBack') || 'Go back'}
                  </button>
                  <button
                    type="button"
                    className="sat-btn sat-btn-pr"
                    disabled={confirming || !offerValid}
                    onClick={onConfirm}
                  >
                    {confirming ? t('satSending') : t('satSendBid') || 'Send Bid'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <MatchScorePremiumDialog
        open={matchPremiumOpen}
        upgradeUrl={upgradeUrl}
        onClose={closeMatchPremiumDialog}
        t={t}
      />
    </div>
  );
};
