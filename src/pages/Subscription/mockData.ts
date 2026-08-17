import type { PlanDef, PlanKey, RecurringAddon, UsageAddon, UsageItem } from './types';

export const PLAN_ORDER: PlanKey[] = ['essential', 'plus', 'pro'];

export const INITIAL_PLAN: PlanKey = 'essential';
export const RENEWAL_DATE = '2026-03-22';
export const USAGE_RESET_DATE = '2026-03-01';

export const PLANS: Record<PlanKey, PlanDef> = {
  essential: {
    key: 'essential',
    name: 'Essential',
    price: { monthly: 0, yearly: 0 },
    desc: 'Create shipments, onboard partners, explore the platform.',
    free: true,
    limits: {
      privateLoads: 5,
      partners: 3,
      dispatchers: 1,
      trackingLinks: 1,
      bids: 1000,
      publicLoads: '✓',
      searchTrucks: '✓',
      marketplace: '✓',
      manageShipments: '✓',
      rating: '✓',
      chat: '✓',
      gps: '✗',
      pods: '✗',
      multistop: '✗',
    },
  },
  plus: {
    key: 'plus',
    name: 'Plus',
    price: { monthly: 550, yearly: 500 },
    desc: 'For teams that need control and efficiency with significant volume.',
    popular: true,
    limits: {
      privateLoads: 200,
      partners: 20,
      dispatchers: 5,
      trackingLinks: 5,
      bids: 200,
      publicLoads: '✓',
      searchTrucks: '✓',
      marketplace: '✓',
      manageShipments: '✓',
      rating: '✓',
      chat: '✓',
      gps: '✗',
      pods: '✗',
      multistop: '✗',
    },
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    price: { monthly: 1100, yearly: 1000 },
    desc: 'Full power. Unlimited loads. Unlimited scale.',
    limits: {
      privateLoads: '∞',
      partners: 50,
      dispatchers: 10,
      trackingLinks: '∞',
      bids: '∞',
      publicLoads: '✓',
      searchTrucks: '✓',
      marketplace: '✓',
      manageShipments: '✓',
      rating: '✓',
      chat: '✓',
      gps: '∞',
      pods: '∞',
      multistop: '∞',
    },
  },
};

export const INITIAL_USAGE: UsageItem[] = [
  { key: 'privateLoads', used: 3, limit: 5 },
  { key: 'partners', used: 2, limit: 3 },
  { key: 'dispatchers', used: 1, limit: 1 },
  { key: 'trackingLinks', used: 1, limit: 1 },
  { key: 'bids', used: 412, limit: 1000 },
];

export const INITIAL_RECURRING_ADDONS: RecurringAddon[] = [
  {
    id: 'partners',
    name: 'Additional Partners',
    desc: 'Add more carrier partners to your private network.',
    price: 5.5,
    unit: '/partner/mo',
    icon: '🤝',
    enabled: false,
  },
  {
    id: 'dispatchers',
    name: 'Dispatcher Users',
    desc: 'Additional dispatcher accounts for your team.',
    price: 33,
    unit: '/user/mo',
    icon: '👤',
    enabled: false,
  },
  {
    id: 'gps',
    name: 'GPS Tracking',
    desc: 'Real-time GPS tracking for all live shipments.',
    price: 132,
    unit: '/mo',
    icon: '📡',
    enabled: false,
  },
  {
    id: 'pods',
    name: 'Digital PODs',
    desc: 'Receive and manage digital proof of delivery.',
    price: 11,
    unit: '/mo',
    icon: '📄',
    enabled: false,
  },
  {
    id: 'multistop',
    name: 'Multi-Stop Routes',
    desc: 'Enable multi-stop routing for complex shipments.',
    price: 55,
    unit: '/mo',
    icon: '📍',
    enabled: false,
  },
  {
    id: 'viewBids',
    name: 'View Posted Truck Bids',
    desc: 'See if your posted trucks have received bids.',
    price: 110,
    unit: '/mo',
    icon: '👁',
    enabled: false,
  },
  {
    id: 'bestBids',
    name: 'View Best Bids',
    desc: 'See the best bid on posted trucks.',
    price: 550,
    unit: '/mo',
    icon: '🏆',
    enabled: false,
  },
  {
    id: 'matchedLoads',
    name: 'View Matched Loads',
    desc: 'See loads matched to your truck availability.',
    price: 22,
    unit: '/mo',
    icon: '🔗',
    enabled: false,
  },
];

export const INITIAL_USAGE_ADDONS: UsageAddon[] = [
  {
    id: 'extraTrackingLinks',
    name: 'Tracking Links',
    desc: 'Purchase additional tracking links for customers.',
    price: 1.99,
    unit: '/link',
    icon: '🔗',
    owned: 0,
    cart: 1,
  },
  {
    id: 'extraBids',
    name: 'Bids',
    desc: 'Purchase additional bid units.',
    price: 0.99,
    unit: '/bid',
    icon: '🎯',
    owned: 5,
    cart: 10,
  },
  {
    id: 'extraPrivateLoads',
    name: 'Private Loads',
    desc: 'Purchase additional private load slots.',
    price: 3,
    unit: '/load',
    icon: '📦',
    owned: 0,
    cart: 5,
  },
];

export const PLAN_FEATURES: { k: keyof PlanDef['limits']; f: string; beta?: boolean }[] = [
  { k: 'privateLoads', f: 'fPrivateLoads' },
  { k: 'partners', f: 'fPartners' },
  { k: 'publicLoads', f: 'fPublicLoads', beta: true },
  { k: 'searchTrucks', f: 'fSearchTrucks', beta: true },
  { k: 'marketplace', f: 'fMarketplace', beta: true },
  { k: 'manageShipments', f: 'fManage' },
  { k: 'rating', f: 'fRating' },
  { k: 'chat', f: 'fChat' },
  { k: 'dispatchers', f: 'fDispatchers' },
  { k: 'trackingLinks', f: 'fTrackingLinks' },
  { k: 'bids', f: 'fBids', beta: true },
  { k: 'gps', f: 'fGPS' },
  { k: 'pods', f: 'fPODs' },
  { k: 'multistop', f: 'fMultistop' },
];

export const PRO_INCLUDED_ADDONS = ['gps', 'pods', 'multistop'];

export const BILLING_DETAILS = {
  companyName: 'ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΚΗ ΕΠΕ',
  vatId: 'EL999999999',
  address: 'Athens, Greece',
  invoiceEmail: 'billing@client.com',
};

export function formatEuro(n: number): string {
  return `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(d: string, locale = 'en'): string {
  return new Date(d).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function usageTone(used: number, limit: number | null): 'ok' | 'warn' | 'crit' {
  if (limit == null || limit <= 0) return 'ok';
  const pct = Math.round((used / limit) * 100);
  if (pct >= 90) return 'crit';
  if (pct >= 70) return 'warn';
  return 'ok';
}
