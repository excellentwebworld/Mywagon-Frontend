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
  const hasBids = vs === 'bids' && event.bids > 0;
  const cargoSpecs = formatEventCargoSpecs(event, t);
  const timeLabel = event.allDay
    ? t('anyTime', 'Any time')
    : formatEventTimeRange(event.timeStart, event.timeEnd) || event.timeStart;
  const dateLabel = formatDayHeader(event.dateYmd, toDateLocale(lang));
  const placeLine = [event.address, event.city].filter(Boolean).join(', ');

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

  const statusLabel = hasBids
    ? `${t('pending', 'Pending')} · ${event.bids} ${
        event.bids === 1 ? t('bid', 'bid') : t('bids', 'bids')
      }`
    : t(`legend_${vs}`, STATUS_LABELS[vs] || event.status);

  const showPrice =
    event.quotedPrice != null || event.agreedPrice != null || event.priceType;

  return (
    <FloatingPanel
      anchor={anchor}
      onClose={onClose}
      width={420}
      label={`${event.sid} ${event.type}`}
    >
      <div className="cal-pop">
        <header className="cal-pop-head">
          <div className="cal-pop-tags">
            <span className="cal-pop-status">{statusLabel}</span>
            <span className={cls('cal-kindtag', event.type)}>
              {isPickup ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
              {isPickup ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}
              {event.stopCount > 2 && event.stopIndex != null
                ? ` · ${(event.stopIndex ?? 0) + 1}/${event.stopCount}`
                : ''}
            </span>
          </div>
          <button
            type="button"
            className="cal-icon-btn sm"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="cal-pop-scroll">
          <div className="cal-pop-title">
            <h3>{event.sid}</h3>
            {event.orderId && <span>{event.orderId}</span>}
          </div>

          {alert && (
            <p className="cal-pop-alert">
              <AlertTriangle size={16} className="cal-pop-alert-ico" />
              <span>{alert}</span>
            </p>
          )}

          <dl className="cal-facts">
            <div>
              <dt>
                <Clock size={18} strokeWidth={1.75} />
              </dt>
              <dd>
                <b>
                  {dateLabel} · {timeLabel || t('anyTime', 'Any time')}
                </b>
                {event.allDay && (
                  <small>{t('noTimeWindow', 'No time window set by the shipper')}</small>
                )}
              </dd>
            </div>

            <div>
              <dt>
                <MapPin size={18} strokeWidth={1.75} />
              </dt>
              <dd>
                <b>{event.locationName || event.city || t('notSpecified', 'Not specified')}</b>
                {placeLine ? <small>{placeLine}</small> : null}
              </dd>
            </div>

            <div>
              <dt>
                <Building2 size={18} strokeWidth={1.75} />
              </dt>
              <dd>
                <b>{event.companyName || t('unknownCustomer', '—')}</b>
              </dd>
            </div>

            <div>
              <dt>
                <Package size={18} strokeWidth={1.75} />
              </dt>
              <dd>
                <b className="cal-fact-primary">
                  {event.productName || t('standardFreight', 'Standard Freight')}
                </b>
                <small>
                  {[
                    cargoSpecs,
                    event.stopCount ? `${event.stopCount} ${t('stops', 'Stops')}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </dd>
            </div>

            <div>
              <dt>
                <Truck size={18} strokeWidth={1.75} />
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
                    <b>{t('noCarrierYet', 'No carrier yet')}</b>
                    <small>
                      {event.invited > 0
                        ? `${event.invited} ${t('invited', 'invited')}`
                        : t('noInvites', 'no invites')}
                      {' · '}
                      {event.bids > 0
                        ? `${event.bids} ${event.bids === 1 ? t('bid', 'bid') : t('bids', 'bids')}`
                        : t('noBids', 'no bids')}
                      {event.channel
                        ? ` · ${
                            event.channel === 'public' ? t('public', 'Public') : t('private', 'Private')
                          }`
                        : ''}
                    </small>
                  </>
                )}
              </dd>
            </div>

            {showPrice && (
              <div>
                <dt>
                  <Euro size={18} strokeWidth={1.75} />
                </dt>
                <dd className="cal-price">
                  <div className="cal-price-col">
                    <span className="cal-price-label">{t('quoted', 'Quoted')}</span>
                    <b>{moneyEur(event.quotedPrice)}</b>
                    {event.priceType && event.priceType !== 'bidding' && (
                      <span className={cls('cal-tag', event.priceType)}>
                        {event.priceType === 'spot' ? 'SPOT' : 'CONTRACT'}
                      </span>
                    )}
                  </div>
                  <div className="cal-price-col">
                    <span className="cal-price-label">{t('agreed', 'Agreed')}</span>
                    <b>{moneyEur(event.agreedPrice)}</b>
                  </div>
                </dd>
              </div>
            )}
          </dl>

          {relatedStops.length > 1 && (
            <div className="cal-pop-route">
              <div className="cal-mini-label">{t('itinerary', 'Itinerary')}</div>
              <ol>
                {relatedStops.map((st, idx) => (
                  <li key={st.id}>
                    <button
                      type="button"
                      className={cls(st.id === event.id && 'is-current')}
                      disabled={st.id === event.id}
                      onClick={() => onJumpStop(st)}
                    >
                      <span className={cls('cal-r-dot', st.type)}>
                        {(st.stopIndex ?? idx) + 1}
                      </span>
                      <span className="cal-r-kind">
                        {st.type === 'pickup' ? 'PU' : 'DL'}
                      </span>
                      <span className="cal-r-name">
                        {st.locationName || st.city || '—'}
                      </span>
                      <span className="cal-r-time">
                        {st.allDay
                          ? `${formatDmy(st.dateYmd)} · ${t('anyTime', 'Any time')}`
                          : `${formatDmy(st.dateYmd)} ${st.timeStart || ''}`.trim()}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <footer className="cal-pop-actions">
          <button
            type="button"
            className="cal-pop-link"
            onClick={() => onNavigateToDetail(event.shipmentId)}
          >
            {hasBids ? t('reviewBids', 'Review bids') : t('openLoad', 'Open load')}
            <ExternalLink size={14} strokeWidth={2.25} />
          </button>
        </footer>
      </div>
    </FloatingPanel>
  );
};
