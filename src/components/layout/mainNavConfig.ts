/**
 * Shared main-app navigation for Sidebar and TopNav.
 * Keep section labels and items identical across both nav modes.
 */
import {
  LayoutGrid,
  PlusCircle,
  ClipboardList,
  Search,
  BookUser,
  Package,
  Users,
  Activity,
  Sparkles,
  DollarSign,
  HelpCircle,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { ShipperRbacNavKey } from '../../utils/shipperRbacMap';

export type MainNavItem = {
  id: string;
  labelKey: string;
  fallback: string;
  route: string;
  icon: LucideIcon;
  tag?: string;
  /** Spatie nav gate; omit = always visible. */
  rbacNav?: ShipperRbacNavKey;
  /** Exact path match for active state (e.g. Dashboard). */
  exact?: boolean;
  /** Driver.js / onboarding selector. */
  tourId?: string;
};

export type MainNavSection = {
  id: string;
  labelKey: string;
  fallback: string;
  items: MainNavItem[];
};

export const MAIN_NAV_SECTIONS: MainNavSection[] = [
  {
    id: 'main',
    labelKey: 'main',
    fallback: 'MAIN',
    items: [
      {
        id: 'vagon-ai',
        labelKey: 'vagonai.title',
        fallback: 'Vagon AI',
        route: '/vagonai',
        icon: Sparkles,
        tag: 'BETA',
        rbacNav: 'vagonAi',
        tourId: 'vagon-ai',
      },
      {
        id: 'dashboard',
        labelKey: 'dashboard',
        fallback: 'Dashboard',
        route: '/dashboard',
        icon: LayoutGrid,
        exact: true,
      },
      {
        id: 'create',
        labelKey: 'createShipment.label',
        fallback: 'Create Shipment',
        route: '/shipments/create',
        icon: PlusCircle,
        rbacNav: 'createShipment',
        tourId: 'create-shipment',
      },
      {
        id: 'manage',
        labelKey: 'navManageShipments',
        fallback: 'Manage Shipments',
        route: '/shipments',
        icon: ClipboardList,
        rbacNav: 'manageShipments',
        tourId: 'manage-shipments',
      },
      {
        id: 'search',
        labelKey: 'truckAvailability',
        fallback: 'Search Trucks',
        route: '/search-trucks',
        icon: Search,
        tag: 'BETA',
        rbacNav: 'searchTrucks',
      },
    ],
  },
  {
    id: 'master',
    labelKey: 'navRegistry',
    fallback: 'MASTER',
    items: [
      {
        id: 'addresses',
        labelKey: 'addressBook',
        fallback: 'Address Book',
        route: '/address-book',
        icon: BookUser,
        tourId: 'address-book',
      },
      {
        id: 'products',
        labelKey: 'prodMaster',
        fallback: 'Product Master',
        route: '/products',
        icon: Package,
        tourId: 'products',
      },
      {
        id: 'orders',
        labelKey: 'navErpOrders',
        fallback: 'Orders',
        route: '/erp-orders',
        icon: Activity,
        rbacNav: 'orders',
        tourId: 'erp-orders',
      },
      {
        id: 'partners',
        labelKey: 'navPartners',
        fallback: 'Partners',
        route: '/partners',
        icon: Users,
        rbacNav: 'partners',
        tourId: 'partners',
      },
      {
        id: 'pricing',
        labelKey: 'priceLists.title',
        fallback: 'Price Lists',
        route: '/pricing',
        icon: DollarSign,
        rbacNav: 'priceLists',
        tourId: 'price-lists',
      },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'navAnalytics',
    fallback: 'ANALYTICS',
    items: [
      {
        id: 'weekly-reports',
        labelKey: 'weeklyReports',
        fallback: 'Weekly Reports',
        route: '/analytics/weekly-reports',
        icon: BarChart3,
        tourId: 'weekly-reports',
      },
    ],
  },
];

export const MAIN_NAV_FOOTER: MainNavItem[] = [
  {
    id: 'support',
    labelKey: 'support',
    fallback: 'Support & Feedback',
    route: '/support',
    icon: HelpCircle,
    tourId: 'support',
  },
];

export function isMainNavRouteActive(pathname: string, item: Pick<MainNavItem, 'route' | 'exact'>): boolean {
  const { route, exact } = item;
  if (exact || route === '/dashboard') {
    return pathname === route;
  }
  if (route === '/shipments') {
    return pathname.startsWith('/shipments') && !pathname.startsWith('/shipments/create');
  }
  if (route.startsWith('/analytics')) {
    return pathname.startsWith('/analytics');
  }
  return pathname.startsWith(route);
}
