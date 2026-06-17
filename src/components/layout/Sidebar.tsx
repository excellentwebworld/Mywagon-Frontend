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
  const { lang } = useApp();

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
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        id="sidebar"
        aria-label="Main navigation"
      >
        {/* Logo and branding */}
        <div className="sb-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#6C3AED" />
            <path
              d="M7 18V10l4 8 4-8v8M19 10h4l-4 8h4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            MY<span className="hl">VAGON</span>
          </span>
        </div>

        {/* Navigation list */}
        <nav className="sb-nav">
          <Link
            to="/dashboard"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive('/dashboard', true) ? 'active' : ''}`}
            title={lang === 'el' ? 'Ταμπλό' : 'Dashboard'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>{lang === 'el' ? 'Ταμπλό' : 'Dashboard'}</span>
          </Link>

          <Link
            to="/shipments/create"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive('/shipments/create') ? 'active' : ''}`}
            title={lang === 'el' ? 'Δημιουργία φορτίου' : 'Create Shipment'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 20V10M18 20V4M6 20v-4" />
            </svg>
            <span>{lang === 'el' ? 'Δημιουργία φορτίου' : 'Create Shipment'}</span>
          </Link>

          <Link
            to="/shipments"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive('/shipments') ? 'active' : ''}`}
            title={lang === 'el' ? 'Διαχείριση Αποστολών' : 'Manage Shipments'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>{lang === 'el' ? 'Διαχείριση Αποστολών' : 'Manage Shipments'}</span>
            <span className="nb">5</span>
          </Link>

          <a
            href="#search"
            className="ni"
            title={lang === 'el' ? 'Διαθεσιμότητα φορτηγών' : 'Truck Availability'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>{lang === 'el' ? 'Διαθεσιμότητα φορτηγών' : 'Truck Availability'}</span>
            <span className="nb" style={{ background: '#0EA5E9' }}>
              BETA
            </span>
          </a>

          <div className="ns">{lang === 'el' ? 'ΜΗΤΡΩΟ' : 'REGISTRY'}</div>

          <Link
            to="/address-book"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive('/address-book') ? 'active' : ''}`}
            title={lang === 'el' ? 'Βιβλίο διευθύνσεων' : 'Address Book'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{lang === 'el' ? 'Βιβλίο διευθύνσεων' : 'Address Book'}</span>
          </Link>

          <Link
            to="/products"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive('/products') ? 'active' : ''}`}
            title={lang === 'el' ? 'Μητρώο προϊόντων' : 'Product Master'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span>{lang === 'el' ? 'Μητρώο προϊόντων' : 'Product Master'}</span>
          </Link>

          <a
            href="#partners"
            className="ni"
            title={lang === 'el' ? 'Συνεργαζόμενοι' : 'Partners'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{lang === 'el' ? 'Συνεργαζόμενοι' : 'Partners'}</span>
          </a>

          <div className="ns">{lang === 'el' ? 'ΑΝΑΛΥΤΙΚΑ' : 'ANALYTICS'}</div>

          <a
            href="#reports"
            className="ni"
            title={lang === 'el' ? 'Αναφορές & Insights' : 'Reports & Insights'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 20V10M12 20V4M6 20v-8" />
            </svg>
            <span>{lang === 'el' ? 'Αναφορές & Insights' : 'Reports & Insights'}</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="sb-ft">
          <a
            href="#settings"
            className="ni"
            title={lang === 'el' ? 'Ρυθμίσεις' : 'Settings'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>{lang === 'el' ? 'Ρυθμίσεις' : 'Settings'}</span>
          </a>
          <a
            href="#help"
            className="ni"
            title={lang === 'el' ? 'Βοήθεια' : 'Help'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{lang === 'el' ? 'Βοήθεια' : 'Help'}</span>
          </a>
        </div>
      </aside>
    </>
  );
};
