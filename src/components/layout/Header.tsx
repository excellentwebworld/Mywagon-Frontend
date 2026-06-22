import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { setLang, showToast } = useApp();
  const { t, lang } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Dropdown States
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useOutsideClick<HTMLDivElement>(() => setNotifOpen(false), notifOpen);
  const userRef = useOutsideClick<HTMLDivElement>(() => setUserOpen(false), userOpen);
  const [activePeriod, setActivePeriod] = useState<'today' | '7d' | '30d' | 'quarter' | 'ytd'>('today');
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isDashboard = location.pathname.startsWith('/dashboard');
  const isMaster = ['/address-book', '/products', '/partners', '/erp-orders'].includes(location.pathname);

  const displayCompany = user?.company_name || t('shipper');
  const displayEmail = user?.email || '';
  const avatarInitials = user
    ? `${(user.first_name?.[0] ?? '').toUpperCase()}${(user.last_name?.[0] ?? '').toUpperCase()}`.trim() || 'SV'
    : lang === 'el'
      ? 'ΗΒ'
      : 'AL';

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      setSignOutConfirmOpen(false);
      navigate('/login');
    } catch {
      showToast(t('failedToLogout') || 'Failed to logout', 'error');
    } finally {
      setIsSigningOut(false);
    }
  };

  const showFilters = isDashboard;
  const showSearch = isDashboard;
  const showCta = !isMaster && location.pathname !== '/shipments/create';

  // Breadcrumbs title mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return t('dashboard');
    if (path.startsWith('/shipments/create')) return t('createShipment');
    if (path.startsWith('/shipments')) return t('manageShipments');
    if (path.startsWith('/address-book')) return t('addressBook');
    if (path.startsWith('/products')) return t('products');
    if (path.startsWith('/partners')) return t('partners');
    if (path.startsWith('/erp-orders')) return t('erpOrders') || 'ERP Orders';
    return t('portal');
  };

  return (
    <header className="topbar" role="banner">
      {/* Mobile hamburger menu */}
      <button
        id="mobileMenuBtn"
        aria-label="Open navigation"
        onClick={onToggleMobileMenu}
        className="btn btn-ghost btn-icon mobile-menu-toggle"
        style={{ color: 'var(--text-secondary)' }}
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
      {
        isDashboard ?
          <span className="tb-title">{getPageTitle()}</span>
          :
          <div className='breadcrumb'>
            <span>
              {t('masterData')}
            </span>{" "}
            › <strong>
              {getPageTitle()}
            </strong>
          </div>
      }

      {/* Quick period filter chips */}
      {showFilters && (
        <div className="tb-filters" role="group" aria-label="Quick filters">
          <button
            className={`tb-chip ${activePeriod === 'today' ? 'active' : ''}`}
            onClick={() => setActivePeriod('today')}
          >
            {t('today')}
          </button>
          <button
            className={`tb-chip ${activePeriod === '7d' ? 'active' : ''}`}
            onClick={() => setActivePeriod('7d')}
          >
            {t('sevenDays')}
          </button>
          <button
            className={`tb-chip ${activePeriod === '30d' ? 'active' : ''}`}
            onClick={() => setActivePeriod('30d')}
          >
            {t('thirtyDays')}
          </button>
          <button
            className={`tb-chip ${activePeriod === 'quarter' ? 'active' : ''}`}
            onClick={() => setActivePeriod('quarter')}
          >
            {t('quarter')}
          </button>
          <button
            className={`tb-chip ${activePeriod === 'ytd' ? 'active' : ''}`}
            onClick={() => setActivePeriod('ytd')}
          >
            {t('ytd')}
          </button>
        </div>
      )}

      {/* Spacer to push right content to the edge when search is hidden */}
      {!showSearch && <span className="sp" style={{ flex: 1 }} />}

      {/* Search Bar */}
      {showSearch && (
        <div className="tb-search">
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
          <input
            type="text"
            id="searchInput"
            placeholder={t('searchPlaceholderHeader')}
            aria-label="Search shipments"
          />
        </div>
      )}

      {/* Right controls */}
      <div className="tb-right">
        {/* Language Toggle */}
        <div className="lang-toggle" id="langToggle" role="group" aria-label="Language selector">
          <button
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            className={`lang-btn ${lang === 'el' ? 'active' : ''}`}
            onClick={() => setLang('el')}
          >
            EL
          </button>
        </div>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="dropdown" style={{ position: 'relative' }}>
          <button
            className="tb-btn tb-notif"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setUserOpen(false);
            }}
            aria-label="Notifications"
            aria-haspopup="true"
            title="Notifications"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="tb-notif-dot" aria-label="3 unread notifications"></span>
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
                  {t('notifications')}
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
                  {t('threeNew')}
                </span>
              </div>
              <div
                className="dropdown-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
                role="menuitem"
              >
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {t('notifNewBid')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {t('notifTwoMinAgo')}
                </span>
              </div>
              <div
                className="dropdown-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
                role="menuitem"
              >
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {t('notifDelivered')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {t('notifThirtyEightMin')}
                </span>
              </div>
              <div
                className="dropdown-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
                role="menuitem"
              >
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {t('notifPayment')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {t('notifOneHour')}
                </span>
              </div>
              <div className="dropdown-divider"></div>
              <div
                className="dropdown-item"
                style={{ justifyContent: 'center', color: 'var(--accent)', fontWeight: 600 }}
                role="menuitem"
                onClick={() => {
                  setNotifOpen(false);
                  showToast(t('openingNotifications'), 'info');
                }}
              >
                {t('viewAllNotifications')}
              </div>
            </div>
          )}
        </div>

        {/* User profile avatar / dropdown */}
        <div ref={userRef} className="dropdown" style={{ position: 'relative' }}>
          <button
            className="tb-avatar"
            onClick={() => {
              setUserOpen(!userOpen);
              setNotifOpen(false);
            }}
            aria-label="User menu"
            aria-haspopup="true"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            {avatarInitials}
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
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {displayCompany}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                  {displayEmail}
                </div>
              </div>
              <div
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false);
                  showToast(t('openingProfile'), 'info');
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
                {t('profile')}
              </div>
              <div
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false);
                  showToast(t('openingSettings'), 'info');
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
                {t('settings')}
              </div>
              <div className="dropdown-divider"></div>
              <div
                className="dropdown-item danger"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false);
                  setSignOutConfirmOpen(true);
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
                {t('signOut')}
              </div>
            </div>
          )}
        </div>

        {/* New Shipment CTA Button */}
        {showCta && (
          <button
            className="btn-cta"
            onClick={() => navigate('/shipments/create')}
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
        )}
      </div>

      <ConfirmationModal
        isOpen={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        onConfirm={confirmSignOut}
        title={t('signOutConfirmTitle')}
        type="danger"
        confirmText={t('signOut')}
        cancelText={t('cancel')}
        confirmLoading={isSigningOut}
        message={
          <>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {t('signOutConfirmQuestion')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
              {t('signOutConfirmWarning')}
            </p>
          </>
        }
      />
    </header>
  );
};

