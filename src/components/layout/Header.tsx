/**
 * Header — matches MV_Web_Panel TopBar layout:
 * [Logo?] Title | Search …… | Vagon AI | Bell | Messages | Profile | CTA | Trust
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Sparkles,
  MessageSquare,
  Plus,
  ShieldCheck,
  Bell,
  Menu,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../hooks/useTheme';
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
  const { showToast } = useApp();
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchValue, setSearchValue] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useOutsideClick<HTMLDivElement>(() => setNotifOpen(false), notifOpen);

  const isSideMode = navMode !== 'top';
  const showCta = location.pathname !== '/shipments/create';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return t('dashboard');
    if (path.startsWith('/shipments/create')) return t('createShipment');
    if (path.startsWith('/shipments')) return t('manageShipments');
    if (path.startsWith('/search-trucks')) return t('satPageTitle') || t('truckAvailability') || 'Search Trucks';
    if (path.startsWith('/address-book')) return t('addressBook');
    if (path.startsWith('/products')) return t('products');
    if (path.startsWith('/partners')) return t('partners');
    if (path.startsWith('/erp-orders')) return t('erpOrders') || 'ERP Orders';
    if (path.startsWith('/settings/trustCenter')) return t('settings.securityTrust') || 'Security & Trust';
    if (path.startsWith('/settings')) return t('settings.title') || 'Settings';
    if (path.startsWith('/billing')) return t('sidebar.billing') || t('billing');
    if (path.startsWith('/subscription')) return t('sidebar.subscription') || t('navSubscription');
    if (path.startsWith('/support')) return t('sidebar.support') || t('support');
    if (path.startsWith('/tutorials')) return t('tutorials.pageTitle') || t('tutorial');
    if (path.startsWith('/trust')) return t('settings.securityTrust') || 'Security & Trust';
    return t('dashboard');
  };

  return (
    <header
      className="mv-topbar"
      role="banner"
      style={{
        height: 52,
        background: `${T.sf}E6`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.bd}`,
      }}
    >
      {/* Sidebar toggles */}
      {isDesktop && isSideMode && (
        <button
          type="button"
          className="mv-topbar-icon-btn"
          onClick={onToggleSidebarCollapse}
          aria-label={sidebarCollapsed ? t('navExpandMenu') : t('navCollapseMenu')}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? t('navExpandMenu') : t('navCollapseMenu')}
          style={{ color: T.t2 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.sa;
            e.currentTarget.style.color = T.t1;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = T.t2;
          }}
        >
          <Menu size={20} />
        </button>
      )}

      {!isDesktop && isSideMode && (
        <button
          type="button"
          className="mv-topbar-icon-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation"
          style={{ color: T.t2 }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Logo — top nav mode only */}
      {!isSideMode && (
        <>
          <button
            type="button"
            className="mv-topbar-logo"
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span className="font-bold" style={{ fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
              <span style={{ color: T.t3 }}>MY</span>
              <span style={{ color: T.t1 }}>VAGON</span>
            </span>
          </button>
          <div style={{ width: 1, height: 22, background: T.bd, flexShrink: 0 }} />
        </>
      )}

      {/* Page title */}
      <h1
        className="mv-topbar-title"
        style={{ fontSize: 14, fontWeight: 600, color: T.t1, margin: 0 }}
      >
        {getPageTitle()}
      </h1>

      {/* Search — always visible like React TopBar */}
      <div
        className="mv-topbar-search"
        style={{ background: T.sa, border: `1px solid ${T.bd}`, height: 34 }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = T.ac;
          e.currentTarget.style.boxShadow = `0 0 0 2px ${T.ac}18`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = T.bd;
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Search size={15} style={{ color: T.t3, flexShrink: 0 }} />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t('topbar.search') || 'Search anything..'}
          aria-label={t('topbar.search') || 'Search'}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 12,
            color: T.t1,
            minWidth: 0,
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Vagon AI */}
      <button
        type="button"
        onClick={() => showToast(t('vagonai.title') || 'Vagon AI', 'info')}
        aria-label={t('vagonai.title') || 'Vagon AI'}
        className="mv-topbar-ai"
        style={{
          background: `linear-gradient(135deg, ${T.grad1}, ${T.grad2})`,
          boxShadow: `0 2px 8px ${T.ac}33`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = `0 4px 14px ${T.ac}44`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `0 2px 8px ${T.ac}33`;
        }}
      >
        <Sparkles size={14} />
        <span className="mv-topbar-ai-label">{t('vagonai.title') || 'Vagon AI'}</span>
      </button>

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="mv-topbar-icon-btn"
          onClick={() => setNotifOpen(!notifOpen)}
          aria-label={t('topbar.notifications') || t('notifications')}
          aria-expanded={notifOpen}
          style={{ color: T.t2 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.sa;
            e.currentTarget.style.color = T.t1;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = T.t2;
          }}
        >
          <Bell size={18} />
          <span
            className="mv-topbar-dot"
            style={{ background: '#EF4444' }}
            aria-label="Unread notifications"
          />
        </button>

        {notifOpen && (
          <div
            className="mv-topbar-panel"
            role="menu"
            style={{ background: T.sf, border: `1px solid ${T.bd}` }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderBottom: `1px solid ${T.bd}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
                {t('notifications')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#FEF2F2',
                  color: '#EF4444',
                  padding: '1px 7px',
                  borderRadius: 99,
                }}
              >
                3 {t('new') || 'new'}
              </span>
            </div>
            {[
              { title: t('notifBidReceived') || 'New bid received', time: '2m ago' },
              { title: t('notifShipmentUpdate') || 'Shipment updated', time: '1h ago' },
            ].map((n) => (
              <button
                type="button"
                key={n.title}
                className="mv-topbar-panel-item"
                style={{ color: T.t1 }}
                onClick={() => {
                  setNotifOpen(false);
                  showToast(t('openingNotifications') || 'Notifications', 'info');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.sa;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: T.t3 }}>{n.time}</div>
              </button>
            ))}
            <button
              type="button"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderTop: `1px solid ${T.bd}`,
                background: 'transparent',
                color: T.ac,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                setNotifOpen(false);
                showToast(t('viewAllNotifications') || 'View all', 'info');
              }}
            >
              {t('viewAllNotifications') || 'View all notifications'}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <button
        type="button"
        className="mv-topbar-icon-btn"
        onClick={() => navigate('/support')}
        aria-label={t('topbar.messages') || 'Messages'}
        style={{ color: T.t2, position: 'relative' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = T.sa;
          e.currentTarget.style.color = T.t1;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = T.t2;
        }}
      >
        <MessageSquare size={18} />
        <span className="mv-topbar-dot" style={{ background: '#EF4444' }} />
      </button>

      {/* Profile dropdown */}
      <ProfileDropdown />

      {/* CTA */}
      {showCta && (
        <button
          type="button"
          onClick={() => navigate('/shipments/create')}
          aria-label={t('createShipment')}
          className="mv-topbar-cta"
          style={{
            background: T.ac,
            boxShadow: `0 2px 8px ${T.ac}40`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 4px 14px ${T.ac}55`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 2px 8px ${T.ac}40`;
          }}
        >
          <Plus size={16} className="mv-topbar-cta-icon" />
          <span className="mv-topbar-cta-label">
            + {t('newShipment') || t('createShipment') || 'New shipment'}
          </span>
        </button>
      )}

      {/* Trust shield */}
      <button
        type="button"
        onClick={() => navigate('/settings/trustCenter')}
        aria-label={t('settings.securityTrust') || 'Security & Trust'}
        title={t('settings.securityTrust') || 'Security & Trust'}
        className="mv-topbar-icon-btn"
        style={{ color: T.t2, position: 'relative' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = T.sa;
          e.currentTarget.style.color = T.t1;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = T.t2;
        }}
      >
        <ShieldCheck size={18} />
        <span
          className="mv-topbar-dot"
          style={{ background: '#10B981', boxShadow: '0 0 4px #10B981', top: 6, right: 6 }}
        />
      </button>
    </header>
  );
};
