import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { availabilitiesService } from '../../api';
import type { ApiAvailabilityDetail } from '../../api/types/availabilities';

interface AvailabilityContextBarProps {
  availabilityId: number;
  t: (key: string) => string;
}

function formatDateTime(dt: string | null | undefined): string {
  if (!dt) return '—';
  const normalized = dt.replace('T', ' ').trim();
  const [datePart, timePart = ''] = normalized.split(' ');
  const [y, m, d] = (datePart || '').split('-');
  if (!y || !m || !d) return normalized;
  const time = (timePart || '').slice(0, 5);
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`;
}

function formatCoords(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === '' || value === '—') {
    return (
      <div className="wizard-availability-bar__cell">
        <span className="wizard-availability-bar__label">{label}</span>
        <span className="wizard-availability-bar__value wizard-availability-bar__value--muted">—</span>
      </div>
    );
  }
  return (
    <div className="wizard-availability-bar__cell">
      <span className="wizard-availability-bar__label">{label}</span>
      <span className="wizard-availability-bar__value">{value}</span>
    </div>
  );
}

function AvailabilityBarSkeleton() {
  return (
    <div className="wizard-availability-bar__skeleton" aria-hidden>
      <div className="wizard-availability-bar__sk-row">
        <div className="wizard-availability-bar__sk-chip" />
        <div className="wizard-availability-bar__sk-line wizard-availability-bar__sk-line--sm" />
        <div className="wizard-availability-bar__sk-chip wizard-availability-bar__sk-chip--soft" />
      </div>
      <div className="wizard-availability-bar__sk-line wizard-availability-bar__sk-line--lg" />
      <div className="wizard-availability-bar__sk-line wizard-availability-bar__sk-line--md" />
    </div>
  );
}

export const AvailabilityContextBar: React.FC<AvailabilityContextBarProps> = ({
  availabilityId,
  t,
}) => {
  const panelId = useId();
  const [detail, setDetail] = useState<ApiAvailabilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setExpanded(false);

    availabilitiesService
      .get(availabilityId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [availabilityId]);

  const showPrice = detail && detail.price != null && !detail.price_blurred;
  const priceValue = showPrice
    ? `€ ${Number(detail!.price).toLocaleString()}`
    : detail
      ? t('satOfferBased') || 'Offer-based'
      : null;

  const capacity =
    detail?.capacity_qty != null
      ? `${detail.capacity_qty}${detail.capacity_unit ? ` ${detail.capacity_unit}` : ''}`
      : null;

  const pickupCity = detail?.pickup_city?.trim() || '—';
  const dropoffCity =
    detail?.dropoff_city?.trim() || (detail ? t('satAnyDirection') || 'Any direction' : '—');
  const lane = `${pickupCity} → ${dropoffCity}`;

  const pickupPlace =
    detail?.pickup_address?.trim() || detail?.pickup_city?.trim() || null;
  const dropoffPlace =
    detail?.dropoff_address?.trim() ||
    detail?.dropoff_city?.trim() ||
    (detail ? t('satAnyDirection') || 'Any direction' : null);

  const pickupCoords = formatCoords(detail?.pickup_lat, detail?.pickup_lng);
  const dropoffCoords = formatCoords(detail?.dropoff_lat, detail?.dropoff_lng);

  const tripLabel =
    detail?.trip_type === 'multi_stop'
      ? t('satMultiStopOk') || 'Multi-stop OK'
      : detail?.trip_type === 'direct'
        ? t('satDirectOnly') || 'Direct only'
        : null;

  const providerType =
    detail?.provider?.type === 'carrier'
      ? t('satCarrier') || 'Carrier'
      : detail?.provider?.type === 'freelancer'
        ? t('satFreelancer') || 'Freelancer'
        : null;

  const rating =
    detail?.provider?.rating != null
      ? `${detail.provider.rating.toFixed(1)}${providerType ? ` · ${providerType}` : ''}`
      : providerType;

  const categories =
    detail?.cargo_categories?.length && detail.cargo_categories.length > 0
      ? detail.cargo_categories.join(', ')
      : null;

  const bidsCount =
    detail?.bids_count != null
      ? String(detail.bids_count)
      : detail?.bids_summary?.count != null
        ? String(detail.bids_summary.count)
        : null;
  const bestBid =
    detail?.best_bid != null
      ? `€ ${Number(detail.best_bid).toLocaleString()}`
      : detail?.bids_summary?.best_bid != null
        ? `€ ${Number(detail.bids_summary.best_bid).toLocaleString()}`
        : null;

  const startLabel = formatDateTime(detail?.start_date_time);
  const summaryMeta = [
    detail?.truck_type?.trim() || null,
    startLabel !== '—' ? startLabel : null,
    priceValue,
  ].filter(Boolean);

  return (
    <div
      className={`wizard-availability-bar ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      role="status"
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="wizard-availability-bar__header">
        <div className="wizard-availability-bar__title-row">
          <span className="wizard-availability-bar__badge">
            {t('createFromAvailability') || 'Creating from availability'}
          </span>
          <span className="wizard-availability-bar__id">#{availabilityId}</span>
          {!loading && detail?.visibility && (
            <span
              className={`wizard-availability-bar__vis wizard-availability-bar__vis--${detail.visibility}`}
            >
              {detail.visibility === 'private'
                ? t('satPrivate') || 'Private'
                : t('satPublic') || 'Public'}
            </span>
          )}
          {!loading && detail?.provider?.preferred ? (
            <span className="wizard-availability-bar__preferred">
              {t('satPreferred') || 'Preferred'}
            </span>
          ) : null}
        </div>
        <div className="wizard-availability-bar__actions">
          {!loading && detail && (
            <button
              type="button"
              className="wizard-availability-bar__toggle"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? t('availabilityCollapseDetails') || 'Hide details'
                : t('availabilityExpandDetails') || 'Show details'}
              <span className="wizard-availability-bar__chevron" aria-hidden>
                {expanded ? '▴' : '▾'}
              </span>
            </button>
          )}
          <Link to="/search-trucks" className="wizard-availability-bar__link">
            {t('availabilityBackToSearch') || 'Back to Search Trucks'}
          </Link>
        </div>
      </div>

      {loading ? (
        <AvailabilityBarSkeleton />
      ) : !detail ? (
        <div className="wizard-availability-bar__loading">
          {t('availabilityContextUnavailable') ||
            'Availability details unavailable — linkage kept for publish'}
        </div>
      ) : (
        <>
          <div className="wizard-availability-bar__summary">
            {detail.provider?.name ? (
              <span className="wizard-availability-bar__provider">{detail.provider.name}</span>
            ) : null}
            <span className="wizard-availability-bar__lane">{lane}</span>
            {summaryMeta.length > 0 && (
              <span className="wizard-availability-bar__meta">{summaryMeta.join(' · ')}</span>
            )}
          </div>

          {expanded && (
            <div
              id={panelId}
              className="wizard-availability-bar__grid"
            >
              <DetailCell
                label={t('satProviderProfile') || 'Provider'}
                value={detail.provider?.name || null}
              />
              <DetailCell label={t('satRating') || 'Rating'} value={rating} />
              <DetailCell
                label={t('satStartingPrice') || 'Starting price'}
                value={priceValue}
              />
              <DetailCell
                label={t('satTripPreference') || 'Trip'}
                value={tripLabel}
              />

              <DetailCell
                label={t('satPickupLocation') || 'Pickup'}
                value={
                  <>
                    <span>{pickupPlace || '—'}</span>
                    {detail.pickup_city &&
                      detail.pickup_address &&
                      detail.pickup_city !== detail.pickup_address && (
                        <span className="wizard-availability-bar__sub">{detail.pickup_city}</span>
                      )}
                    {pickupCoords && (
                      <span className="wizard-availability-bar__sub">{pickupCoords}</span>
                    )}
                  </>
                }
              />
              <DetailCell
                label={t('satDestination') || 'Destination'}
                value={
                  <>
                    <span>{dropoffPlace || '—'}</span>
                    {detail.dropoff_city &&
                      detail.dropoff_address &&
                      detail.dropoff_city !== detail.dropoff_address && (
                        <span className="wizard-availability-bar__sub">{detail.dropoff_city}</span>
                      )}
                    {dropoffCoords && (
                      <span className="wizard-availability-bar__sub">{dropoffCoords}</span>
                    )}
                  </>
                }
              />
              <DetailCell
                label={t('satPickupDateTime') || 'Available from'}
                value={formatDateTime(detail.start_date_time)}
              />
              <DetailCell
                label={t('satEndDateTime') || 'Available until'}
                value={formatDateTime(detail.end_date_time)}
              />

              <DetailCell label={t('satTruck') || 'Truck'} value={detail.truck_type} />
              <DetailCell
                label={t('satCargoCategories') || 'Cargo / specs'}
                value={categories}
              />
              <DetailCell label={t('satCapacity') || 'Capacity'} value={capacity} />
              <DetailCell
                label={t('satRadiusFromPickup') || 'Pickup radius'}
                value={
                  detail.pickup_radius != null ? `${detail.pickup_radius} km` : null
                }
              />

              <DetailCell
                label={t('satPendingBidsLabel') || 'Pending bids'}
                value={bidsCount}
              />
              <DetailCell label={t('satBestBid') || 'Best bid'} value={bestBid} />
              <DetailCell
                label={t('satLoadMatch') || 'Load match'}
                value={
                  detail.load_match_score != null
                    ? `${detail.load_match_score}%`
                    : null
                }
              />
              <DetailCell
                label={t('satPostedAt') || 'Posted'}
                value={
                  detail.posted_at
                    ? new Date(detail.posted_at).toLocaleString()
                    : null
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
