/**
 * TopNav — horizontal nav when Appearance → Top menu.
 * Dropdowns match MV_Web_Panel_React TopNav (hover menus with icons + left accent).
 */
import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LayoutGrid,
  PlusCircle,
  ClipboardList,
  Search,
  BookUser,
  Package,
  Users,
  FileSpreadsheet,
  Settings,
  CreditCard,
  Star,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { usePastDueLock } from '../../hooks/usePastDueLock';

type NavItem = {
  id: string;
  labelKey: string;
  fallback: string;
  route: string;
  icon: LucideIcon;
  tag?: string;
};

type NavSection = {
  id: string;
  labelKey: string;
  fallback: string;
  items: NavItem[];
};

const TOP_ITEM: NavItem = {
  id: 'dashboard',
  labelKey: 'dashboard',
  fallback: 'Dashboard',
  route: '/dashboard',
  icon: LayoutGrid,
};

const SECTIONS: NavSection[] = [
  {
    id: 'ops',
    labelKey: 'sidebar.operations',
    fallback: 'Operations',
    items: [
      {
        id: 'create',
        labelKey: 'createShipment',
        fallback: 'Create Shipment',
        route: '/shipments/create',
        icon: PlusCircle,
      },
      {
        id: 'manage',
        labelKey: 'navManageShipments',
        fallback: 'Manage Shipments',
        route: '/shipments',
        icon: ClipboardList,
      },
      {
        id: 'search',
        labelKey: 'truckAvailability',
        fallback: 'Search Trucks',
        route: '/search-trucks',
        icon: Search,
        tag: 'BETA',
      },
    ],
  },
  {
    id: 'master',
    labelKey: 'masterData',
    fallback: 'Master Data',
    items: [
      {
        id: 'addresses',
        labelKey: 'addressBook',
        fallback: 'Address Book',
        route: '/address-book',
        icon: BookUser,
      },
      {
        id: 'products',
        labelKey: 'products',
        fallback: 'Product Master',
        route: '/products',
        icon: Package,
      },
      {
        id: 'partners',
        labelKey: 'partners',
        fallback: 'Partners',
        route: '/partners',
        icon: Users,
      },
      {
        id: 'erp',
        labelKey: 'erpOrders',
        fallback: 'ERP Orders',
        route: '/erp-orders',
        icon: FileSpreadsheet,
      },
    ],
  },
];

const FOOTER: NavItem[] = [
  { id: 'settings', labelKey: 'settings.title', fallback: 'Settings', route: '/settings', icon: Settings },
  { id: 'subscription', labelKey: 'navSubscription', fallback: 'Subscription', route: '/subscription', icon: Star },
  { id: 'billing', labelKey: 'billing', fallback: 'Billing', route: '/billing', icon: CreditCard },
  { id: 'support', labelKey: 'support', fallback: 'Support', route: '/support', icon: HelpCircle },
];

export function TopNav() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pastDueLocked = usePastDueLock();
  const [hoverSection, setHoverSection] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (route: string) => {
    navigate(pastDueLocked && route !== '/billing' ? '/billing' : route);
  };

  const isWhiteNav = T.nav === '#FFFFFF';
  const txtBase = T.navT;
  const txtHover = T.navH;
  const txtActive = T.navAT;
  const bgActive = T.navA;
  const bgHover = T.navHov;

  const isActive = (route: string) => {
    if (route === '/dashboard') return location.pathname === '/dashboard';
    if (route === '/shipments') {
      return location.pathname.startsWith('/shipments') && location.pathname !== '/shipments/create';
    }
    return location.pathname.startsWith(route);
  };

  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => isActive(item.route));

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
      aria-label="Main navigation"
      style={{
        height: 42,
        background: T.nav,
        borderBottom: isWhiteNav ? `1px solid ${T.navBd}` : 'none',
        zIndex: 40,
      }}
    >
      <button
        type="button"
        onClick={() => go(TOP_ITEM.route)}
        className="top-nav-item"
        style={{
          background: isActive(TOP_ITEM.route) ? bgActive : 'transparent',
          color: isActive(TOP_ITEM.route) ? txtActive : txtBase,
          fontSize: 13,
          fontWeight: isActive(TOP_ITEM.route) ? 600 : 500,
        }}
        onMouseEnter={(e) => {
          if (!isActive(TOP_ITEM.route)) {
            e.currentTarget.style.background = bgHover;
            e.currentTarget.style.color = txtHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive(TOP_ITEM.route)) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = txtBase;
          }
        }}
      >
        <TOP_ITEM.icon size={16} />
        <span>{label(TOP_ITEM.labelKey, TOP_ITEM.fallback)}</span>
      </button>

      {SECTIONS.map((section) => {
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
                go(section.items[0]?.route || '/dashboard');
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
                    const active = isActive(item.route);
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

      {FOOTER.map((item) => {
        const active = isActive(item.route);
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => go(item.route)}
            className="top-nav-item"
            style={{
              background: active ? bgActive : 'transparent',
              color: active ? txtActive : T.navSec,
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
                e.currentTarget.style.color = T.navSec;
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
