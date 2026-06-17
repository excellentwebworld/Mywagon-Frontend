import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { lang, t } = useApp();

  const currentPath = location.pathname;

  const isLinkActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    // For /shipments, we want to match /shipments and /shipments/:id, but NOT /shipments/create
    if (path === '/shipments') {
      return currentPath.startsWith('/shipments') && currentPath !== '/shipments/create';
    }
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* Sidebar Overlay for mobile */}
      <div
        className={`sb-overlay ${mobileOpen ? 'active' : ''}`}
        id="sbOverlay"
        onClick={onCloseMobile}
        aria-hidden="true"
      ></div>

      {/* Sidebar aside panel */}
      <aside
        className={`sidebar  ${mobileOpen ? 'mobile-open' : ''}`}
        id="sidebar"
        aria-label="Main navigation"
      >
        {/* Logo and collapse toggle */}
        <div className="sb-logo">
          <div className="sb-logo-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <span className="logo-text sb-label">
            MY<span className="hl">VAGON</span>
          </span>

          {/* <button
            id="sidebarCollapseBtn"
            aria-label="Toggle sidebar"
            onClick={onToggleCollapse}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,.35)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color .15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button> */}
        </div>

        {/* Navigation list */}
        <nav className="sb-nav">
          <Link
            to="/dashboard"
            onClick={onCloseMobile}
            className={`nav-item ${isLinkActive('/dashboard', true) ? 'active' : ''}`}
            title={t('dashboard')}
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
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="sb-label">{t('dashboard')}</span>
          </Link>

          <Link
            to="/shipments/create"
            onClick={onCloseMobile}
            className={`nav-item ${isLinkActive('/shipments/create') ? 'active' : ''}`}
            title={t('createShipment')}
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
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="sb-label">{t('createShipment')}</span>
          </Link>

          <Link
            to="/shipments"
            onClick={onCloseMobile}
            className={`nav-item ${isLinkActive('/shipments') ? 'active' : ''}`}
            title={t('manageShipments')}
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
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            <span className="sb-label">{t('manageShipments')}</span>
            <span className="nav-badge">12</span>
          </Link>

          <a
            href="#search"
            className="nav-item"
            title={t('searchTrucks')}
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
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="sb-label">{t('searchTrucks')}</span>
          </a>

          <a
            href="#analytics"
            className="nav-item"
            title={lang === 'el' ? 'Αναλυτικά στοιχεία' : 'Analytics'}
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
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <span className="sb-label">{lang === 'el' ? 'Αναλύσεις' : 'Analytics'}</span>
          </a>

          <div className="sb-section sb-label">{lang === 'el' ? 'Βασικά' : 'Master'}</div>

          <Link
            to="/address-book"
            onClick={onCloseMobile}
            className={`nav-item ${isLinkActive('/address-book') ? 'active' : ''}`}
            title={t('addressBook')}
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
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <span className="sb-label">{t('addressBook')}</span>
          </Link>

          <Link
            to="/products"
            onClick={onCloseMobile}
            className={`nav-item ${isLinkActive('/products') ? 'active' : ''}`}
            title={t('products')}
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
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
            <span className="sb-label">{t('products')}</span>
          </Link>

          <a
            href="#partners"
            className="nav-item"
            title={t('partners')}
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
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span className="sb-label">{t('partners')}</span>
          </a>

          <a
            href="#pricelists"
            className="nav-item"
            title={lang === 'el' ? 'Τιμοκατάλογοι' : 'Price Lists'}
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
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <span className="sb-label">{lang === 'el' ? 'Τιμοκατάλογοι' : 'Price Lists'}</span>
          </a>

          <a
            href="#erp-orders"
            className="nav-item"
            title={lang === 'el' ? 'Παραγγελίες ERP' : 'ERP Orders'}
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="sb-label">{lang === 'el' ? 'Παραγγελίες ERP' : 'ERP Orders'}</span>
          </a>

          <div className="sb-section sb-label">{lang === 'el' ? 'Επικοινωνία' : 'Communication'}</div>

          <a
            href="#messages"
            className="nav-item"
            title={lang === 'el' ? 'Μηνύματα' : 'Messages'}
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
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="sb-label">{lang === 'el' ? 'Μηνύματα' : 'Messages'}</span>
            <span className="nav-badge">3</span>
          </a>

          <a
            href="#referral"
            className="nav-item"
            title={lang === 'el' ? 'Σύσταση' : 'Referral'}
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
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="sb-label">{lang === 'el' ? 'Συστάσεις' : 'Referral'}</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <a
            href="#settings"
            className="nav-item"
            title={lang === 'el' ? 'Ρυθμίσεις' : 'Settings'}
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="sb-label">{lang === 'el' ? 'Ρυθμίσεις' : 'Settings'}</span>
          </a>
          <a
            href="#help"
            className="nav-item"
            title={t('help')}
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
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="sb-label">{t('help')}</span>
          </a>

          {/* User info */}
          {/* <div className="nav-item" style={{ marginTop: '4px', cursor: 'default' }} title="Acme Logistics">
            <div className="avatar avatar-sm" style={{ background: '#4B4B5A' }} aria-hidden="true">
              AL
            </div>
            <div className="sb-label" style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,.85)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Acme Logistics
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>
                {lang === 'el' ? 'Φορτωτής' : 'Shipper'}
              </div>
            </div>
          </div> */}
        </div>
      </aside>
    </>
  );
};
