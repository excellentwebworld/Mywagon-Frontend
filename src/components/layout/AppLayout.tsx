import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { useLoader } from '../../context/LoaderContext';
import { GlobalLoader } from '../ui/GlobalLoader';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast } = useApp();
  const { visible: loaderVisible } = useLoader();

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <GlobalLoader visible={loaderVisible} />
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <Header onToggleMobileMenu={() => setMobileMenuOpen(true)} />

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
