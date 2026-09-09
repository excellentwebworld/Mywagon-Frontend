import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../api/services/notificationService';
import type { ApiNotification } from '../../api/services/notificationService';
import { useTranslation } from '../../hooks/useTranslation';
import { openNotificationTarget } from '../../utils/notificationNavigation';
import { formatDashError, translateDashMessage } from './dashErrorUtils';
import { DashNotifSkeleton } from './DashboardSkeletons';

function severityClass(severity: ApiNotification['severity']): string {
  if (severity === 'Critical') return 'red';
  if (severity === 'Warning') return 'yellow';
  return 'blue';
}

function SeverityIcon({ severity }: { severity: ApiNotification['severity'] }) {
  if (severity === 'Critical') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (severity === 'Warning') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    notificationService
      .list({ tab: 'inbox', per_page: 5 })
      .then((res) => {
        if (!cancelled) setItems(res.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setItems([]);
          setError(formatDashError(err, 'dashNotifLoadFailed').key);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = (n: ApiNotification) => {
    if (!n.read) {
      void notificationService.markRead(n.id).catch(() => {});
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    }
    openNotificationTarget(n, navigate);
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
        <span
          className="card-link"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/settings/notifications')}
        >
          {t('all')}
        </span>
      </div>

      <div className="dash-notif-list">
        {loading && <DashNotifSkeleton />}
        {!loading && error && (
          <div className="dash-notif-empty">{translateDashMessage(t, error)}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="dash-notif-empty">{t('noNotifications')}</div>
        )}
        {!loading &&
          !error &&
          items.map((n) => (
            <div
              key={n.id}
              className="notif-item"
              role="button"
              tabIndex={0}
              onClick={() => handleClick(n)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(n);
                }
              }}
            >
              <div className={`notif-icon ${severityClass(n.severity)}`}>
                <SeverityIcon severity={n.severity} />
              </div>
              <div className="notif-body">
                <div className="notif-text">
                  {n.chips?.[0] ? <strong>{n.chips[0]} — </strong> : null}
                  {n.title || n.body}
                </div>
                <div className="notif-time">{n.relative_time}</div>
              </div>
              {!n.read ? <div className="notif-unread" /> : null}
            </div>
          ))}
      </div>
    </div>
  );
};
