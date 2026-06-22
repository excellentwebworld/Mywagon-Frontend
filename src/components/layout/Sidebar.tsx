import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";

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
            src="/gray_white.png"
            alt="MYVAGON"
            className="sb-logo-img"
          />
        </Link>

        {/* Navigation list */}
        <nav className="sb-nav">
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
            <span>{t("createShipment")}</span>
          </Link>

          <Link
            to="/shipments"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/shipments") ? "active" : ""}`}
            title={t("navManageShipments")}
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
            <span className="nb" style={{ background: "#0EA5E9" }}>
              BETA
            </span>
          </a>

          <div className="ns">{t("navRegistry")}</div>

          <Link
            to="/address-book"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/address-book") ? "active" : ""}`}
            title={t("addressBook")}
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

          <div className="ns">{t("navAnalytics")}</div>

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
          </a>
        </nav>

        {/* Footer */}
        <div className="sb-ft">
          {/* Collapse Toggle Button */}
          <button
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
          </button>

          <a href="#settings" className="ni" title={t("navSettings")}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>{t("navSettings")}</span>
          </a>
          <a href="#help" className="ni" title={t("navHelp")}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{t("navHelp")}</span>
          </a>
        </div>
      </aside>
    </>
  );
};
