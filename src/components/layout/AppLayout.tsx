import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TopNav } from './TopNav';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { UserMgmtProvider } from '../../context/UserMgmtContext';
import { DESKTOP_SIDEBAR_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

const SIDEBAR_COLLAPSED_KEY = 'shipper-sidebar-collapsed';

const TOAST_ICON = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
} as const;

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const isDesktop = useMediaQuery(DESKTOP_SIDEBAR_QUERY);
  const isSidebarCollapsed = sidebarCollapsed && isDesktop;
  const { toast, hideToast } = useApp();
  const { navMode } = useTheme();
  const isSideMode = navMode !== 'top';

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (isDesktop) {
      setMobileMenuOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop && mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    document.body.style.overflow = '';
    return undefined;
  }, [isDesktop, mobileMenuOpen]);

  const toggleSidebarCollapse = () => setSidebarCollapsed((prev) => !prev);
  const ToastIcon = TOAST_ICON[toast.type] || Info;

  return (
    <UserMgmtProvider>
    <div className={`app-layout${isSideMode ? '' : ' app-layout--top-nav'}`}>
      {isSideMode && (
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={`main-content${isSidebarCollapsed && isSideMode ? ' expanded' : ''}${
          !isSideMode ? ' main-content--top-nav' : ''
        }`}
      >
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          sidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          isDesktop={isDesktop}
          navMode={isSideMode ? 'sidebar' : 'top'}
        />

        {!isSideMode && <TopNav />}

        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {toast.show && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className={`toast ${toast.type} show`}>
            <span className="toast-icon" aria-hidden>
              <ToastIcon size={18} strokeWidth={2} />
            </span>
            <span className="toast-text">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Close"
              onClick={hideToast}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
    </UserMgmtProvider>
  );
};
