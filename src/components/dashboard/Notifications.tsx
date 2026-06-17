import React from 'react';
import { useApp } from '../../context/AppContext';

export const Notifications: React.FC = () => {
  const { lang, showToast } = useApp();

  const handleAction = (action: string, sid: string) => {
    showToast(
      lang === 'el'
        ? `Ενέργεια ειδοποίησης: ${action} για ${sid}`
        : `Notification Action: ${action} for ${sid}`,
      'info'
    );
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>{lang === 'el' ? 'Ειδοποιήσεις' : 'Notifications'}</span>
        </h3>
        <span className="card-link" style={{ cursor: 'pointer' }} onClick={() => handleAction("View All", "all")}>
          {lang === 'el' ? 'Όλες' : 'All'}
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
            <strong>#SID-13997</strong> — {lang === 'el' ? '45 λεπτά καθυστέρηση στην παράδοση στα Τρίκαλα' : '45 min delay on Trikala delivery'}
          </div>
          <div className="notif-time">{lang === 'el' ? 'Πριν από 30 λεπτά' : '30 minutes ago'}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn accent" onClick={() => handleAction("Contact Carrier", "SID-13997")}>
              💬 {lang === 'el' ? 'Επικοινωνία' : 'Contact Carrier'}
            </button>
            <button className="notif-action-btn" onClick={() => handleAction("View Details", "SID-13997")}>
              {lang === 'el' ? 'Λεπτομέρειες' : 'View Details'}
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
            {lang === 'el' ? <>Το φορτίο <strong>#SID-90969</strong> ξεκίνησε τη μεταφορά</> : <>Shipment <strong>#SID-90969</strong> started transport</>}
          </div>
          <div className="notif-time">{lang === 'el' ? 'Πριν από 2 ώρες' : '2 hours ago'}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn" onClick={() => handleAction("Track", "SID-90969")}>
              📍 {lang === 'el' ? 'Εντοπισμός' : 'Track'}
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
            {lang === 'el' ? (
              <>Νέα προσφορά <strong>€ 560</strong> για το <strong>#SID-102245</strong> από <strong>M. Tsoukalas</strong></>
            ) : (
              <>New offer <strong>€ 560</strong> for <strong>#SID-102245</strong> from <strong>M. Tsoukalas</strong></>
            )}
          </div>
          <div className="notif-time">{lang === 'el' ? 'Πριν από 1 μέρα' : '1 day ago'}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn accept" onClick={() => handleAction("Accept Offer", "SID-102245")}>
              ✓ {lang === 'el' ? 'Αποδοχή' : 'Accept'}
            </button>
            <button className="notif-action-btn" onClick={() => handleAction("Reject Offer", "SID-102245")}>
              ✕ {lang === 'el' ? 'Απόρριψη' : 'Reject'}
            </button>
            <button className="notif-action-btn" onClick={() => handleAction("View Offer", "SID-102245")}>
              {lang === 'el' ? 'Προβολή' : 'View'}
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
            {lang === 'el' ? (
              <>Η <strong>KRP Transport S.A</strong> αποδέχτηκε το φορτίο <strong>#SID-79998</strong></>
            ) : (
              <><strong>KRP Transport S.A</strong> accepted shipment <strong>#SID-79998</strong></>
            )}
          </div>
          <div className="notif-time">{lang === 'el' ? 'Πριν από 5 ώρες' : '5 hours ago'}</div>
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
            {lang === 'el' ? (
              <>Το POD ανέβηκε για το <strong>#SID-77301</strong> — η παράδοση επιβεβαιώθηκε</>
            ) : (
              <>POD uploaded for <strong>#SID-77301</strong> — delivery confirmed</>
            )}
          </div>
          <div className="notif-time">{lang === 'el' ? 'Χθες' : 'Yesterday'}</div>
          <div className="notif-action" onClick={(e) => e.stopPropagation()}>
            <button className="notif-action-btn" onClick={() => handleAction("View POD", "SID-77301")}>
              📄 {lang === 'el' ? 'Προβολή POD' : 'View POD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
