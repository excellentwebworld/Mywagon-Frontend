import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const ScheduleRowActions: React.FC<{
  event: ScheduleEvent;
  onSelectOnMap: () => void;
  t: (key: string, defaultVal?: string) => string;
}> = ({ event, onSelectOnMap, t }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 168;
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - menuWidth),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="sched-toggle-wrap">
      <button
        ref={btnRef}
        type="button"
        className={`sched-act-btn${open ? ' is-active' : ''}`}
        title={t('more', 'More')}
        aria-label={t('more', 'More')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="row-actions-menu sched-actions-menu"
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(`/shipments/${event.shipmentId}`);
              }}
            >
              {t('viewLoadDetails')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelectOnMap();
              }}
            >
              {t('viewOnMap', 'View on Map')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(`/shipments?search=${event.autoId}`);
              }}
            >
              {t('manageShipments')}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

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
            <span className="sched-density-dot sched-density-dot--pickup" />
            <span>
              {counts.pickups}
              {t('schedPickupsShort')}
            </span>
            <span className="sched-density-dot sched-density-dot--dropoff" />
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
                <div className="sched-time">
                  <span className="sched-time-single">{event.timeLabel}</span>
                </div>
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
                    <span className="sched-lane" title={event.overallLane || event.lane}>
                      {event.lane}
                    </span>
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
                    {event.atRisk ? (
                      <span
                        className="status-at-risk-warn"
                        aria-label={t('atRiskLate', 'At risk')}
                        title={t('atRiskLate', 'At risk')}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 3L22 21H2L12 3z" />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="sched-details-btn sched-desktop-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/shipments/${event.shipmentId}`);
                    }}
                  >
                    {t('viewLoadDetails')}
                  </button>
                  <div className="sched-mobile-toggle">
                    <ScheduleRowActions
                      event={event}
                      onSelectOnMap={() => onSelectShipment(event.shipmentId)}
                      t={t as (key: string, defaultVal?: string) => string}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
