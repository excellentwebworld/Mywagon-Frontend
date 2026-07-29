import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ProfileDropdown } from './ProfileDropdown';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  isDesktop: boolean;
  navMode?: 'sidebar' | 'top';
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  isDesktop,
  navMode = 'sidebar',
}) => {
  const { setLang, showToast } = useApp();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useOutsideClick<HTMLDivElement>(() => setNotifOpen(false), notifOpen);
  const [activePeriod, setActivePeriod] = useState<'today' | '7d' | '30d' | 'quarter' | 'ytd'>('today');

  const isSideMode = navMode !== 'top';
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isMaster = ['/address-book', '/products', '/partners', '/erp-orders'].includes(location.pathname);

  const showFilters = isDashboard;
  const showSearch = isDashboard;
  const showCta = !isMaster && location.pathname !== '/shipments/create';
  const isShipmentsList =
    location.pathname === '/shipments' || location.pathname === '/shipments/';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return t('dashboard');
    if (path.startsWith('/shipments/create')) return t('createShipment');
    if (path.startsWith('/shipments')) return t('manageShipments');
    if (path.startsWith('/search-trucks')) return t('satPageTitle') || t('searchTrucks');
    if (path.startsWith('/address-book')) return t('addressBook');
    if (path.startsWith('/products')) return t('products');
    if (path.startsWith('/partners')) return t('partners');
    if (path.startsWith('/erp-orders')) return t('erpOrders') || 'ERP Orders';
    if (path.startsWith('/settings')) return t('settings.title') || t('settings');
    if (path.startsWith('/billing')) return t('sidebar.billing') || t('billing');
    if (path.startsWith('/subscription')) return t('sidebar.subscription') || t('navSubscription');
    if (path.startsWith('/support')) return t('sidebar.support') || t('support');
    if (path.startsWith('/trust')) return t('settings.securityTrust') || 'Security & Trust';
    return t('portal');
  };

  return (
    <header className="topbar" role="banner">
      {isDesktop && isSideMode && (
        <button
          type="button"
          className="btn btn-ghost btn-icon sidebar-toggle-btn"
          onClick={onToggleSidebarCollapse}
          aria-label={sidebarCollapsed ? t('navExpandMenu') : t('navCollapseMenu')}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? t('navExpandMenu') : t('navCollapseMenu')}
        >
          <svg
            style={{ height: '22px', width: '22px' }}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      )}

      {!isDesktop && isSideMode && (
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
      )}

      <span className="tb-title">{getPageTitle()}</span>

      {showFilters && (
        <div className="tb-filters" role="group" aria-label="Quick filters">
          {([
            ['today', 'today'],
            ['7d', 'sevenDays'],
            ['30d', 'thirtyDays'],
            ['quarter', 'quarter'],
            ['ytd', 'ytd'],
          ] as const).map(([key, labelKey]) => (
            <button
              key={key}
              type="button"
              className={`tb-chip ${activePeriod === key ? 'active' : ''}`}
              onClick={() => setActivePeriod(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}

      {!showSearch && <span className="sp" style={{ flex: 1 }} />}

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

      <div className="tb-right">
        <div className="lang-toggle" id="langToggle" role="group" aria-label="Language selector">
          <button type="button" className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
            EN
          </button>
          <button type="button" className={`lang-btn ${lang === 'el' ? 'active' : ''}`} onClick={() => setLang('el')}>
            EL
          </button>
        </div>

        <div ref={notifRef} className="dropdown" style={{ position: 'relative' }}>
          <button
            type="button"
            className="tb-btn tb-notif"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
            aria-haspopup="true"
            title="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="tb-notif-dot" aria-label="3 unread notifications" />
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
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('notifications')}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    padding: '1px 7px',
                    borderRadius: '99px',
                  }}
                >
                  3 {t('new')}
                </span>
              </div>
              <div
                className="dropdown-item"
                role="menuitem"
                onClick={() => showToast(t('openingNotifications'), 'info')}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t('notifBidReceived')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>2m ago</div>
                </div>
              </div>
              <div
                className="dropdown-item"
                role="menuitem"
                onClick={() => showToast(t('openingNotifications'), 'info')}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t('notifShipmentUpdate')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>1h ago</div>
                </div>
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  borderTop: '1px solid var(--border)',
                }}
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

        <ProfileDropdown />

        {showCta && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/shipments/create')}
            style={{ whiteSpace: 'nowrap' }}
          >
            + {isShipmentsList ? t('newShipment') || 'New shipment' : t('createShipment')}
          </button>
        )}
      </div>
    </header>
  );
};
