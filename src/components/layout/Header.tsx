/**
 * Header — matches MV_Web_Panel TopBar layout:
 * [Logo?] Title | Search …… | Vagon AI | Bell | Messages | Profile | CTA | Trust
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Sparkles,
  MessageSquare,
  Plus,
  ShieldCheck,
  Bell,
  Menu,
  Play,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { usePastDueLock } from '../../hooks/usePastDueLock';
import { useRequireSignupComplete } from '../../hooks/useRequireSignupComplete';
import { ProfileDropdown } from './ProfileDropdown';
import { notificationService } from '../../api/services/notificationService';
import type { ApiNotification } from '../../api/services/notificationService';
import { chatService } from '../../api/services/chatService';
import { socketService } from '../../services/socketService';
import { CHAT_MESSAGE_RECEIVED_EVENT } from '../../hooks/useGlobalChatSocket';
import { getActiveChatPartner } from '../../utils/chatNotificationGuard';
import { isMessageFromPartner } from '../../utils/chatPartnerUtils';
import { openNotificationTarget } from '../../utils/notificationNavigation';


interface HeaderProps {
  onToggleMobileMenu?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  isDesktop?: boolean;
  navMode?: 'sidebar' | 'top';
}

function formatRelativeTime(created_at?: string, fallback = ''): string {
  if (!created_at) return fallback;
  try {
    const d = new Date(created_at);
    if (isNaN(d.getTime())) return fallback;
    const now = new Date();
    const diff = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));

    if (diff < 45) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return fallback;
  }
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  sidebarCollapsed = false,
  onToggleSidebarCollapse,
  isDesktop = true,
  navMode = 'sidebar',
}) => {

  const { showToast } = useApp();
  const { t, lang } = useTranslation();
  const { T } = useTheme();
  const { requireSignupComplete } = useRequireSignupComplete();

  const navigate = useNavigate();
  const location = useLocation();
  const pastDueLocked = usePastDueLock();

  const [searchValue, setSearchValue] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [headerNotifs, setHeaderNotifs] = useState<ApiNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);
  const notifRef = useOutsideClick<HTMLDivElement>(() => setNotifOpen(false), notifOpen);

  // Fetch unread messages count once; live updates come from the socket.
  useEffect(() => {
    chatService.getUnreadCount().then((count) => {
      setUnreadMessages(count);
    });

    const onChatReceived = (event: Event) => {
      const detail = (event as CustomEvent<{ senderId: number; senderType: string }>).detail;
      if (!detail) return;

      const active = getActiveChatPartner();
      const isViewingThread =
        active &&
        isMessageFromPartner(detail.senderId, detail.senderType, active.partnerId, active.partnerType);

      if (!isViewingThread) {
        setUnreadMessages((prev) => prev + 1);
      }
    };

    window.addEventListener(CHAT_MESSAGE_RECEIVED_EVENT, onChatReceived as EventListener);

    const unsubscribeRead = socketService.onRead(() => {
      setUnreadMessages(0);
    });

    return () => {
      window.removeEventListener(CHAT_MESSAGE_RECEIVED_EVENT, onChatReceived as EventListener);
      unsubscribeRead();
    };
  }, []);

  const loadUnreadCount = () => {
    notificationService.unreadCount()
      .then((count) => setUnreadCount(count))
      .catch(() => {});
  };

  const loadHeaderNotificationList = () => {
    setLoadingNotifs(true);
    notificationService.list({ tab: 'inbox', per_page: 5 })
      .then((res) => {
        setHeaderNotifs(res.data);
      })
      .catch(() => {
        setHeaderNotifs([]);
      })
      .finally(() => {
        setLoadingNotifs(false);
      });
  };

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (notifOpen) {
      loadUnreadCount();
      loadHeaderNotificationList();
    }
  }, [notifOpen]);

  useEffect(() => {
    const handlePushReceived = () => {
      loadUnreadCount();
      if (notifOpen) {
        loadHeaderNotificationList();
      }
    };

    window.addEventListener('shipper:notification-received', handlePushReceived);
    return () => {
      window.removeEventListener('shipper:notification-received', handlePushReceived);
    };
  }, [notifOpen]);



  const showTopSearch = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    if (!showTopSearch) {
      setSearchValue('');
    }
  }, [showTopSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      navigate(`/support?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const isSideMode = navMode !== 'top';
  const showCta = location.pathname !== '/shipments/create' && !pastDueLocked;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return t('dashboard');
    if (path.startsWith('/settings/notifications') || path.startsWith('/notifications')) return t('notifications') || 'Notifications';
    if (path.startsWith('/messages')) return t('navMessages') || 'Messages';
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

      {showTopSearch && (
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
            onKeyDown={handleSearchKeyDown}
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
      )}

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

      {/* Tutorials — play icon only (replaces Refer & Earn in the top bar) */}
      <button
        type="button"
        onClick={() => navigate(pastDueLocked ? '/billing' : '/tutorials')}
        aria-label={t('tutorial') || 'Tutorials'}
        title={t('tutorial') || 'Tutorials'}
        data-tour="tutorials"
        className="mv-topbar-icon-btn"
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
        <Play size={18} fill="currentColor" />
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
          {unreadCount > 0 && (
            <span
              className="mv-topbar-dot"
              style={{ background: '#EF4444' }}
              aria-label={`${unreadCount} unread notifications`}
            />
          )}
        </button>

        {notifOpen && (
          <div
            className="mv-topbar-panel"
            role="menu"
            style={{
              background: T.sf,
              border: `1px solid ${T.bd}`,
              width: 360,
              maxHeight: 460,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 12,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${T.bd}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                background: T.sf,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                  {t('notifications') || 'Notifications'}
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#FEF2F2',
                      color: '#EF4444',
                      padding: '2px 8px',
                      borderRadius: 99,
                      border: '1px solid #FECACA',
                    }}
                  >
                    {unreadCount} {t('new') || 'new'}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await notificationService.markAllRead();
                      setUnreadCount(0);
                      setHeaderNotifs((prev) => prev.map((item) => ({ ...item, read: true })));
                      showToast(lang === 'el' ? 'Σημειώθηκαν όλα ως αναγνωσμένα' : 'Marked all as read', 'success');
                    } catch {
                      showToast('Failed to mark all as read', 'error');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.ac,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {lang === 'el' ? 'Σήμανση όλων' : 'Mark all as read'}
                </button>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {loadingNotifs ? (
                <div style={{ padding: '8px 16px' }}>
                  {[1, 2, 3].map((k) => (
                    <div
                      key={k}
                      style={{
                        padding: '12px 0',
                        borderBottom: k < 3 ? `1px solid ${T.bd}33` : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div
                          style={{
                            height: 13,
                            width: '60%',
                            background: T.sa,
                            borderRadius: 4,
                            animation: 'pulse 1.5s infinite ease-in-out',
                          }}
                        />
                        <div
                          style={{
                            height: 10,
                            width: '20%',
                            background: T.sa,
                            borderRadius: 4,
                            animation: 'pulse 1.5s infinite ease-in-out',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          height: 11,
                          width: '90%',
                          background: T.sa,
                          borderRadius: 4,
                          opacity: 0.8,
                          animation: 'pulse 1.5s infinite ease-in-out',
                        }}
                      />
                      <div
                        style={{
                          height: 11,
                          width: '75%',
                          background: T.sa,
                          borderRadius: 4,
                          opacity: 0.7,
                          animation: 'pulse 1.5s infinite ease-in-out',
                        }}
                      />
                      <div
                        style={{
                          height: 16,
                          width: 54,
                          background: T.sa,
                          borderRadius: 4,
                          marginTop: 2,
                          animation: 'pulse 1.5s infinite ease-in-out',
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : headerNotifs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Bell size={24} style={{ color: T.t3, margin: '0 auto 8px', opacity: 0.6 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
                    {lang === 'el' ? 'Δεν υπάρχουν ειδοποιήσεις' : 'No notifications'}
                  </div>
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
                    {lang === 'el' ? 'Είστε πλήρως ενημερωμένοι!' : "You're all caught up!"}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '4px 0' }}>
                  {headerNotifs.map((n) => {
                    return (
                      <button
                        type="button"
                        key={n.id}
                        className="mv-topbar-panel-item"
                        style={{
                          color: T.t1,
                          padding: '10px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 4,
                          background: !n.read ? `${T.ac}08` : 'transparent',
                          borderLeft: !n.read ? `3px solid ${T.ac}` : '3px solid transparent',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${T.bd}33`,
                        }}
                        onClick={() => {
                          if (!n.read) {
                            void notificationService.markRead(n.id).catch(() => {});
                            setUnreadCount((c) => Math.max(0, c - 1));
                          }
                          setNotifOpen(false);
                          openNotificationTarget(n, navigate);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = T.sa;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = !n.read ? `${T.ac}08` : 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: !n.read ? 700 : 500, color: T.t1, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {n.title}
                          </span>
                          <span style={{ fontSize: 11, color: T.t3, flexShrink: 0 }}>
                            {n.relative_time || formatRelativeTime(n.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {n.body}
                        </div>
                        {n.chips && n.chips.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                            {n.chips.map((chip) => (
                              <span
                                key={chip}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: T.sa,
                                  color: T.ac,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <button
              type="button"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderTop: `1px solid ${T.bd}`,
                background: T.sf,
                color: T.ac,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'block',
                flexShrink: 0,
              }}
              onClick={() => {
                setNotifOpen(false);
                navigate('/settings/notifications');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.sa;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.sf;
              }}
            >
              {lang === 'el' ? 'Δείτε όλες τις ειδοποιήσεις →' : 'View all notifications →'}
            </button>
          </div>
        )}


      </div>

      {/* Messages */}
      <button
        type="button"
        className="mv-topbar-icon-btn"
        onClick={() => navigate(pastDueLocked ? '/billing' : '/messages')}
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
        {unreadMessages > 0 && (
          <span className="mv-topbar-dot" style={{ background: '#EF4444' }} />
        )}
      </button>

      {/* Profile dropdown */}
      <ProfileDropdown />

      {/* CTA */}
      {showCta && (
        <button
          type="button"
          onClick={() => {
            if (!requireSignupComplete()) return;
            navigate('/shipments/create');
          }}
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
            {t('newShipment') || t('createShipment') || 'New shipment'}
          </span>
        </button>
      )}

      {/* Trust shield */}
      <button
        type="button"
        onClick={() => navigate(pastDueLocked ? '/billing' : '/settings/trustCenter')}
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
