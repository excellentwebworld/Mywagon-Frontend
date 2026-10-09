import React from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, MapPin, Package, Truck, X } from 'lucide-react';
import { translateCargoUnit } from '../../../constants/cargoUnits';
import { parseYmdDate, toDateLocale, type CalendarEvent } from './calendarUtils';
import { useTranslation } from '../../../hooks/useTranslation';

interface EventDetailPopoverProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onNavigateToDetail: (shipmentId: number) => void;
  t: (key: string, defaultValue?: string) => string;
}

function formatEventCargoSpecs(
  event: CalendarEvent,
  t: (key: string, defaultValue?: string) => string
): string {
  const parts: string[] = [];
  if (event.qty != null && event.qty !== '') {
    const unit = translateCargoUnit(event.qtyUnit || 'EUR Pallets', t);
    parts.push(`${event.qty} ${unit}`.trim());
  }
  if (event.weight != null && event.weight !== '') {
    const unit = translateCargoUnit(event.weightUnit || 'Kgs', t);
    parts.push(`${event.weight} ${unit}`.trim());
  }
  return parts.join(' · ');
}

export const EventDetailPopover: React.FC<EventDetailPopoverProps> = ({
  event,
  onClose,
  onNavigateToDetail,
  t,
}) => {
  const { lang } = useTranslation();
  if (!event) return null;

  const isPickup = event.type === 'pickup';
  const cargoSpecs = formatEventCargoSpecs(event, t);
  const dateLabel = parseYmdDate(event.dateYmd).toLocaleDateString(toDateLocale(lang), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="cal-popover-backdrop" onClick={onClose}>
      <div
        className="cal-popover-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={event.sid}
      >
        <div className="cal-popover-header">
          <div className="cal-popover-header-title">
            <span className={`cal-type-badge cal-type-badge--${event.type}`}>
              {isPickup ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {isPickup ? t('pickup', 'Pickup') : t('dropoff', 'Dropoff')}
            </span>
            <span className="cal-popover-sid">{event.sid}</span>
            <span className={`cal-status-pill cal-status-pill--${event.status.toLowerCase()}`}>
              {t(event.status, event.status)}
            </span>
          </div>
          <button
            type="button"
            className="cal-popover-close"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="cal-popover-body">
          {/* Time & Date */}
          <div className="cal-popover-section">
            <div className="cal-popover-label">{t('scheduledTime', 'Scheduled Time')}</div>
            <div className="cal-popover-val cal-popover-val--time">
              {dateLabel}
              {event.timeStart ? ` · ${event.timeStart}${event.timeEnd ? ` – ${event.timeEnd}` : ''}` : ''}
            </div>
          </div>

          {/* Location & Address */}
          <div className="cal-popover-section">
            <div className="cal-popover-label">
              <MapPin size={13} />
              <span>{isPickup ? t('pickupLocation', 'Pickup Location') : t('deliveryLocation', 'Delivery Location')}</span>
            </div>
            <div className="cal-popover-val">
              {event.companyName && <div className="cal-popover-company">{event.companyName}</div>}
              {event.address && <div className="cal-popover-address">{event.address}</div>}
              {event.city && <div className="cal-popover-city">{event.city}</div>}
              {!event.companyName && !event.address && !event.city && (
                <div className="cal-popover-dim">{t('notSpecified', 'Not specified')}</div>
              )}
            </div>
          </div>

          {/* Associated Order & Products */}
          <div className="cal-popover-section">
            <div className="cal-popover-label">
              <Package size={13} />
              <span>{t('orderAndProducts', 'Order & Products')}</span>
            </div>
            <div className="cal-popover-val">
              {event.orderId && (
                <div className="cal-popover-order">
                  <span className="cal-popover-order-label">{t('order', 'Order')}:</span>{' '}
                  <strong>{event.orderId}</strong>
                </div>
              )}
              {event.productName ? (
                <div className="cal-popover-product">
                  <span className="cal-popover-product-name">{event.productName}</span>
                  {cargoSpecs ? (
                    <span className="cal-popover-product-specs"> · {cargoSpecs}</span>
                  ) : null}
                </div>
              ) : (
                <div className="cal-popover-dim">{t('noProductDetails', 'Standard freight')}</div>
              )}
            </div>
          </div>

          {/* Carrier Info */}
          {event.carrierName && (
            <div className="cal-popover-section">
              <div className="cal-popover-label">
                <Truck size={13} />
                <span>{t('transporter', 'Transporter')}</span>
              </div>
              <div className="cal-popover-val">{event.carrierName}</div>
            </div>
          )}
        </div>

        <div className="cal-popover-footer">
          <button
            type="button"
            className="cal-popover-btn-primary"
            onClick={() => onNavigateToDetail(event.shipmentId)}
          >
            <span>{t('viewShipmentDetail', 'View Load Details')}</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
