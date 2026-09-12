import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useApp } from "../../context/AppContext";
import { assetUrl } from "../../utils/assetUrl";
import collapsedLogo from "../../assets/logo/logo.svg";
import { usePastDueLock } from "../../hooks/usePastDueLock";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse: _onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useApp();
  const pastDueLocked = usePastDueLock();

  const [mainOpen, setMainOpen] = useState(true);
  const [masterOpen, setMasterOpen] = useState(true);

  const currentPath = location.pathname;

  const isLinkActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    if (path === "/shipments") {
      return (
        currentPath.startsWith("/shipments") &&
        !currentPath.startsWith("/shipments/create")
      );
    }
    return currentPath.startsWith(path);
  };

  const sectionLabel = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  return (
    <>
      <div
        className={`sb-overlay ${mobileOpen ? "active" : ""}`}
        id="sbOverlay"
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${mobileOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""} ${pastDueLocked ? "past-due-locked" : ""}`}
        id="sidebar"
        aria-label="Main navigation"
        onClickCapture={(e) => {
          if (!pastDueLocked) return;
          const anchor = (e.target as HTMLElement).closest("a");
          if (!anchor) return;
          const href = anchor.getAttribute("href") || "";
          if (!href.includes("/billing")) {
            e.preventDefault();
            e.stopPropagation();
            navigate("/billing");
            onCloseMobile();
          }
        }}
      >
        <Link
          to={pastDueLocked ? "/billing" : "/dashboard"}
          className="sb-logo"
          onClick={onCloseMobile}
          aria-label="MYVAGON"
        >
          <img
            src={collapsed ? collapsedLogo : assetUrl("gray_white.png")}
            alt=""
            className={`sb-logo-img${collapsed ? " sb-logo-img--collapsed" : " sb-logo-img--expanded"}`}
          />
        </Link>

        <nav className="sb-nav">
          <button
            type="button"
            className="ns ns-toggle"
            aria-expanded={mainOpen}
            onClick={() => setMainOpen((v) => !v)}
            title={sectionLabel("main", "MAIN")}
          >
            <span>{sectionLabel("main", "MAIN")}</span>
            <svg
              className={`ns-chevron ${mainOpen ? "open" : ""}`}
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {mainOpen && (
            <>
              <button
                type="button"
                className="ni"
                title={t("vagonai.title") || "Vagon AI"}
                data-tour="vagon-ai"
                onClick={() => {
                  showToast(t("vagonai.title") || "Vagon AI", "info");
                  onCloseMobile();
                }}
              >
                <Sparkles size={18} />
                <span>{t("vagonai.title") || "Vagon AI"}</span>
              </button>

              <Link
                to="/dashboard"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/dashboard", true) ? "active" : ""}`}
                title={t("dashboard")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                data-tour="create-shipment"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{t("createShipment")}</span>
              </Link>

              <Link
                to="/shipments"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/shipments") ? "active" : ""}`}
                title={t("navManageShipments")}
                data-tour="manage-shipments"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
                <span>{t("navManageShipments")}</span>
              </Link>

              <Link
                to="/search-trucks"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/search-trucks") ? "active" : ""}`}
                title={t("truckAvailability")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <span>{t("truckAvailability")}</span>
                <span className="nb">BETA</span>
              </Link>
            </>
          )}

          <button
            type="button"
            className="ns ns-toggle"
            aria-expanded={masterOpen}
            onClick={() => setMasterOpen((v) => !v)}
            title={sectionLabel("navRegistry", "MASTER")}
          >
            <span>{sectionLabel("navRegistry", "MASTER")}</span>
            <svg
              className={`ns-chevron ${masterOpen ? "open" : ""}`}
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {masterOpen && (
            <>
              <Link
                to="/address-book"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/address-book") ? "active" : ""}`}
                title={t("addressBook")}
                data-tour="address-book"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
                data-tour="products"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                <span>{t("prodMaster")}</span>
              </Link>

              <Link
                to="/erp-orders"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/erp-orders") ? "active" : ""}`}
                title={t("navErpOrders") || "Orders"}
                data-tour="erp-orders"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span>{t("navErpOrders") || "Orders"}</span>
              </Link>

              <Link
                to="/partners"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/partners") ? "active" : ""}`}
                title={t("navPartners")}
                data-tour="partners"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{t("navPartners")}</span>
              </Link>

              <Link
                to="/pricing"
                onClick={onCloseMobile}
                className={`ni ${isLinkActive("/pricing") ? "active" : ""}`}
                title={t("priceLists.title") || "Price Lists"}
                data-tour="price-lists"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>{t("priceLists.title") || "Price Lists"}</span>
              </Link>
            </>
          )}
        </nav>

        <div className="sb-ft">
          <Link
            to="/support"
            onClick={onCloseMobile}
            className={`ni ${isLinkActive("/support") ? "active" : ""}`}
            title={t("support")}
            data-tour="support"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
            <span>{t("support")}</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
