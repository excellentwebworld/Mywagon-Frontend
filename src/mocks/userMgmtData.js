/**
 * userMgmtData.js — Mock data for User Management module
 *
 * Contains:
 * - Permission groups, dependencies, descriptions, module access map
 * - Default role templates per account type (Shipper, Forwarder, Carrier)
 * - 9 mock users with login history & activity
 * - Seat configuration
 * - Audit log entries
 * - Security policies / sessions
 */

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION GROUPS — 14 groups, ~50 permissions
   ═══════════════════════════════════════════════════════════════════════════ */

export const PERMISSION_GROUPS = [
  {
    group: 'Shipments', icon: 'Package', key: 'shipments',
    permissions: [
      { key: 'shipment.create', risk: 'low' },
      { key: 'shipment.edit', risk: 'low' },
      { key: 'shipment.cancel', risk: 'medium' },
      { key: 'shipment.view', risk: 'low' },
    ],
  },
  {
    group: 'Posting', icon: 'Globe', key: 'posting',
    permissions: [
      { key: 'posting.private', risk: 'low' },
      { key: 'posting.public', risk: 'medium' },
    ],
  },
  {
    group: 'Bids & Offers', icon: 'Gavel', key: 'bids',
    permissions: [
      { key: 'bids.view', risk: 'low' },
      { key: 'bids.accept', risk: 'medium' },
      { key: 'bids.counter', risk: 'medium' },
    ],
  },
  {
    group: 'Orders', icon: 'ClipboardList', key: 'orders',
    permissions: [
      { key: 'orders.view', risk: 'low' },
      { key: 'orders.create', risk: 'low' },
      { key: 'orders.edit', risk: 'low' },
      { key: 'orders.delete', risk: 'medium' },
      { key: 'orders.split', risk: 'low' },
      { key: 'orders.groups', risk: 'low' },
      { key: 'orders.ai_optimizer', risk: 'low' },
    ],
  },
  {
    group: 'Master Data', icon: 'Database', key: 'masterData',
    permissions: [
      { key: 'master.address_book', risk: 'low' },
      { key: 'master.products', risk: 'low' },
      { key: 'master.partners', risk: 'low' },
      { key: 'master.partners.invite', risk: 'medium' },
    ],
  },
  {
    group: 'Fleet', icon: 'Truck', key: 'fleet',
    permissions: [
      { key: 'fleet.view', risk: 'low' },
      { key: 'fleet.manage_drivers', risk: 'low' },
      { key: 'fleet.manage_vehicles', risk: 'low' },
      { key: 'fleet.assign', risk: 'low' },
      { key: 'fleet.view_costs', risk: 'medium' },
      { key: 'fleet.edit_costs', risk: 'medium' },
    ],
  },
  {
    group: 'Price Lists', icon: 'Receipt', key: 'priceLists',
    permissions: [
      { key: 'pricelists.view', risk: 'low' },
      { key: 'pricelists.create', risk: 'medium' },
      { key: 'pricelists.edit', risk: 'medium' },
      { key: 'pricelists.manage_defaults', risk: 'high' },
      { key: 'pricelists.view_profitability', risk: 'medium' },
    ],
  },
  {
    group: 'Loads', icon: 'Container', key: 'loads',
    permissions: [
      { key: 'loads.view', risk: 'low' },
      { key: 'loads.create', risk: 'low' },
      { key: 'loads.assign_carrier', risk: 'medium' },
      { key: 'loads.assign_fleet', risk: 'low' },
      { key: 'loads.track', risk: 'low' },
      { key: 'loads.confirm_delivery', risk: 'medium' },
    ],
  },
  {
    group: 'Partners', icon: 'Handshake', key: 'partners',
    permissions: [
      { key: 'partners.view', risk: 'low' },
      { key: 'partners.invite', risk: 'medium' },
      { key: 'partners.manage', risk: 'medium' },
      { key: 'partners.contracts', risk: 'medium' },
    ],
  },
  {
    group: 'Documents', icon: 'FileText', key: 'documents',
    permissions: [
      { key: 'docs.upload', risk: 'low' },
      { key: 'docs.review', risk: 'low' },
      { key: 'docs.request', risk: 'low' },
    ],
  },
  {
    group: 'Analytics', icon: 'BarChart3', key: 'analytics',
    permissions: [
      { key: 'analytics.basic', risk: 'low' },
      { key: 'analytics.advanced', risk: 'low' },
      { key: 'analytics.export', risk: 'medium' },
    ],
  },
  {
    group: 'Billing', icon: 'CreditCard', key: 'billing',
    permissions: [
      { key: 'billing.view', risk: 'low' },
      { key: 'billing.pay', risk: 'high' },
      { key: 'billing.disputes', risk: 'medium' },
      { key: 'billing.credits', risk: 'medium' },
    ],
  },
  {
    group: 'Settings', icon: 'Settings', key: 'settings',
    permissions: [
      { key: 'settings.company', risk: 'high' },
      { key: 'settings.integrations', risk: 'high' },
      { key: 'settings.notifications', risk: 'low' },
    ],
  },
  {
    group: 'Security & Admin', icon: 'Shield', key: 'security',
    permissions: [
      { key: 'security.users', risk: 'high' },
      { key: 'security.roles', risk: 'high' },
      { key: 'security.audit', risk: 'medium' },
      { key: 'security.policies', risk: 'high' },
    ],
  },
];

/** Flat list of all permission keys */
export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION DEPENDENCIES
   ═══════════════════════════════════════════════════════════════════════════ */

export const PERMISSION_DEPENDENCIES = {
  'bids.accept':           ['bids.view'],
  'bids.counter':          ['bids.view'],
  'shipment.edit':         ['shipment.view'],
  'shipment.cancel':       ['shipment.view'],
  'orders.edit':           ['orders.view'],
  'orders.delete':         ['orders.view'],
  'orders.split':          ['orders.view', 'orders.edit'],
  'orders.groups':         ['orders.view'],
  'orders.ai_optimizer':   ['orders.view'],
  'partners.invite':       ['partners.view'],
  'partners.manage':       ['partners.view'],
  'partners.contracts':    ['partners.view', 'partners.manage'],
  'fleet.manage_drivers':  ['fleet.view'],
  'fleet.manage_vehicles': ['fleet.view'],
  'fleet.assign':          ['fleet.view', 'fleet.manage_drivers'],
  'fleet.edit_costs':      ['fleet.view', 'fleet.view_costs'],
  'pricelists.create':     ['pricelists.view'],
  'pricelists.edit':       ['pricelists.view'],
  'pricelists.manage_defaults': ['pricelists.view', 'pricelists.edit'],
  'pricelists.view_profitability': ['pricelists.view'],
  'loads.create':          ['loads.view'],
  'loads.assign_carrier':  ['loads.view', 'loads.create'],
  'loads.assign_fleet':    ['loads.view', 'fleet.view'],
  'loads.confirm_delivery':['loads.view'],
  'docs.review':           ['docs.upload'],
  'billing.pay':           ['billing.view'],
  'billing.disputes':      ['billing.view'],
  'billing.credits':       ['billing.view'],
  'security.roles':        ['security.users'],
  'security.policies':     ['security.users'],
  'analytics.export':      ['analytics.basic'],
  'analytics.advanced':    ['analytics.basic'],
};

/**
 * Reverse map: for a given permission, which other perms depend on it?
 * Used to block disabling a permission that's required by others.
 */
export const PERMISSION_DEPENDENTS = (() => {
  const map = {};
  for (const [perm, deps] of Object.entries(PERMISSION_DEPENDENCIES)) {
    deps.forEach(dep => {
      if (!map[dep]) map[dep] = [];
      map[dep].push(perm);
    });
  }
  return map;
})();

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE ACCESS DERIVATION
   ═══════════════════════════════════════════════════════════════════════════ */

export const MODULE_ACCESS_MAP = {
  dashboard:      true,
  shipments:      ['shipment.create', 'shipment.edit', 'shipment.cancel', 'shipment.view'],
  orders:         ['orders.view', 'orders.create', 'orders.edit'],
  addressBook:    ['master.address_book'],
  products:       ['master.products'],
  partners:       ['partners.view', 'partners.invite', 'partners.manage'],
  fleet:          ['fleet.view', 'fleet.manage_drivers', 'fleet.manage_vehicles'],
  priceLists:     ['pricelists.view', 'pricelists.create', 'pricelists.edit'],
  billing:        ['billing.view', 'billing.pay'],
  analytics:      ['analytics.basic', 'analytics.advanced'],
  settings:       ['settings.company', 'settings.integrations'],
  userManagement: ['security.users'],
};

/**
 * Resolve which modules a user can access given their effective permissions.
 * @param {string[]|null} perms — null means full access (admin)
 * @returns {Object<string, boolean>}
 */
export function resolveModuleAccess(perms) {
  const result = {};
  for (const [mod, rule] of Object.entries(MODULE_ACCESS_MAP)) {
    if (rule === true) {
      result[mod] = true;
    } else if (perms === null) {
      result[mod] = true; // full admin
    } else {
      result[mod] = rule.some(p => perms.includes(p));
    }
  }
  return result;
}

/**
 * Resolve effective permissions for a user.
 * Hybrid (PDS-937): directPermissions (or legacy customPerms) override role preset.
 * @returns {string[]|null} — null means full access
 */
export function getEffectivePermissions(user) {
  const direct = user.directPermissions !== undefined ? user.directPermissions : user.customPerms;
  if (direct !== null && direct !== undefined) return direct;
  const role = ROLES_BY_KEY[user.role];
  return role ? role.permissions : [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROLE TEMPLATES (Shipper account type)
   ═══════════════════════════════════════════════════════════════════════════ */

export const SHIPPER_ROLES = [
  {
    id: 'role-admin', key: 'admin', name: 'Admin', color: '#7C3AED', isSystem: true,
    description: 'Full access to all platform features and settings.',
    permissions: null, // null = all permissions
    userCount: 2,
  },
  {
    id: 'role-dispatcher', key: 'dispatcher', name: 'Dispatcher', color: '#3B82F6', isSystem: true,
    description: 'Manages shipments, orders, loads, and day-to-day operations.',
    permissions: [
      'shipment.create', 'shipment.edit', 'shipment.cancel', 'shipment.view',
      'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.split', 'orders.groups', 'orders.ai_optimizer',
      'master.address_book', 'master.products', 'master.partners',
      'loads.view', 'loads.create', 'loads.assign_carrier', 'loads.assign_fleet', 'loads.track', 'loads.confirm_delivery',
      'fleet.view', 'fleet.assign',
      'docs.upload', 'docs.review', 'docs.request',
      'partners.view', 'partners.manage',
      'analytics.basic',
    ],
    userCount: 7,
  },
];

export const FORWARDER_ROLES = [
  { id: 'role-admin', key: 'admin', name: 'Admin', color: '#7C3AED', isSystem: true, description: 'Full access to all platform features and settings.', permissions: null, userCount: 2 },
  { id: 'role-operations', key: 'operations', name: 'Operations', color: '#3B82F6', isSystem: true, description: 'Handles shipments, orders, loads, fleet, and day-to-day operations.', permissions: ['shipment.create','shipment.edit','shipment.cancel','shipment.view','orders.view','orders.create','orders.edit','orders.delete','orders.split','orders.groups','orders.ai_optimizer','loads.view','loads.create','loads.assign_carrier','loads.assign_fleet','loads.track','loads.confirm_delivery','fleet.view','fleet.manage_drivers','fleet.manage_vehicles','fleet.assign','master.address_book','master.products','master.partners','master.partners.invite','docs.upload','docs.review','docs.request','posting.private','posting.public','bids.view','bids.accept','bids.counter'], userCount: 3 },
  { id: 'role-account-manager', key: 'accountManager', name: 'Account Manager', color: '#F59E0B', isSystem: true, description: 'Manages partners, price lists, bids, and client relationships.', permissions: ['partners.view','partners.invite','partners.manage','partners.contracts','pricelists.view','pricelists.create','pricelists.edit','bids.view','bids.accept','bids.counter','analytics.basic','analytics.advanced','analytics.export','shipment.view','loads.view'], userCount: 1 },
  { id: 'role-finance', key: 'finance', name: 'Finance', color: '#10B981', isSystem: true, description: 'Handles billing, payments, and financial reporting.', permissions: ['billing.view','billing.pay','billing.disputes','billing.credits','analytics.basic','analytics.advanced','analytics.export','pricelists.view','orders.view','shipment.view'], userCount: 1 },
  { id: 'role-viewer', key: 'viewer', name: 'Viewer', color: '#9CA3AF', isSystem: true, description: 'Read-only access across the platform.', permissions: ['shipment.view','orders.view','fleet.view','pricelists.view','analytics.basic','loads.view','partners.view','bids.view'], userCount: 1 },
];

export const CARRIER_ROLES = [
  { id: 'role-admin', key: 'admin', name: 'Admin', color: '#7C3AED', isSystem: true, description: 'Full access to all platform features and settings.', permissions: null, userCount: 2 },
  { id: 'role-fleet-manager', key: 'fleetManager', name: 'Fleet Manager', color: '#3B82F6', isSystem: true, description: 'Manages fleet, loads, and all vehicle/driver operations.', permissions: ['fleet.view','fleet.manage_drivers','fleet.manage_vehicles','fleet.assign','fleet.view_costs','fleet.edit_costs','loads.view','loads.assign_fleet','loads.track','orders.view','docs.upload','docs.review','docs.request'], userCount: 1 },
  { id: 'role-driver-manager', key: 'driverManager', name: 'Driver Manager', color: '#0EA5E9', isSystem: true, description: 'Manages drivers and daily assignments.', permissions: ['fleet.view','fleet.manage_drivers','fleet.assign','loads.view','loads.track','docs.upload'], userCount: 1 },
  { id: 'role-pricing-manager', key: 'pricingManager', name: 'Pricing Manager', color: '#F59E0B', isSystem: true, description: 'Manages rate cards, lane pricing, and profitability.', permissions: ['pricelists.view','pricelists.create','pricelists.edit','pricelists.manage_defaults','pricelists.view_profitability','fleet.view','fleet.view_costs','analytics.basic','analytics.advanced','analytics.export','loads.view'], userCount: 1 },
  { id: 'role-viewer', key: 'viewer', name: 'Viewer', color: '#9CA3AF', isSystem: true, description: 'Read-only access across the platform.', permissions: ['shipment.view','orders.view','fleet.view','pricelists.view','analytics.basic','loads.view'], userCount: 1 },
];

/** Quick-access map: role key → role object (Shipper defaults) */
export const ROLES_BY_KEY = {};
SHIPPER_ROLES.forEach(r => { ROLES_BY_KEY[r.key] = r; });

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK USERS — 9 users for shipper org "VIKOS"
   ═══════════════════════════════════════════════════════════════════════════ */

export const MOCK_USERS = [
  {
    id: 'USR-001', firstName: 'Γιώργος', lastName: 'Οικονομόπουλος',
    email: 'g.oikonomopoulos@vikos.com', phone: '+30 694 123 4567',
    jobTitle: 'CEO', department: 'Executive', role: 'admin',
    status: 'active', mfa: true, isOwner: true, directPermissions: null,
    lastActive: '2026-05-09T09:15:00Z', created: '2024-01-15T10:00:00Z',
    lastPasswordChange: '2026-03-01T08:00:00Z',
    timezone: 'Europe/Athens', locale: 'el',
  },
  {
    id: 'USR-002', firstName: 'Ηπειρωτική', lastName: 'Βιομηχανία',
    email: 'info@hpeirotiki.gr', phone: '+30 265 102 3456',
    jobTitle: 'Operations Manager', department: 'Operations', role: 'admin',
    status: 'active', mfa: true, isOwner: false, directPermissions: null,
    lastActive: '2026-05-08T14:30:00Z', created: '2024-01-15T10:00:00Z',
    lastPasswordChange: '2026-04-10T12:00:00Z',
    timezone: 'Europe/Athens', locale: 'el',
  },
  {
    id: 'USR-003', firstName: 'Παύλος', lastName: 'Σταμούλης',
    email: 'p.stamoulis@vikos.com', phone: '+30 698 765 4321',
    jobTitle: 'Dispatcher', department: 'Logistics', role: 'dispatcher',
    status: 'active', mfa: false, isOwner: false, directPermissions: null,
    lastActive: '2026-05-07T16:20:00Z', created: '2024-03-10T09:00:00Z',
    lastPasswordChange: '2025-11-20T09:00:00Z',
    timezone: 'Europe/Athens', locale: 'el',
  },
  {
    id: 'USR-004', firstName: 'Σταματία', lastName: 'Μαάλη',
    email: 's.maali@vikos.com', phone: '+30 697 111 2233',
    jobTitle: 'Accountant', department: 'Finance', role: 'dispatcher',
    status: 'active', mfa: true, isOwner: false,
    // Former Finance role — preserved as direct permissions (old platform model)
    directPermissions: [
      'billing.view', 'billing.pay', 'billing.disputes', 'billing.credits',
      'analytics.basic', 'analytics.advanced', 'analytics.export',
      'orders.view', 'pricelists.view', 'shipment.view',
    ],
    lastActive: '2026-05-06T11:00:00Z', created: '2024-06-20T08:30:00Z',
    lastPasswordChange: '2026-02-15T10:00:00Z',
    timezone: 'Europe/Athens', locale: 'el',
  },
  {
    id: 'USR-005', firstName: 'Μιχάλης', lastName: 'Τζιάλας',
    email: 'm.tzialas@vikos.com', phone: '+30 693 444 5566',
    jobTitle: 'Driver Coordinator', department: 'Logistics', role: 'dispatcher',
    status: 'suspended', mfa: false, isOwner: false, directPermissions: null,
    lastActive: '2026-04-25T13:00:00Z', created: '2024-04-15T14:00:00Z',
    lastPasswordChange: '2025-09-01T08:00:00Z',
    suspendedReason: 'Policy violation review',
    timezone: 'Europe/Athens', locale: 'el',
  },
  {
    id: 'USR-006', firstName: 'Ανδρέας', lastName: 'Καφαντάρης',
    email: 'a.kafantaris@vikos.com', phone: '+30 691 222 3344',
    jobTitle: 'Junior Dispatcher', department: 'Logistics', role: 'dispatcher',
    status: 'active', mfa: false, isOwner: false, directPermissions: null,
    lastActive: '2026-05-09T04:15:00Z', created: '2025-01-08T09:00:00Z',
    lastPasswordChange: '2025-12-20T10:00:00Z',
    timezone: 'Europe/Athens', locale: 'en',
  },
  {
    id: 'USR-007', firstName: 'Όλγα', lastName: 'Τσαγκάρη',
    email: 'o.tsagkari@vikos.com', phone: '+30 694 888 9900',
    jobTitle: 'Analyst', department: 'Strategy', role: 'dispatcher',
    status: 'active', mfa: false, isOwner: false,
    directPermissions: ['shipment.view', 'orders.view', 'analytics.basic', 'analytics.advanced', 'posting.public'],
    lastActive: '2026-05-08T09:30:00Z', created: '2024-09-12T10:00:00Z',
    lastPasswordChange: '2026-01-10T09:00:00Z',
    timezone: 'Europe/Athens', locale: 'en',
  },
  {
    id: 'USR-008', firstName: 'Ελένη', lastName: 'Δημητρίου',
    email: 'e.dimitriou@vikos.com', phone: '+30 697 333 4455',
    jobTitle: 'Intern', department: 'Operations', role: 'dispatcher',
    status: 'active', mfa: false, isOwner: false,
    // Former Viewer role — preserved as direct permissions
    directPermissions: [
      'shipment.view', 'orders.view', 'fleet.view', 'pricelists.view',
      'analytics.basic', 'loads.view',
    ],
    lastActive: '2026-05-02T10:00:00Z', created: '2025-02-01T09:00:00Z',
    lastPasswordChange: '2025-02-01T09:00:00Z',
    timezone: 'Europe/Athens', locale: 'el',
  },
  {
    id: 'USR-009', firstName: 'Ολίβια', lastName: 'Κύρου',
    email: 'o.kyrou@vikos.com', phone: null,
    jobTitle: null, department: null, role: 'dispatcher',
    status: 'invited', mfa: false, isOwner: false,
    directPermissions: [
      'shipment.create', 'shipment.edit', 'shipment.cancel', 'shipment.view',
      'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.split', 'orders.groups', 'orders.ai_optimizer',
      'master.address_book', 'master.products', 'master.partners',
      'loads.view', 'loads.create', 'loads.assign_carrier', 'loads.assign_fleet', 'loads.track', 'loads.confirm_delivery',
      'fleet.view', 'fleet.assign',
      'docs.upload', 'docs.review', 'docs.request',
      'partners.view', 'partners.manage',
      'analytics.basic',
    ],
    lastActive: null, created: '2026-05-01T14:30:00Z',
    lastPasswordChange: null,
    inviteSentAt: '2026-05-01T14:30:00Z',
    inviteExpiresAt: '2026-05-08T14:30:00Z',
    timezone: 'Europe/Athens', locale: 'el',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN HISTORY (per user)
   ═══════════════════════════════════════════════════════════════════════════ */

export const LOGIN_HISTORY = {
  'USR-001': [
    { ts: '2026-05-09T09:15:00Z', ok: true, device: 'Chrome · macOS', city: 'Athens, GR', ip: '192.168.1.xxx' },
    { ts: '2026-05-08T08:40:00Z', ok: true, device: 'Safari · iOS', city: 'Athens, GR', ip: '192.168.1.xxx' },
    { ts: '2026-05-06T14:20:00Z', ok: true, device: 'Chrome · macOS', city: 'Athens, GR', ip: '192.168.1.xxx' },
    { ts: '2026-05-05T09:00:00Z', ok: true, device: 'Chrome · macOS', city: 'Thessaloniki, GR', ip: '10.0.0.xxx' },
    { ts: '2026-05-03T22:10:00Z', ok: false, device: 'Firefox · Windows', city: 'Sofia, BG', ip: '45.12.xxx.xxx' },
    { ts: '2026-05-01T07:30:00Z', ok: true, device: 'Chrome · macOS', city: 'Athens, GR', ip: '192.168.1.xxx' },
  ],
  'USR-002': [
    { ts: '2026-05-08T14:30:00Z', ok: true, device: 'Chrome · Windows', city: 'Ioannina, GR', ip: '10.0.1.xxx' },
    { ts: '2026-05-07T09:10:00Z', ok: true, device: 'Chrome · Windows', city: 'Ioannina, GR', ip: '10.0.1.xxx' },
    { ts: '2026-05-05T08:45:00Z', ok: true, device: 'Safari · iOS', city: 'Athens, GR', ip: '192.168.2.xxx' },
    { ts: '2026-05-04T11:20:00Z', ok: true, device: 'Chrome · Windows', city: 'Ioannina, GR', ip: '10.0.1.xxx' },
    { ts: '2026-05-02T07:50:00Z', ok: true, device: 'Chrome · Windows', city: 'Ioannina, GR', ip: '10.0.1.xxx' },
  ],
  'USR-003': [
    { ts: '2026-05-07T16:20:00Z', ok: true, device: 'Chrome · Android', city: 'Patras, GR', ip: '79.130.xxx.xxx' },
    { ts: '2026-05-06T08:00:00Z', ok: true, device: 'Chrome · Windows', city: 'Patras, GR', ip: '79.130.xxx.xxx' },
    { ts: '2026-05-05T07:30:00Z', ok: true, device: 'Chrome · Windows', city: 'Patras, GR', ip: '79.130.xxx.xxx' },
    { ts: '2026-05-03T18:00:00Z', ok: false, device: 'Chrome · macOS', city: 'Bucharest, RO', ip: '86.55.xxx.xxx' },
    { ts: '2026-05-02T08:15:00Z', ok: true, device: 'Chrome · Windows', city: 'Patras, GR', ip: '79.130.xxx.xxx' },
  ],
  'USR-004': [
    { ts: '2026-05-06T11:00:00Z', ok: true, device: 'Safari · macOS', city: 'Athens, GR', ip: '192.168.3.xxx' },
    { ts: '2026-05-05T09:30:00Z', ok: true, device: 'Safari · macOS', city: 'Athens, GR', ip: '192.168.3.xxx' },
    { ts: '2026-05-03T08:45:00Z', ok: true, device: 'Safari · macOS', city: 'Athens, GR', ip: '192.168.3.xxx' },
    { ts: '2026-05-01T07:15:00Z', ok: true, device: 'Safari · macOS', city: 'Athens, GR', ip: '192.168.3.xxx' },
  ],
  'USR-005': [
    { ts: '2026-04-25T13:00:00Z', ok: true, device: 'Chrome · Android', city: 'Thessaloniki, GR', ip: '10.0.3.xxx' },
    { ts: '2026-04-24T08:30:00Z', ok: true, device: 'Chrome · Windows', city: 'Thessaloniki, GR', ip: '10.0.3.xxx' },
    { ts: '2026-04-22T09:00:00Z', ok: true, device: 'Chrome · Windows', city: 'Thessaloniki, GR', ip: '10.0.3.xxx' },
  ],
  'USR-006': [
    { ts: '2026-05-09T04:15:00Z', ok: true, device: 'Chrome · Windows', city: 'Athens, GR', ip: '192.168.4.xxx' },
    { ts: '2026-05-08T08:00:00Z', ok: true, device: 'Chrome · Windows', city: 'Athens, GR', ip: '192.168.4.xxx' },
    { ts: '2026-05-07T07:50:00Z', ok: true, device: 'Chrome · Windows', city: 'Athens, GR', ip: '192.168.4.xxx' },
    { ts: '2026-05-06T08:10:00Z', ok: true, device: 'Chrome · Android', city: 'Athens, GR', ip: '192.168.4.xxx' },
    { ts: '2026-05-05T07:55:00Z', ok: true, device: 'Chrome · Windows', city: 'Athens, GR', ip: '192.168.4.xxx' },
  ],
  'USR-007': [
    { ts: '2026-05-08T09:30:00Z', ok: true, device: 'Firefox · macOS', city: 'Athens, GR', ip: '192.168.5.xxx' },
    { ts: '2026-05-07T10:15:00Z', ok: true, device: 'Firefox · macOS', city: 'Athens, GR', ip: '192.168.5.xxx' },
    { ts: '2026-05-06T09:00:00Z', ok: true, device: 'Firefox · macOS', city: 'Athens, GR', ip: '192.168.5.xxx' },
    { ts: '2026-05-05T09:20:00Z', ok: true, device: 'Firefox · macOS', city: 'Athens, GR', ip: '192.168.5.xxx' },
  ],
  'USR-008': [
    { ts: '2026-05-02T10:00:00Z', ok: true, device: 'Chrome · macOS', city: 'Volos, GR', ip: '85.74.xxx.xxx' },
    { ts: '2026-04-30T09:15:00Z', ok: true, device: 'Chrome · macOS', city: 'Volos, GR', ip: '85.74.xxx.xxx' },
    { ts: '2026-04-28T08:45:00Z', ok: true, device: 'Chrome · macOS', city: 'Volos, GR', ip: '85.74.xxx.xxx' },
  ],
  'USR-009': [],
};

/* ═══════════════════════════════════════════════════════════════════════════
   RECENT ACTIVITY (per user)
   ═══════════════════════════════════════════════════════════════════════════ */

export const USER_ACTIVITY = {
  'USR-001': [
    { icon: '👥', action: 'Invited user o.kyrou@vikos.com', ts: '2026-05-01T14:30:00Z' },
    { icon: '🔑', action: 'Changed role for Ε. Δημητρίου to Viewer', ts: '2026-04-28T10:00:00Z' },
    { icon: '📦', action: 'Created shipment SHP-4521', ts: '2026-04-25T11:15:00Z' },
    { icon: '⚙️', action: 'Updated company settings', ts: '2026-04-20T09:00:00Z' },
    { icon: '🔒', action: 'Enabled MFA for account', ts: '2026-03-01T08:00:00Z' },
  ],
  'USR-002': [
    { icon: '📋', action: 'Created order ORD-0089', ts: '2026-05-08T13:45:00Z' },
    { icon: '📦', action: 'Updated shipment SHP-4515', ts: '2026-05-07T10:30:00Z' },
    { icon: '🚛', action: 'Assigned DRV-003 to TRK-002', ts: '2026-05-06T14:00:00Z' },
    { icon: '📋', action: 'Exported orders CSV', ts: '2026-05-05T16:20:00Z' },
    { icon: '📍', action: 'Added location Piraeus Terminal', ts: '2026-05-04T11:00:00Z' },
  ],
  'USR-003': [
    { icon: '📦', action: 'Created shipment SHP-4523', ts: '2026-05-07T15:00:00Z' },
    { icon: '✏️', action: 'Edited order ORD-0015', ts: '2026-05-06T11:30:00Z' },
    { icon: '🚛', action: 'Assigned DRV-005 to TRK-001', ts: '2026-05-05T09:45:00Z' },
    { icon: '📋', action: 'Exported price list CSV', ts: '2026-05-04T14:20:00Z' },
    { icon: '📍', action: 'Updated address Thessaloniki Hub', ts: '2026-05-03T10:00:00Z' },
    { icon: '📦', action: 'Created shipment SHP-4519', ts: '2026-05-02T16:00:00Z' },
  ],
  'USR-004': [
    { icon: '💳', action: 'Processed payment INV-2341', ts: '2026-05-06T10:00:00Z' },
    { icon: '📊', action: 'Generated monthly analytics report', ts: '2026-05-05T09:00:00Z' },
    { icon: '💳', action: 'Filed dispute for INV-2298', ts: '2026-05-03T11:30:00Z' },
    { icon: '📊', action: 'Exported billing CSV', ts: '2026-05-01T14:00:00Z' },
  ],
  'USR-005': [
    { icon: '📦', action: 'Updated shipment SHP-4510', ts: '2026-04-25T12:00:00Z' },
    { icon: '🚛', action: 'Assigned DRV-002 to load LD-0044', ts: '2026-04-24T09:30:00Z' },
    { icon: '📋', action: 'Created order ORD-0078', ts: '2026-04-23T15:00:00Z' },
  ],
  'USR-006': [
    { icon: '📦', action: 'Created shipment SHP-4525', ts: '2026-05-09T03:50:00Z' },
    { icon: '📋', action: 'Created order ORD-0092', ts: '2026-05-08T16:20:00Z' },
    { icon: '✏️', action: 'Edited order ORD-0088', ts: '2026-05-08T10:00:00Z' },
    { icon: '📍', action: 'Added location Larissa Depot', ts: '2026-05-07T14:00:00Z' },
    { icon: '📦', action: 'Created shipment SHP-4522', ts: '2026-05-06T09:15:00Z' },
  ],
  'USR-007': [
    { icon: '📊', action: 'Viewed advanced analytics', ts: '2026-05-08T09:00:00Z' },
    { icon: '📦', action: 'Viewed shipment SHP-4520', ts: '2026-05-07T11:00:00Z' },
    { icon: '📋', action: 'Viewed orders list', ts: '2026-05-06T10:30:00Z' },
    { icon: '📊', action: 'Exported analytics report', ts: '2026-05-05T14:00:00Z' },
    { icon: '📦', action: 'Viewed shipment SHP-4515', ts: '2026-05-04T09:30:00Z' },
  ],
  'USR-008': [
    { icon: '📦', action: 'Viewed shipment SHP-4518', ts: '2026-05-02T09:30:00Z' },
    { icon: '📋', action: 'Viewed orders list', ts: '2026-04-30T10:00:00Z' },
    { icon: '📊', action: 'Viewed analytics dashboard', ts: '2026-04-28T09:00:00Z' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIT LOG ENTRIES
   ═══════════════════════════════════════════════════════════════════════════ */

export const AUDIT_LOG = [
  { id: 'AUD-001', ts: '2026-05-09T09:15:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Γ. Οικονομόπουλος', targetId: 'USR-001', action: 'login', summary: 'Logged in from Chrome · Athens, GR' },
  { id: 'AUD-002', ts: '2026-05-08T14:30:00Z', actor: 'Η. Βιομηχανία', actorId: 'USR-002', target: 'Η. Βιομηχανία', targetId: 'USR-002', action: 'login', summary: 'Logged in from Chrome · Ioannina, GR' },
  { id: 'AUD-003', ts: '2026-05-01T14:30:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Ο. Κύρου', targetId: 'USR-009', action: 'invited', summary: 'Invited o.kyrou@vikos.com as Viewer' },
  { id: 'AUD-004', ts: '2026-04-28T10:00:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Ε. Δημητρίου', targetId: 'USR-008', action: 'roleChanged', summary: 'Changed role from Dispatcher to Viewer' },
  { id: 'AUD-005', ts: '2026-04-25T14:00:00Z', actor: 'Η. Βιομηχανία', actorId: 'USR-002', target: 'Μ. Τζιάλας', targetId: 'USR-005', action: 'suspended', summary: 'Suspended — reason: Policy violation review' },
  { id: 'AUD-006', ts: '2026-04-20T09:00:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Ό. Τσαγκάρη', targetId: 'USR-007', action: 'permissionsEdited', summary: 'Custom permissions: added posting.public, analytics.advanced' },
  { id: 'AUD-007', ts: '2026-04-15T11:30:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Α. Καφαντάρης', targetId: 'USR-006', action: 'invited', summary: 'Invited a.kafantaris@vikos.com as Dispatcher' },
  { id: 'AUD-008', ts: '2026-04-10T16:00:00Z', actor: 'Η. Βιομηχανία', actorId: 'USR-002', target: 'MFA Policy', targetId: null, action: 'mfaChanged', summary: 'Enabled MFA enforcement for organization' },
  { id: 'AUD-009', ts: '2026-04-05T09:30:00Z', actor: 'System', actorId: null, target: 'Π. Σταμούλης', targetId: 'USR-003', action: 'passwordReset', summary: 'Password reset email sent' },
  { id: 'AUD-010', ts: '2026-03-28T14:00:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Dispatcher', targetId: 'role-dispatcher', action: 'roleEdited', summary: 'Updated Dispatcher role: added orders.ai_optimizer' },
  { id: 'AUD-011', ts: '2026-03-20T10:00:00Z', actor: 'Η. Βιομηχανία', actorId: 'USR-002', target: 'Σ. Μαάλη', targetId: 'USR-004', action: 'mfaChanged', summary: 'Required MFA for user' },
  { id: 'AUD-012', ts: '2026-03-15T08:30:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Finance', targetId: 'role-finance', action: 'roleCreated', summary: 'Created Finance role with billing + analytics permissions' },
  { id: 'AUD-013', ts: '2026-03-10T11:00:00Z', actor: 'System', actorId: null, target: 'Ε. Δημητρίου', targetId: 'USR-008', action: 'invited', summary: 'Invitation accepted by e.dimitriou@vikos.com' },
  { id: 'AUD-014', ts: '2026-03-01T08:00:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Γ. Οικονομόπουλος', targetId: 'USR-001', action: 'mfaChanged', summary: 'Enabled MFA for own account' },
  { id: 'AUD-015', ts: '2026-02-20T09:00:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Viewer', targetId: 'role-viewer', action: 'roleCreated', summary: 'Created Viewer role with read-only permissions' },
  { id: 'AUD-016', ts: '2026-02-15T14:30:00Z', actor: 'Η. Βιομηχανία', actorId: 'USR-002', target: 'Μ. Τζιάλας', targetId: 'USR-005', action: 'signedOut', summary: 'Force signed out all sessions' },
  { id: 'AUD-017', ts: '2026-02-10T10:00:00Z', actor: 'Γ. Οικονομόπουλος', actorId: 'USR-001', target: 'Session Policy', targetId: null, action: 'policyChanged', summary: 'Changed session timeout from 24h to 8h' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SEAT CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

export const SEAT_CONFIG = {
  plan: 'Business',
  totalSeats: 10,
  usedSeats: 9,
  billingCycleEnd: '2026-06-15',
};

/* ═══════════════════════════════════════════════════════════════════════════
   SECURITY POLICIES (mock)
   ═══════════════════════════════════════════════════════════════════════════ */

export const SECURITY_POLICIES = {
  mfaEnforced: false,
  allowedDomains: ['vikos.com', 'hpeirotiki.gr'],
  sessionTimeout: 8,
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: false,
    expiryDays: 90,
    preventReuse: 5,
  },
  failedLoginAlerts: {
    threshold: 3,
    windowHours: 1,
    action: 'lock_temp',
    lockMinutes: 30,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE SESSIONS (mock)
   ═══════════════════════════════════════════════════════════════════════════ */

export const ACTIVE_SESSIONS = [
  { id: 'ses-1', userId: 'USR-001', userName: 'Γ. Οικονομόπουλος', device: 'Chrome · macOS', city: 'Athens, GR', ip: '192.168.1.xxx', started: '2026-05-09T09:15:00Z' },
  { id: 'ses-2', userId: 'USR-002', userName: 'Η. Βιομηχανία', device: 'Chrome · Windows', city: 'Ioannina, GR', ip: '10.0.1.xxx', started: '2026-05-08T14:30:00Z' },
  { id: 'ses-3', userId: 'USR-006', userName: 'Α. Καφαντάρης', device: 'Chrome · Windows', city: 'Athens, GR', ip: '192.168.4.xxx', started: '2026-05-09T04:15:00Z' },
  { id: 'ses-4', userId: 'USR-007', userName: 'Ό. Τσαγκάρη', device: 'Firefox · macOS', city: 'Athens, GR', ip: '192.168.5.xxx', started: '2026-05-08T09:30:00Z' },
  { id: 'ses-5', userId: 'USR-004', userName: 'Σ. Μαάλη', device: 'Safari · macOS', city: 'Athens, GR', ip: '192.168.3.xxx', started: '2026-05-06T11:00:00Z' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2', '#BE185D', '#4338CA', '#0D9488'];

export function getUserInitials(u) {
  const first = u.firstName || u.first_name || '';
  const last = u.lastName || u.last_name || '';
  return `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}` || '?';
}

export function getUserFullName(u) {
  const first = u.firstName || u.first_name || '';
  const last = u.lastName || u.last_name || '';
  return `${first} ${last}`.trim();
}

export function getUserAvatarColor(userId) {
  const s = String(userId ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/**
 * Get the risk level color for a permission.
 */
export function getRiskColor(risk) {
  if (risk === 'high') return { fg: '#EF4444', bg: '#FEF2F2' };
  if (risk === 'medium') return { fg: '#F59E0B', bg: '#FFFBEB' };
  return { fg: '#10B981', bg: '#ECFDF5' };
}

/**
 * Status badge config.
 */
export const USER_STATUS_CONFIG = {
  active:      { fg: '#10B981', bg: '#ECFDF5', bd: '#A7F3D0' },
  invited:     { fg: '#F59E0B', bg: '#FFFBEB', bd: '#FDE68A' },
  suspended:   { fg: '#F97316', bg: '#FFF7ED', bd: '#FDBA74' },
  deactivated: { fg: '#9CA3AF', bg: '#F3F4F6', bd: '#D1D5DB' },
  expired:     { fg: '#EF4444', bg: '#FEF2F2', bd: '#FECACA' },
};

/**
 * Calculate invite status: active, expiring, or expired.
 */
export function getInviteStatus(user) {
  if (user.status !== 'invited' || !user.inviteExpiresAt) return null;
  const now = new Date();
  const exp = new Date(user.inviteExpiresAt);
  const diffMs = exp - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { label: 'expired', daysLeft: 0 };
  if (diffDays <= 2) return { label: 'expiring', daysLeft: diffDays };
  return { label: 'active', daysLeft: diffDays };
}
