import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { assetUrl } from "../../utils/assetUrl";
import collapsedLogo from "../../assets/logo/logo.svg";
import { usePastDueLock } from "../../hooks/usePastDueLock";
import { useRequireSignupComplete } from "../../hooks/useRequireSignupComplete";
import { isSignupCompleteAllowedPath } from "../../hooks/useSignupCompleteGate";
import { useShipperPermission } from "../../hooks/useShipperPermission";
import {
  MAIN_NAV_FOOTER,
  MAIN_NAV_SECTIONS,
  isMainNavRouteActive,
  type MainNavItem,
} from "./mainNavConfig";

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
  const pastDueLocked = usePastDueLock();
  const { requireSignupComplete, signupIncomplete } = useRequireSignupComplete();
  const { canNav } = useShipperPermission();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MAIN_NAV_SECTIONS.map((section) => [section.id, true])),
  );

  const sectionLabel = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  const itemLabel = (item: MainNavItem) => {
    const value = t(item.labelKey);
    if (!value || value === item.labelKey) return item.fallback;
    return value;
  };

  const itemAllowed = (item: MainNavItem) =>
    !item.rbacNav || canNav(item.rbacNav);

  const onFeatureNav = (e: React.MouseEvent, path: string) => {
    if (pastDueLocked && !path.includes("/billing")) {
      e.preventDefault();
      navigate("/billing");
      onCloseMobile();
      return;
    }
    if (signupIncomplete && !isSignupCompleteAllowedPath(path)) {
      e.preventDefault();
      requireSignupComplete();
      return;
    }
    onCloseMobile();
  };

  const renderNavLink = (item: MainNavItem) => {
    if (!itemAllowed(item)) return null;
    const active = isMainNavRouteActive(location.pathname, item);
    const label = itemLabel(item);
    return (
      <Link
        key={item.id}
        to={item.route}
        onClick={(e) => onFeatureNav(e, item.route)}
        className={`ni ${active ? "active" : ""}`}
        title={label}
        data-tour={item.tourId}
      >
        <item.icon size={18} />
        <span>{label}</span>
        {item.tag && <span className="nb">{item.tag}</span>}
      </Link>
    );
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
        aria-label={t("mainNavigation", "Main navigation")}
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
          {MAIN_NAV_SECTIONS.map((section) => {
            const isOpen = openSections[section.id] !== false;
            const visibleItems = section.items.filter(itemAllowed);
            if (visibleItems.length === 0) return null;
            return (
              <React.Fragment key={section.id}>
                <button
                  type="button"
                  className="ns ns-toggle"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenSections((prev) => ({
                      ...prev,
                      [section.id]: !isOpen,
                    }))
                  }
                  title={sectionLabel(section.labelKey, section.fallback)}
                >
                  <span>{sectionLabel(section.labelKey, section.fallback)}</span>
                  <svg
                    className={`ns-chevron ${isOpen ? "open" : ""}`}
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
                {isOpen && visibleItems.map(renderNavLink)}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sb-ft">
          {MAIN_NAV_FOOTER.map(renderNavLink)}
        </div>
      </aside>
    </>
  );
};
