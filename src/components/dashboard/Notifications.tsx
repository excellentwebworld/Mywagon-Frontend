import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

export const Notifications: React.FC = () => {
  const { showToast } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleAction = (action: string, sid: string) => {
    showToast(t('notifAction', { action, sid }), 'info');
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>{t('notifications')}</span>
        </h3>
        <span className="card-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
          {t('all')}
        </span>
      </div>

      {/* Notification 1 — with action */}
      <div className="notif-item" onClick={() => handleAction("Click Item", "SID-13997")}>
        <div className="notif-icon red">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="notif-body">
          <div className="notif-text">
            <strong>#SID-13997</strong> — {t('notifDelayTrikala')}
          </div>
          <div className="notif-time">{t('notif30MinAgo')}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn accent" onClick={() => handleAction("Contact Carrier", "SID-13997")}>
              💬 {t('contactCarrier')}
            </button>
            <button className="notif-action-btn" onClick={() => handleAction("View Details", "SID-13997")}>
              {t('viewDetails')}
            </button>
          </div>
        </div>
        <div className="notif-unread"></div>
      </div>

      {/* Notification 2 */}
      <div className="notif-item" onClick={() => handleAction("Click Item", "SID-90969")}>
        <div className="notif-icon blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <div className="notif-body">
          <div className="notif-text">
            {t('notifStartedBefore')}<strong>#SID-90969</strong>{t('notifStartedAfter')}
          </div>
          <div className="notif-time">{t('notif2HoursAgo')}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn" onClick={() => handleAction("Track", "SID-90969")}>
              📍 {t('track')}
            </button>
          </div>
        </div>
        <div className="notif-unread"></div>
      </div>

      {/* Notification 3 — offer with accept/reject */}
      <div className="notif-item" onClick={() => handleAction("Click Item", "SID-102245")}>
        <div className="notif-icon yellow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="notif-body">
          <div className="notif-text">
            {t('notifOfferBefore')}<strong>€ 560</strong>{t('notifOfferMid')}<strong>#SID-102245</strong>{t('notifOfferFrom')}<strong>M. Tsoukalas</strong>
          </div>
          <div className="notif-time">{t('notif1DayAgo')}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn accept" onClick={() => handleAction("Accept Offer", "SID-102245")}>
              ✓ {t('accept')}
            </button>
            <button className="notif-action-btn" onClick={() => handleAction("Reject Offer", "SID-102245")}>
              ✕ {t('reject')}
            </button>
            <button className="notif-action-btn" onClick={() => handleAction("View Offer", "SID-102245")}>
              {t('view')}
            </button>
          </div>
        </div>
        <div className="notif-unread"></div>
      </div>

      {/* Notification 4 */}
      <div className="notif-item" onClick={() => handleAction("Click Item", "SID-79998")}>
        <div className="notif-icon green">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="notif-body">
          <div className="notif-text">
            {t('notifAcceptedBefore')}<strong>KRP Transport S.A</strong>{t('notifAcceptedMid')}<strong>#SID-79998</strong>
          </div>
          <div className="notif-time">{t('notif5HoursAgo')}</div>
        </div>
      </div>

      {/* Notification 5 */}
      <div className="notif-item" onClick={() => handleAction("Click Item", "SID-77301")}>
        <div className="notif-icon blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="notif-body">
          <div className="notif-text">
            {t('notifPodBefore')}<strong>#SID-77301</strong>{t('notifPodAfter')}
          </div>
          <div className="notif-time">{t('yesterday')}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn" onClick={() => handleAction("View POD", "SID-77301")}>
              📄 {t('boardViewPod')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
