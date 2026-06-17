import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { lang, setLang, t, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Dropdown States
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month'>('today');

  // Breadcrumbs title mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return lang === 'el' ? 'Ταμπλό' : 'Dashboard';
    if (path.startsWith('/shipments/create')) return lang === 'el' ? 'Δημιουργία Φορτίου' : 'Create Shipment';
    if (path.startsWith('/shipments')) return lang === 'el' ? 'Διαχείριση Φορτίων' : 'Manage Shipments';
    if (path.startsWith('/address-book')) return lang === 'el' ? 'Βιβλίο Διευθύνσεων' : 'Address Book';
    if (path.startsWith('/products')) return lang === 'el' ? 'Μητρώο Προϊόντων' : 'Product Registry';
    return 'Portal';
  };

  return (
    <header className="topbar" role="banner">
      {/* Mobile hamburger menu */}
      <button
        id="mobileMenuBtn"
        aria-label="Open navigation"
        onClick={onToggleMobileMenu}
        className="btn btn-ghost btn-icon"
        style={{ display: 'none', color: 'var(--text-secondary)' }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Page Title */}
      <span className="topbar-title">{getPageTitle()}</span>

      {/* Quick period filter chips */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '16px' }}
        role="group"
        aria-label="Quick filters"
      >
        <button
          className={`filter-chip ${activePeriod === 'today' ? 'active' : ''}`}
          onClick={() => setActivePeriod('today')}
        >
          {lang === 'el' ? 'Σήμερα' : 'Today'}
        </button>
        <button
          className={`filter-chip ${activePeriod === 'week' ? 'active' : ''}`}
          onClick={() => setActivePeriod('week')}
        >
          {lang === 'el' ? 'Αυτή την Εβδομάδα' : 'This Week'}
        </button>
        <button
          className={`filter-chip ${activePeriod === 'month' ? 'active' : ''}`}
          onClick={() => setActivePeriod('month')}
        >
          {lang === 'el' ? 'Αυτόν το Μήνα' : 'This Month'}
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }}></div>

      {/* Search Bar */}
      <div className="search-wrap" style={{ width: '240px' }}>
        <span className="search-icon" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          className="form-input"
          placeholder={lang === 'el' ? 'Αναζήτηση φορτίων...' : 'Search shipments...'}
          aria-label="Search shipments"
          style={{ fontSize: '13px', paddingTop: '7px', paddingBottom: '7px' }}
        />
      </div>

      {/* Language Toggle */}
      <div className="lang-toggle" role="group" aria-label="Language selector">
        <button
          className={`lang-btn ${lang === 'el' ? 'active' : ''}`}
          onClick={() => setLang('el')}
        >
          EL
        </button>
        <button
          className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
          onClick={() => setLang('en')}
        >
          EN
        </button>
      </div>

      {/* Notifications Dropdown */}
      <div className="dropdown" style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => {
            setNotifOpen(!notifOpen);
            setUserOpen(false);
          }}
          aria-label="Notifications"
          aria-haspopup="true"
          style={{ position: 'relative', color: 'var(--text-secondary)' }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--danger)',
              border: '2px solid #fff',
            }}
            aria-label="3 unread notifications"
          ></span>
        </button>

        {notifOpen && (
          <div
            className="dropdown-menu open"
            id="notifMenu"
            style={{ width: '320px', right: 0, display: 'block' }}
            role="menu"
            aria-label="Notifications"
          >
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {lang === 'el' ? 'Ειδοποιήσεις' : 'Notifications'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'var(--danger-bg)',
                  color: '#991B1B',
                  padding: '2px 8px',
                  borderRadius: '99px',
                }}
              >
                {lang === 'el' ? '3 νέες' : '3 new'}
              </span>
            </div>
            <div
              className="dropdown-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
              role="menuitem"
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {lang === 'el' ? 'Νέα προσφορά για το SHP-5012' : 'New bid received on SHP-5012'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {lang === 'el' ? 'Πριν από 2 λεπτά' : '2 minutes ago'}
              </span>
            </div>
            <div
              className="dropdown-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
              role="menuitem"
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {lang === 'el' ? 'Το SHP-5008 παραδόθηκε' : 'SHP-5008 delivered successfully'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {lang === 'el' ? 'Πριν από 38 λεπτά' : '38 minutes ago'}
              </span>
            </div>
            <div
              className="dropdown-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
              role="menuitem"
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {lang === 'el' ? 'Επιβεβαίωση πληρωμής για το SHP-5006' : 'Payment confirmed for SHP-5006'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {lang === 'el' ? 'Πριν από 1 ώρα' : '1 hour ago'}
              </span>
            </div>
            <div className="dropdown-divider"></div>
            <div
              className="dropdown-item"
              style={{ justifyContent: 'center', color: 'var(--accent)', fontWeight: 600 }}
              role="menuitem"
              onClick={() => {
                setNotifOpen(false);
                showToast(lang === 'el' ? 'Προβολή όλων των ειδοποιήσεων' : 'Opening notifications...', 'info');
              }}
            >
              {lang === 'el' ? 'Προβολή όλων' : 'View all notifications'}
            </div>
          </div>
        )}
      </div>

      {/* New Shipment CTA Button */}
      <button
        className="btn btn-primary btn-sm"
        onClick={() => navigate('/shipments/create')}
        style={{ marginLeft: '8px' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t('createShipment')}
      </button>

      {/* User profile avatar / dropdown */}
      <div className="dropdown" style={{ position: 'relative', marginLeft: '8px' }}>
        <button
          className="avatar avatar-md"
          onClick={() => {
            setUserOpen(!userOpen);
            setNotifOpen(false);
          }}
          aria-label="User menu"
          aria-haspopup="true"
          style={{ cursor: 'pointer', border: 'none' }}
        >
          AL
        </button>

        {userOpen && (
          <div
            className="dropdown-menu open"
            id="userMenu"
            style={{ right: 0, display: 'block' }}
            role="menu"
            aria-label="User account"
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Acme Logistics</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                admin@acme.com
              </div>
            </div>
            <div
              className="dropdown-item"
              role="menuitem"
              onClick={() => {
                setUserOpen(false);
                showToast(lang === 'el' ? 'Προφίλ Χρήστη' : 'Opening user profile...', 'info');
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {lang === 'el' ? 'Προφίλ' : 'Profile'}
            </div>
            <div
              className="dropdown-item"
              role="menuitem"
              onClick={() => {
                setUserOpen(false);
                showToast(lang === 'el' ? 'Ρυθμίσεις Λογαριασμού' : 'Opening settings...', 'info');
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              {lang === 'el' ? 'Ρυθμίσεις' : 'Settings'}
            </div>
            <div className="dropdown-divider"></div>
            <div
              className="dropdown-item danger"
              role="menuitem"
              onClick={() => {
                setUserOpen(false);
                navigate('/');
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {lang === 'el' ? 'Αποσύνδεση' : 'Sign out'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
