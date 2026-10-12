import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Truck,
} from 'lucide-react';
import { translateCargoUnit } from '../../../constants/cargoUnits';
import {
  formatDayHeader,
  formatEventTimeRange,
  toDateLocale,
  type CalendarEvent,
} from './calendarUtils';

function formatCargoSpecs(
  ev: CalendarEvent,
  t: (key: string, defaultValue?: string) => string
): string {
  const parts: string[] = [];
  if (ev.qty != null && ev.qty !== '') {
    parts.push(`${ev.qty} ${translateCargoUnit(ev.qtyUnit || 'EUR Pallets', t)}`.trim());
  }
  if (ev.weight != null && ev.weight !== '') {
    parts.push(`${ev.weight} ${translateCargoUnit(ev.weightUnit || 'Kgs', t)}`.trim());
  }
  return parts.join(' · ');
}

interface DayViewProps {
  dateYmd: string;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onNavigateToDetail: (shipmentId: number) => void;
  onBackToMonth: () => void;
  /** App language code (`en` / `el`) for the day heading. */
  lang?: string;
  t: (key: string, defaultValue?: string) => string;
}

export const DayView: React.FC<DayViewProps> = ({
  dateYmd,
  events,
  onSelectEvent,
  onNavigateToDetail,
  onBackToMonth,
  lang = 'en',
  t,
}) => {
  return (
    <div className="cal-day-view">
      {/* Day summary header — Month/Day toggle lives in CalendarToolbar only */}
      <div className="cal-day-header-card">
        <div className="cal-day-header-left">
          <h3 className="cal-day-heading">{formatDayHeader(dateYmd, toDateLocale(lang))}</h3>
        </div>
      </div>

      {/* Events schedule timeline */}
      {events.length === 0 ? (
        <div className="cal-empty-day">
          <div className="cal-empty-icon">📅</div>
          <h4>{t('noEventsForDate', 'No events scheduled for this date')}</h4>
          <p>{t('noEventsForDateDesc', 'There are no pickups or dropoffs scheduled on this day.')}</p>
          <button type="button" className="cal-btn cal-btn--primary" onClick={onBackToMonth}>
            {t('viewFullMonth', 'View Full Month')}
          </button>
        </div>
      ) : (
        <div className="cal-timeline">
          {events.map((ev) => {
            const isPickup = ev.type === 'pickup';
            const cargoSpecs = formatCargoSpecs(ev, t);

            return (
              <div
                key={ev.id}
                className={`cal-timeline-card cal-timeline-card--${ev.type}`}
                onClick={() => onSelectEvent(ev)}
              >
                <div className="cal-card-left-stripe" />

                <div className="cal-card-content">
                  {/* Row 1: Header (Type badge, SID, Status, Time, Actions) */}
                  <div className="cal-card-row-top">
                    <div className="cal-card-badges">
                      <span className={`cal-type-badge cal-type-badge--${ev.type}`}>
                        {isPickup ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {isPickup ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}
                      </span>

                      <button
                        type="button"
                        className="cal-card-sid-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToDetail(ev.shipmentId);
                        }}
                        title={t('viewShipmentDetail', 'View Load Details')}
                      >
                        {ev.sid}
                        <ExternalLink size={12} />
                      </button>

                      <span className={`cal-status-pill cal-status-pill--${ev.status.toLowerCase()}`}>
                        {t(ev.status, ev.status)}
                      </span>
                    </div>

                    <div className="cal-card-time">
                      <Clock size={13} />
                      <span>
                        {formatEventTimeRange(ev.timeStart, ev.timeEnd) ||
                          t('flexibleTime', 'All Day / Flexible')}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Location */}
                  <div className="cal-card-location">
                    <MapPin size={14} className="cal-location-pin" />
                    <div className="cal-location-details">
                      {ev.companyName && <span className="cal-loc-company">{ev.companyName}</span>}
                      {ev.address && <span className="cal-loc-address">{ev.address}</span>}
                      {ev.city && <span className="cal-loc-city">{ev.city}</span>}
                      {!ev.companyName && !ev.address && !ev.city && (
                        <span className="cal-loc-dim">{t('locationNotSpecified', 'Location not specified')}</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Order & Products */}
                  <div className="cal-card-cargo">
                    <div className="cal-cargo-item">
                      <Package size={13} />
                      {ev.orderId ? (
                        <span className="cal-cargo-order">
                          {t('order', 'Order')}: <strong>{ev.orderId}</strong>
                        </span>
                      ) : null}

                      {ev.productName ? (
                        <span className="cal-cargo-product">
                          {ev.productName}
                          {cargoSpecs ? ` · ${cargoSpecs}` : ''}
                        </span>
                      ) : (
                        <span className="cal-cargo-dim">{t('standardFreight', 'Standard Freight')}</span>
                      )}
                    </div>

                    {ev.carrierName && (
                      <div className="cal-cargo-carrier">
                        <Truck size={13} />
                        <span>{ev.carrierName}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer button */}
                  <div className="cal-card-footer">
                    <button
                      type="button"
                      className="cal-card-link-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToDetail(ev.shipmentId);
                      }}
                    >
                      <span>{t('viewLoadDetails', 'View Load Details')}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
