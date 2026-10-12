/**
 * TopNav — horizontal nav when Appearance → Top menu.
 * Menu structure matches Sidebar via shared mainNavConfig.
 */
import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePastDueLock } from '../../hooks/usePastDueLock';
import { useRequireSignupComplete } from '../../hooks/useRequireSignupComplete';
import { isSignupCompleteAllowedPath } from '../../hooks/useSignupCompleteGate';
import { useShipperPermission } from '../../hooks/useShipperPermission';
import {
  MAIN_NAV_FOOTER,
  MAIN_NAV_SECTIONS,
  isMainNavRouteActive,
  type MainNavItem,
  type MainNavSection,
} from './mainNavConfig';

export function TopNav() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pastDueLocked = usePastDueLock();
  const { requireSignupComplete, signupIncomplete } = useRequireSignupComplete();
  const { canNav } = useShipperPermission();
  const [hoverSection, setHoverSection] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemAllowed = (item: MainNavItem) =>
    !item.rbacNav || canNav(item.rbacNav);

  const visibleSections = MAIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(itemAllowed),
  })).filter((section) => section.items.length > 0);

  const go = (route?: string) => {
    if (!route) return;
    if (signupIncomplete && !isSignupCompleteAllowedPath(route)) {
      requireSignupComplete();
      return;
    }
    navigate(pastDueLocked && route !== '/billing' ? '/billing' : route);
  };

  const isWhiteNav = T.nav === '#FFFFFF';
  const txtBase = T.navT;
  const txtHover = T.navH;
  const txtActive = T.navAT;
  const bgActive = T.navA;
  const bgHover = T.navHov;

  const isActive = (item: Pick<MainNavItem, 'route' | 'exact'>) =>
    isMainNavRouteActive(location.pathname, item);

  const isSectionActive = (section: MainNavSection) =>
    section.items.some((item) => isActive(item));

  const handleEnter = (id: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoverSection(id);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setHoverSection(null), 200);
  };

  const label = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  return (
    <nav
      className="top-nav"
      aria-label={t('mainNavigation', 'Main navigation')}
      style={{
        height: 42,
        background: T.nav,
        borderBottom: isWhiteNav ? `1px solid ${T.navBd}` : 'none',
        zIndex: 40,
      }}
    >
      {visibleSections.map((section) => {
        const sectionActive = isSectionActive(section);
        const open = hoverSection === section.id;
        return (
          <div
            key={section.id}
            className="top-nav-section"
            onMouseEnter={() => handleEnter(section.id)}
            onMouseLeave={handleLeave}
          >
            <button
              type="button"
              onClick={() => {
                const firstRoutable = section.items.find((item) => item.route);
                go(firstRoutable?.route || '/dashboard');
                setHoverSection(null);
              }}
              className="top-nav-item"
              aria-expanded={open}
              aria-haspopup="menu"
              style={{
                background: open || sectionActive ? bgActive : 'transparent',
                color: sectionActive ? txtActive : txtBase,
                fontSize: 13,
                fontWeight: sectionActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!sectionActive) e.currentTarget.style.color = txtHover;
              }}
              onMouseLeave={(e) => {
                if (!sectionActive) e.currentTarget.style.color = txtBase;
              }}
            >
              <span>{label(section.labelKey, section.fallback)}</span>
              <ChevronDown size={12} style={{ opacity: 0.5 }} />
            </button>

            {open && (
              <div className="top-nav-dropdown" role="menu">
                <div
                  className="top-nav-dropdown-panel"
                  style={{
                    background: T.sf,
                    border: `1px solid ${T.bd}`,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                  }}
                >
                  {section.items.map((item) => {
                    const active = isActive(item);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        role="menuitem"
                        onClick={() => {
                          go(item.route);
                          setHoverSection(null);
                        }}
                        className="top-nav-dropdown-item"
                        data-tour={item.tourId}
                        style={{
                          background: active ? T.al : 'transparent',
                          color: active ? T.ac : T.t1,
                          fontSize: 13,
                          fontWeight: active ? 600 : 400,
                          borderLeft: `3px solid ${active ? T.ac : 'transparent'}`,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = T.sa;
                            e.currentTarget.style.paddingLeft = '18px';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.paddingLeft = '16px';
                          }
                        }}
                      >
                        <item.icon size={16} style={{ color: active ? T.ac : T.t2, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{label(item.labelKey, item.fallback)}</span>
                        {item.tag && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: 4,
                              background: T.ac,
                              color: '#fff',
                            }}
                          >
                            {item.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

      {MAIN_NAV_FOOTER.filter(itemAllowed).map((item) => {
        const active = isActive(item);
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => go(item.route)}
            className="top-nav-item"
            data-tour={item.tourId}
            style={{
              background: active ? bgActive : 'transparent',
              color: active ? txtActive : txtBase,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = bgHover;
                e.currentTarget.style.color = txtHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = txtBase;
              }
            }}
          >
            <item.icon size={16} />
            <span>{label(item.labelKey, item.fallback)}</span>
          </button>
        );
      })}
    </nav>
  );
}
