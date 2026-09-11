import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { statusBadgeClass } from '../../pages/ManageShipments/utils/listingUtils';
import { useTodaySchedule } from './useTodaySchedule';
import type { ScheduleEvent } from './scheduleUtils';
import { translateDashMessage } from './dashErrorUtils';
import { DashScheduleSkeleton } from './DashboardSkeletons';

interface ScheduleProps {
  selectedShipmentId: number | null;
  onSelectShipment: (id: number) => void;
}

export const Schedule: React.FC<ScheduleProps> = ({ selectedShipmentId, onSelectShipment }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { events, counts, loading, error } = useTodaySchedule();

  // Auto-select first event's shipment (Blade seeds first itinerary).
  useEffect(() => {
    if (selectedShipmentId != null) return;
    if (events.length === 0) return;
    onSelectShipment(events[0].shipmentId);
  }, [events, selectedShipmentId, onSelectShipment]);

  const renderCarrierOrRisk = (event: ScheduleEvent) => {
    if (event.atRisk || (event.status === 'pending' && !event.carrier?.name)) {
      return (
        <span className="sched-at-risk">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 3L22 21H2L12 3z" />
          </svg>
          {t('kpiAtRisk')}
        </span>
      );
    }

    if (!event.carrier?.name) {
      return <span className="sched-carrier-empty">—</span>;
    }

    return (
      <span className="sched-carrier">
        <span className="sched-carrier-av">{event.carrier.initials || '?'}</span>
        {event.carrier.name}
      </span>
    );
  };

  return (
    <div className="card sched-card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{t('todaysSchedule')}</span>
          <span className="cnt">{counts.loads}</span>
          <span className="sched-density" style={{ marginLeft: '8px' }}>
            <span className="sched-density-dot" style={{ background: 'var(--text-primary)' }} />
            <span>
              {counts.pickups}
              {t('schedPickupsShort')}
            </span>
            <span className="sched-density-dot" style={{ background: '#000' }} />
            <span>
              {counts.dropoffs}
              {t('schedDropoffsShort')}
            </span>
          </span>
        </h3>
        <Link to="/shipments" className="card-link">
          <span>{t('viewAll')}</span> →
        </Link>
      </div>

      <div className="sched-scroll" id="schedScroll">
        {loading && <DashScheduleSkeleton />}

        {!loading && error && (
          <div className="sched-empty">{translateDashMessage(t, error)}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="sched-empty">{t('schedEmpty')}</div>
        )}

        {!loading &&
          !error &&
          events.map((event, index) => {
            const isSelected = selectedShipmentId === event.shipmentId;
            const badgeClass = statusBadgeClass(event.status as never, event.atRisk, {
              bidsReceived: event.bidsReceived,
              bidsSent: event.bidsSent,
              interestedCount: event.interestedCount,
              awaitingResponse: event.awaitingResponse,
              needsAction: event.needsAction,
            });
            const isLast = index === events.length - 1;

            return (
              <div
                key={event.key}
                className={`sched-item${event.atRisk ? ' at-risk' : ''}${isSelected ? ' selected' : ''}`}
                onClick={() => onSelectShipment(event.shipmentId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectShipment(event.shipmentId);
                  }
                }}
              >
                <div className="sched-time">{event.timeLabel}</div>
                <div className="sched-dot-col">
                  <div className={`sched-dot ${event.kind}`} />
                  {!isLast && <div className="sched-line" />}
                </div>
                <div className="sched-body">
                  <div className="sched-row1">
                    <span className={`sched-type ${event.kind}`}>
                      {event.kind === 'pickup' ? t('pickupUpper') : t('dropoffUpper')}
                    </span>
                    <span className="sched-sid">#{event.autoId}</span>
                    <span className="sched-lane">{event.lane}</span>
                  </div>
                  <div className="sched-row2">{renderCarrierOrRisk(event)}</div>
                </div>
                <div className="sched-right">
                  <span className="sched-price">{event.priceLabel}</span>
                  <span className={`status-box-wrap${event.atRisk ? ' is-at-risk' : ''}`}>
                    {event.status === 'partially_fullfilled' ? (
                      <span className={`${badgeClass} status-box--partial-compact`}>
                        <span className="status-partial-left">{t('partially')}</span>
                        <span className="status-partial-right">{t('fulfilled')}</span>
                      </span>
                    ) : (
                      <span className={badgeClass}>{t(event.status)}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="sched-details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/shipments/${event.shipmentId}`);
                    }}
                  >
                    {t('viewLoadDetails')}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
