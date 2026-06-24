import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { DESKTOP_SIDEBAR_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

const SIDEBAR_COLLAPSED_KEY = 'shipper-sidebar-collapsed';

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
  const { toast } = useApp();

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

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className={`main-content${isSidebarCollapsed ? ' expanded' : ''}`}>
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          sidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          isDesktop={isDesktop}
        />

        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast ${toast.type} show`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-text">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
