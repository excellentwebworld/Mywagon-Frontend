import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { assetUrl } from "../../utils/assetUrl";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { t } = useTranslation();

  const currentPath = location.pathname;

  const isLinkActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    // For /shipments, we want to match /shipments and /shipments/:id, but NOT /shipments/create
    if (path === "/shipments") {
      return (
        currentPath.startsWith("/shipments") &&
        currentPath !== "/shipments/create"
      );
    }
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* Sidebar Overlay for mobile */}
      <div
        className={`sb-overlay ${mobileOpen ? "active" : ""}`}
        id="sbOverlay"
        onClick={onCloseMobile}
        aria-hidden="true"
      ></div>

      {/* Sidebar aside panel */}
      <aside
        className={`sidebar ${mobileOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`}
        id="sidebar"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link to="/dashboard" className="sb-logo" onClick={onCloseMobile} aria-label="MYVAGON">
          <img
            src={assetUrl('gray_white.png')}
            alt=""
            className="sb-logo-img"
          />
        </Link>

        {/* Navigation list */}
        <nav className="sb-nav">
          <div className="ns">{t("main")}</div>
          <Link
            to="/dashboard"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/dashboard", true) ? "active" : ""}`}
            title={t("dashboard")}
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
            <span>{t("dashboard")}</span>
          </Link>

          <Link
            to="/shipments/create"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/shipments/create") ? "active" : ""}`}
            title={t("createShipment")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>{t("createShipment")}</span>
          </Link>

          <Link
            to="/shipments"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/shipments") ? "active" : ""}`}
            title={t("navManageShipments")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            <span>{t("navManageShipments")}</span>
            <span className="nb">5</span>
          </Link>

          <a href="#search" className="ni" title={t("truckAvailability")}>
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
            <span>{t("truckAvailability")}</span>
            {/* <span className="nb" style={{ background: "#0EA5E9" }}>
              BETA
            </span> */}
          </a>

          <div className="ns">{t("navRegistry")}</div>

          <Link
            to="/address-book"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/address-book") ? "active" : ""}`}
            title={t("addressBook")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <span>{t("addressBook")}</span>
          </Link>

          <Link
            to="/products"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/products") ? "active" : ""}`}
            title={t("prodMaster")}
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
            <span>{t("prodMaster")}</span>
          </Link>

          <Link
            to="/partners"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/partners") ? "active" : ""}`}
            title={t("navPartners")}
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
            <span>{t("navPartners")}</span>
          </Link>

          <Link
            to="/erp-orders"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive('/erp-orders') ? 'active' : ''}`}
            title={t('navErpOrders') || 'ERP Orders'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>{t('navErpOrders') || 'ERP Orders'}</span>
          </Link>


          {/* <div className="ns">{t("navAnalytics")}</div>

          <a href="#reports" className="ni" title={t("navReportsInsights")}>
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
            <span>{t("navReportsInsights")}</span>
          </a> */}
        </nav>


        {/* Footer */}
        <div className="sb-ft">
          {/* Collapse Toggle Button */}
          {/* <button
            onClick={onToggleCollapse}
            className="ni sb-collapse-toggle"
            title={t("navCollapseMenu")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
                flexShrink: 0,
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{t("navCollapse")}</span>
          </button> */}



          <a href="#subscription" className="ni" title={t("navSubscription")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            <span>{t("navSubscription")}</span>
          </a>

          <a href="#billing" className="ni" title={t("billing")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"></path>
              <line x1="9" y1="7" x2="15" y2="7"></line>
              <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
            <span>{t("billing")}</span>
          </a>

          <a href="#support" className="ni" title={t("support")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4"></path>
              <line x1="12" y1="17" x2="12" y2="17"></line>
            </svg>
            <span>{t("support")}</span>
          </a>

          <a href="#tutorial" className="ni" title={t("tutorial")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>{t("tutorial")}</span>
          </a>

        </div>
      </aside>
    </>
  );
};
