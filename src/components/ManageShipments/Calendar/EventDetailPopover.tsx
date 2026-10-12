import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Truck,
  X,
  Euro,
} from 'lucide-react';
import { translateCargoUnit } from '../../../constants/cargoUnits';
import { FloatingPanel } from './FloatingPanel';
import {
  STATUS_LABELS,
  cls,
  formatDayHeader,
  formatDmy,
  formatEventTimeRange,
  moneyEur,
  toDateLocale,
  type CalendarEvent,
} from './calendarUtils';
import { useTranslation } from '../../../hooks/useTranslation';

interface EventDetailPopoverProps {
  event: CalendarEvent;
  relatedStops: CalendarEvent[];
  anchor: DOMRect | null;
  onClose: () => void;
  onNavigateToDetail: (shipmentId: number) => void;
  onJumpStop: (ev: CalendarEvent) => void;
  t: (key: string, defaultValue?: string) => string;
}

function formatEventCargoSpecs(
  event: CalendarEvent,
  t: (key: string, defaultValue?: string) => string
): string {
  const parts: string[] = [];
  if (event.qty != null && event.qty !== '') {
    parts.push(`${event.qty} ${translateCargoUnit(event.qtyUnit || 'EUR Pallets', t)}`.trim());
  }
  if (event.weight != null && event.weight !== '') {
    parts.push(`${event.weight} ${translateCargoUnit(event.weightUnit || 'Kgs', t)}`.trim());
  }
  return parts.join(' · ');
}

function progressIndex(status: string): number {
  const s = String(status || '').toLowerCase();
  if (s === 'draft') return -1;
  if (s === 'pending' || s === 'canceled' || s === 'cancelled') return 0;
  if (s === 'scheduled' || s === 'upcoming' || s === 'ready') return 1;
  if (s === 'on_trip' || s === 'in_progress' || s === 'past_due') return 2;
  if (s === 'partially_fullfilled' || s === 'not_fullfilled') return 3;
  if (s === 'fullfilled' || s === 'delivered' || s === 'awarded') return 4;
  return 0;
}

const STEPS = ['Created', 'Carrier accepted', 'Trip started', 'Delivered', 'POD & payment'];

export const EventDetailPopover: React.FC<EventDetailPopoverProps> = ({
  event,
  relatedStops,
  anchor,
  onClose,
  onNavigateToDetail,
  onJumpStop,
  t,
}) => {
  const { lang } = useTranslation();
  const isPickup = event.type === 'pickup';
  const vs = event.visualStatus;
  const cargoSpecs = formatEventCargoSpecs(event, t);
  const timeLabel = event.allDay
    ? t('anyTime', 'Any time')
    : formatEventTimeRange(event.timeStart, event.timeEnd) || event.timeStart;
  const dateLabel = formatDayHeader(event.dateYmd, toDateLocale(lang));
  const pi = progressIndex(event.status);

  const alert = useMemo(() => {
    if (event.isOverdue && String(event.status).toLowerCase() === 'pending') {
      return t(
        'calAlertPendingPast',
        'Pickup date has passed and no carrier confirmed. Reschedule or cancel this load.'
      );
    }
    if (String(event.status).toLowerCase() === 'past_due') {
      return t(
        'calAlertPastDue',
        'Past due: delivery time has passed and the trip is not closed (POD missing).'
      );
    }
    if (event.atRisk) {
      return t('calAlertAtRisk', 'Pickup in under 48 h and no carrier assigned yet.');
    }
    return null;
  }, [event, t]);

  const statusLabel =
    vs === 'bids'
      ? `${t('pending', 'Pending')} · ${event.bids} ${event.bids === 1 ? t('bid', 'bid') : t('bids', 'bids')}`
      : t(STATUS_LABELS[vs] ? `status_${vs}` : event.status, STATUS_LABELS[vs] || event.status);

  return (
    <FloatingPanel
      anchor={anchor}
      onClose={onClose}
      label={`${event.sid} ${event.type}`}
    >
      <div className={cls('cal-pop', `ev--st-${vs}`)}>
        <div className="cal-pop-band" />
        <header className="cal-pop-head">
          <div className="cal-pop-tags">
            <span className={cls('cal-pill', 'cal-pill--sm', `cal-pill--${vs}`, vs === 'bids' && 'cal-pill--ink')}>
              {statusLabel}
            </span>
            <span className={cls('cal-kindtag', event.type)}>
              {isPickup ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {isPickup ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}
              {event.stopCount > 2 && event.stopIndex != null
                ? ` · ${t('stopOf', 'stop')} ${(event.stopIndex ?? 0) + 1} ${t('of', 'of')} ${event.stopCount}`
                : ''}
            </span>
          </div>
          <button type="button" className="cal-icon-btn sm" onClick={onClose} aria-label={t('close', 'Close')}>
            <X size={16} />
          </button>
        </header>

        <div className="cal-pop-title">
          <h3>{event.sid}</h3>
          {event.orderId && <span>{event.orderId}</span>}
        </div>

        {alert && (
          <p className="cal-pop-alert">
            <AlertTriangle size={15} />
            {alert}
          </p>
        )}

        <dl className="cal-facts">
          <div>
            <dt>
              <Clock size={16} />
            </dt>
            <dd>
              <b>
                {dateLabel} · {timeLabel || t('anyTime', 'Any time')}
              </b>
              <small>
                {event.allDay
                  ? t('noTimeWindow', 'No time window set by the shipper')
                  : t('displayTimezoneNote', 'Shown in your saved timezone')}
              </small>
            </dd>
          </div>
          <div>
            <dt>
              <MapPin size={16} />
            </dt>
            <dd>
              <b>{event.locationName || event.city || t('notSpecified', 'Not specified')}</b>
              <small>{[event.address, event.city].filter(Boolean).join(', ')}</small>
            </dd>
          </div>
          <div>
            <dt>
              <Building2 size={16} />
            </dt>
            <dd>
              <span className="cal-chips">
                <span className="cal-chip">{event.companyName || t('unknownCustomer', '—')}</span>
              </span>
            </dd>
          </div>
          <div>
            <dt>
              <Package size={16} />
            </dt>
            <dd>
              {event.productName || t('standardFreight', 'Standard Freight')}
              <small>
                {[cargoSpecs, event.stopCount ? `${event.stopCount} ${t('stops', 'stops')}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </dd>
          </div>
          <div>
            <dt>
              <Truck size={16} />
            </dt>
            <dd>
              {event.carrierName ? (
                <b>{event.carrierName}</b>
              ) : String(event.status).toLowerCase() === 'draft' ? (
                <>
                  <b>{t('notPublishedYet', 'Not published yet')}</b>
                  <small>{t('draftNoTransporters', 'Draft: no transporters invited')}</small>
                </>
              ) : (
                <>
                  <b className="cal-muted-b">{t('noCarrierYet', 'No carrier yet')}</b>
                  <small>
                    {event.invited > 0
                      ? `${event.invited} ${t('invited', 'invited')}`
                      : t('noInvites', 'no invites')}
                    {' · '}
                    {event.bids > 0
                      ? `${event.bids} ${event.bids === 1 ? t('bid', 'bid') : t('bids', 'bids')}`
                      : t('noBids', 'no bids')}
                    {event.channel ? ` · ${event.channel === 'public' ? t('public', 'Public') : t('private', 'Private')}` : ''}
                  </small>
                </>
              )}
            </dd>
          </div>
          {(event.quotedPrice != null || event.agreedPrice != null || event.priceType) && (
            <div>
              <dt>
                <Euro size={16} />
              </dt>
              <dd className="cal-price">
                <span>
                  {t('quoted', 'Quoted')} <b>{moneyEur(event.quotedPrice)}</b>{' '}
                  {event.priceType && event.priceType !== 'bidding' && (
                    <span className={cls('cal-tag', event.priceType)}>
                      {event.priceType === 'spot' ? 'SPOT' : 'CONTRACT'}
                    </span>
                  )}
                </span>
                <span>
                  {t('agreed', 'Agreed')} <b>{moneyEur(event.agreedPrice)}</b>
                </span>
              </dd>
            </div>
          )}
        </dl>

        {relatedStops.length > 1 && (
          <div className="cal-pop-route">
            <div className="cal-mini-label">{t('itineraryJump', 'Itinerary · click a stop to jump to it')}</div>
            <ol>
              {relatedStops.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    className={cls(st.id === event.id && 'is-current')}
                    disabled={st.id === event.id}
                    onClick={() => onJumpStop(st)}
                  >
                    <span className={cls('cal-r-dot', st.type)}>{(st.stopIndex ?? 0) + 1}</span>
                    <span className="cal-r-kind">{st.type === 'pickup' ? 'PU' : 'DL'}</span>
                    <span className="cal-r-name">{st.locationName || st.city || '—'}</span>
                    <span className="cal-r-time">
                      {st.allDay
                        ? `${formatDmy(st.dateYmd)} · ${t('anyTime', 'Any time')}`
                        : `${formatDmy(st.dateYmd)} ${st.timeStart || ''}`}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {vs !== 'canceled' && (
          <div className="cal-progress-mini" aria-label={t('loadProgress', 'Load progress')}>
            {STEPS.map((step, i) => (
              <span
                key={step}
                className={cls(i <= pi && 'done', i === pi + 1 && 'next')}
                title={step}
              >
                <i />
                {t(`progress_${i}`, step)}
              </span>
            ))}
          </div>
        )}

        <footer className="cal-pop-actions">
          <button
            type="button"
            className="cal-btn cal-btn--primary"
            onClick={() => onNavigateToDetail(event.shipmentId)}
          >
            {vs === 'bids' ? t('reviewBids', 'Review bids') : t('openLoad', 'Open load')}
            <ExternalLink size={14} />
          </button>
        </footer>
      </div>
    </FloatingPanel>
  );
};
