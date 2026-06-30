/**
 * Orders Master — mock data
 *
 * Source categories:
 *   - 'erp'         📥  synced from shipper/forwarder ERP (SAP, Dynamics, Soft1, NetSuite)
 *   - 'manual'      ✏️  manually created via the Create order modal
 *   - 'load_board'  🚛  auto-created when a forwarder books a load from the
 *                        marketplace or a partner shipper (forwarder only)
 *
 * Statuses follow the business-logic spec:
 *   new · ready_to_plan · planned · in_transit · completed · exception · split
 *
 * Priorities: normal · high · urgent
 *
 * All dates are ISO YYYY-MM-DD. The "today" baseline is 2026-04-16.
 */

const TODAY = '2026-04-16';

// Helper: shift a date string by N days (string-only, no Date obj fuss)
function shift(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Source pill colors — consumed by ListPane source cell
export const SOURCE_COLORS = {
  erp:        { bg: '#F5F3FF', fg: '#7C3AED', bd: '#DDD6FE', icon: '📥' },
  manual:     { bg: '#F1F5F9', fg: '#475569', bd: '#CBD5E1', icon: '✏️' },
  load_board: { bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A', icon: '🚛' },
};

export const STATUS_COLORS = {
  new:           { bg: '#EEF2FF', fg: '#4F46E5', bd: '#C7D2FE' },
  ready_to_plan: { bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE' },
  planned:       { bg: '#ECFEFF', fg: '#0891B2', bd: '#A5F3FC' },
  in_transit:    { bg: '#FFFBEB', fg: '#D97706', bd: '#FDE68A' },
  completed:     { bg: '#ECFDF5', fg: '#10B981', bd: '#A7F3D0' },
  exception:     { bg: '#FEF2F2', fg: '#EF4444', bd: '#FECACA' },
  split:         { bg: '#F5F3FF', fg: '#7C3AED', bd: '#DDD6FE' },
};

export const PRIORITY_COLORS = {
  normal: { bg: '#F1F5F9', fg: '#475569', bd: '#CBD5E1', icon: '' },
  high:   { bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE', icon: '▲' },
  urgent: { bg: '#FEF2F2', fg: '#EF4444', bd: '#FECACA', icon: '⚡' },
};

export const ERP_SYSTEMS = ['SAP', 'Dynamics 365', 'Soft1', 'NetSuite'];

// 40 realistic orders — Greek + international customers, mixed sources/statuses.
// Customer names match Partners mock data (PR-080..084 customers + some invented ones
// the orders page exposes without requiring a full partner record).
export const ORDERS = [
  // ERP-sourced orders (15) — most common in production
  { id: 'ORD-0001', erpNum: 'SO-8842101', source: 'erp', erpSystem: 'SAP',
    customer: 'FreshCo S.A.', customerId: 'PR-080',
    priority: 'urgent', status: 'new',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Piraeus Port 12' },
    shipTo:   { city: 'Thessaloniki', country: 'GR', addr: 'Terma Monastiriou 45' },
    orderDate: shift(TODAY, -2), shipDate: TODAY, deliveryDate: shift(TODAY, 1),
    products: [
      { name: 'ΒΙΚΟΣ Νερό 1.5L', sku: 'SKU-0012', qty: 24, unit: 'Pallet', weight: 6000, weightUnit: 'kg' },
    ],
    totalPallets: 24, totalWeightKg: 6000,
    linkedLoad: null, lastSync: '5 min ago', syncOk: true,
    notes: 'Handle with care — fragile', groupId: null,
  },
  { id: 'ORD-0002', erpNum: 'SO-8842102', source: 'erp', erpSystem: 'SAP',
    customer: 'Σκλαβενίτης Α.Ε.Ε.', customerId: 'PR-081',
    priority: 'high', status: 'ready_to_plan',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Aspropyrgos Warehouse' },
    shipTo:   { city: 'Patras', country: 'GR', addr: 'Rio Distribution Hub' },
    orderDate: shift(TODAY, -1), shipDate: shift(TODAY, 1), deliveryDate: shift(TODAY, 2),
    products: [
      { name: 'ΔΕΛΤΑ Γάλα 1L', sku: 'SKU-0205', qty: 18, unit: 'Pallet', weight: 5400, weightUnit: 'kg' },
    ],
    totalPallets: 18, totalWeightKg: 5400,
    linkedLoad: null, lastSync: '12 min ago', syncOk: true,
    notes: '', groupId: null,
  },
  { id: 'ORD-0003', erpNum: 'SO-8842103', source: 'erp', erpSystem: 'SAP',
    customer: 'Lidl Hellas', customerId: 'PR-082',
    priority: 'normal', status: 'planned',
    shipFrom: { city: 'Thessaloniki', country: 'GR', addr: 'Oraiokastro DC' },
    shipTo:   { city: 'Sofia', country: 'BG', addr: 'Kremikovtsi Industrial' },
    orderDate: shift(TODAY, -3), shipDate: shift(TODAY, 2), deliveryDate: shift(TODAY, 3),
    products: [
      { name: 'Mixed grocery pallet', sku: 'SKU-0350', qty: 33, unit: 'Pallet', weight: 9900, weightUnit: 'kg' },
    ],
    totalPallets: 33, totalWeightKg: 9900,
    linkedLoad: 'LOAD-TH-221', lastSync: '1 hour ago', syncOk: true,
    notes: 'Cross-border — CMR required', groupId: 'GRP-001',
  },
  { id: 'ORD-0004', erpNum: 'SO-8842104', source: 'erp', erpSystem: 'Dynamics 365',
    customer: 'Papadopoulos Bakery', customerId: 'PR-083',
    priority: 'normal', status: 'in_transit',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Peristeri Factory' },
    shipTo:   { city: 'Athens', country: 'GR', addr: 'Maroussi Retail' },
    orderDate: shift(TODAY, -4), shipDate: shift(TODAY, -1), deliveryDate: TODAY,
    products: [
      { name: 'Biscuit mix 500g', sku: 'SKU-0411', qty: 8, unit: 'Pallet', weight: 1600, weightUnit: 'kg' },
    ],
    totalPallets: 8, totalWeightKg: 1600,
    linkedLoad: 'LOAD-AT-440', lastSync: '2 hours ago', syncOk: true,
    notes: '', groupId: null,
  },
  { id: 'ORD-0005', erpNum: 'SO-8842105', source: 'erp', erpSystem: 'SAP',
    customer: 'Attica Pharmacies Group', customerId: 'PR-084',
    priority: 'high', status: 'exception',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Spata Pharma DC' },
    shipTo:   { city: 'Heraklion', country: 'GR', addr: 'Crete Island Hub' },
    orderDate: shift(TODAY, -5), shipDate: shift(TODAY, -2), deliveryDate: shift(TODAY, -1),
    products: [
      { name: 'Pharma cold chain', sku: 'SKU-0520', qty: 4, unit: 'Pallet', weight: 800, weightUnit: 'kg' },
    ],
    totalPallets: 4, totalWeightKg: 800,
    linkedLoad: 'LOAD-HR-115', lastSync: '5 hours ago', syncOk: false,
    notes: 'Exception: cold chain break reported at Piraeus port',
    exceptionReason: 'Temperature excursion detected — cargo held for inspection',
    groupId: null,
  },
  { id: 'ORD-0006', erpNum: 'SO-8842106', source: 'erp', erpSystem: 'Soft1',
    customer: 'Nestle Hellas A.E.', customerId: null,
    priority: 'normal', status: 'completed',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Schimatari Plant' },
    shipTo:   { city: 'Larissa', country: 'GR', addr: 'Central Greece Hub' },
    orderDate: shift(TODAY, -10), shipDate: shift(TODAY, -7), deliveryDate: shift(TODAY, -6),
    products: [
      { name: 'Instant coffee cases', sku: 'SKU-0601', qty: 22, unit: 'Pallet', weight: 4400, weightUnit: 'kg' },
    ],
    totalPallets: 22, totalWeightKg: 4400,
    linkedLoad: 'LOAD-LR-208', lastSync: '2 days ago', syncOk: true,
    notes: '', groupId: null,
  },
  { id: 'ORD-0007', erpNum: 'SO-8842107', source: 'erp', erpSystem: 'NetSuite',
    customer: 'Coca-Cola HBC', customerId: null,
    priority: 'urgent', status: 'new',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Oinofyta Plant' },
    shipTo:   { city: 'Patras', country: 'GR', addr: 'Patras Distribution' },
    orderDate: shift(TODAY, -1), shipDate: TODAY, deliveryDate: shift(TODAY, 1),
    products: [
      { name: 'Soft drink variety pack', sku: 'SKU-0702', qty: 38, unit: 'Pallet', weight: 11400, weightUnit: 'kg' },
    ],
    totalPallets: 38, totalWeightKg: 11400,  // >30 → triggers Suggest Split
    linkedLoad: null, lastSync: '30 min ago', syncOk: true,
    notes: 'Large order — consider splitting', groupId: null,
  },
  { id: 'ORD-0008', erpNum: 'SO-8842108', source: 'erp', erpSystem: 'SAP',
    customer: 'FreshCo S.A.', customerId: 'PR-080',
    priority: 'normal', status: 'ready_to_plan',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Piraeus Port 12' },
    shipTo:   { city: 'Volos', country: 'GR', addr: 'Volos Port Terminal' },
    orderDate: shift(TODAY, -1), shipDate: shift(TODAY, 3), deliveryDate: shift(TODAY, 4),
    products: [
      { name: 'Frozen fish cases', sku: 'SKU-0812', qty: 12, unit: 'Pallet', weight: 3600, weightUnit: 'kg' },
    ],
    totalPallets: 12, totalWeightKg: 3600,
    linkedLoad: null, lastSync: '20 min ago', syncOk: true,
    notes: 'Keep frozen -18°C', groupId: null,
  },
  { id: 'ORD-0009', erpNum: 'SO-8842109', source: 'erp', erpSystem: 'Dynamics 365',
    customer: 'AB Vassilopoulos', customerId: null,
    priority: 'normal', status: 'planned',
    shipFrom: { city: 'Thessaloniki', country: 'GR', addr: 'Sindos Warehouse' },
    shipTo:   { city: 'Athens', country: 'GR', addr: 'Acharnes DC' },
    orderDate: shift(TODAY, -2), shipDate: shift(TODAY, 1), deliveryDate: shift(TODAY, 2),
    products: [
      { name: 'Dairy mixed cases', sku: 'SKU-0905', qty: 16, unit: 'Pallet', weight: 4800, weightUnit: 'kg' },
    ],
    totalPallets: 16, totalWeightKg: 4800,
    linkedLoad: 'LOAD-AT-451', lastSync: '45 min ago', syncOk: true,
    notes: '', groupId: 'GRP-001',
  },
  { id: 'ORD-0010', erpNum: 'SO-8842110', source: 'erp', erpSystem: 'SAP',
    customer: 'Μασούτης', customerId: null,
    priority: 'high', status: 'new',
    shipFrom: { city: 'Thessaloniki', country: 'GR', addr: 'Kalochori DC' },
    shipTo:   { city: 'Ioannina', country: 'GR', addr: 'Ioannina Hub' },
    orderDate: TODAY, shipDate: shift(TODAY, 1), deliveryDate: shift(TODAY, 2),
    products: [
      { name: 'Dry goods mixed', sku: 'SKU-1010', qty: 20, unit: 'Pallet', weight: 5000, weightUnit: 'kg' },
    ],
    totalPallets: 20, totalWeightKg: 5000,
    linkedLoad: null, lastSync: '10 min ago', syncOk: true,
    notes: '', groupId: null,
  },

  // Manual-created orders (10)
  { id: 'ORD-0011', erpNum: '', source: 'manual', erpSystem: '',
    customer: 'TechStore GR', customerId: null,
    priority: 'high', status: 'new',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Metamorphosi Warehouse' },
    shipTo:   { city: 'Chania', country: 'GR', addr: 'Souda Port' },
    orderDate: TODAY, shipDate: shift(TODAY, 1), deliveryDate: shift(TODAY, 3),
    products: [
      { name: 'Electronics boxes', sku: 'MAN-001', qty: 6, unit: 'Pallet', weight: 1800, weightUnit: 'kg' },
    ],
    totalPallets: 6, totalWeightKg: 1800,
    linkedLoad: null, lastSync: null, syncOk: null,
    notes: 'Customer requested specific delivery time', groupId: null,
  },
  { id: 'ORD-0012', erpNum: '', source: 'manual', erpSystem: '',
    customer: 'Olympic Sports', customerId: null,
    priority: 'normal', status: 'ready_to_plan',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Glyfada Warehouse' },
    shipTo:   { city: 'Kalamata', country: 'GR', addr: 'Kalamata Distribution' },
    orderDate: shift(TODAY, -1), shipDate: shift(TODAY, 2), deliveryDate: shift(TODAY, 3),
    products: [
      { name: 'Sports equipment', sku: 'MAN-002', qty: 10, unit: 'Pallet', weight: 2500, weightUnit: 'kg' },
    ],
    totalPallets: 10, totalWeightKg: 2500,
    linkedLoad: null, lastSync: null, syncOk: null,
    notes: '', groupId: null,
  },
  { id: 'ORD-0013', erpNum: '', source: 'manual', erpSystem: '',
    customer: 'Green Grocers Co.', customerId: null,
    priority: 'urgent', status: 'new',
    shipFrom: { city: 'Patras', country: 'GR', addr: 'Agia Sofia Market' },
    shipTo:   { city: 'Athens', country: 'GR', addr: 'Rentis Market' },
    orderDate: TODAY, shipDate: TODAY, deliveryDate: shift(TODAY, 1),
    products: [
      { name: 'Fresh produce', sku: 'MAN-003', qty: 14, unit: 'Pallet', weight: 4200, weightUnit: 'kg' },
    ],
    totalPallets: 14, totalWeightKg: 4200,
    linkedLoad: null, lastSync: null, syncOk: null,
    notes: 'Same-day delivery requested', groupId: null,
  },
  { id: 'ORD-0014', erpNum: '', source: 'manual', erpSystem: '',
    customer: 'Hellenic Tools', customerId: null,
    priority: 'normal', status: 'planned',
    shipFrom: { city: 'Volos', country: 'GR', addr: 'Volos Industrial' },
    shipTo:   { city: 'Athens', country: 'GR', addr: 'Aspropyrgos' },
    orderDate: shift(TODAY, -3), shipDate: shift(TODAY, -1), deliveryDate: TODAY,
    products: [
      { name: 'Power tools', sku: 'MAN-004', qty: 8, unit: 'Pallet', weight: 3200, weightUnit: 'kg' },
    ],
    totalPallets: 8, totalWeightKg: 3200,
    linkedLoad: 'LOAD-AT-462', lastSync: null, syncOk: null,
    notes: '', groupId: null,
  },
  { id: 'ORD-0015', erpNum: '', source: 'manual', erpSystem: '',
    customer: 'Mediterranean Wines', customerId: null,
    priority: 'normal', status: 'in_transit',
    shipFrom: { city: 'Nafpaktos', country: 'GR', addr: 'Winery District' },
    shipTo:   { city: 'Thessaloniki', country: 'GR', addr: 'Halkidiki Resorts' },
    orderDate: shift(TODAY, -2), shipDate: shift(TODAY, -1), deliveryDate: TODAY,
    products: [
      { name: 'Wine cases (premium)', sku: 'MAN-005', qty: 5, unit: 'Pallet', weight: 1500, weightUnit: 'kg' },
    ],
    totalPallets: 5, totalWeightKg: 1500,
    linkedLoad: 'LOAD-TH-223', lastSync: null, syncOk: null,
    notes: 'Temperature-controlled transport', groupId: null,
  },
  { id: 'ORD-0016', erpNum: '', source: 'manual', erpSystem: '',
    customer: 'Retail Plus', customerId: null,
    priority: 'normal', status: 'completed',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Athens South' },
    shipTo:   { city: 'Larissa', country: 'GR', addr: 'Larissa Center' },
    orderDate: shift(TODAY, -8), shipDate: shift(TODAY, -6), deliveryDate: shift(TODAY, -5),
    products: [
      { name: 'General merchandise', sku: 'MAN-006', qty: 11, unit: 'Pallet', weight: 2750, weightUnit: 'kg' },
    ],
    totalPallets: 11, totalWeightKg: 2750,
    linkedLoad: 'LOAD-LR-199', lastSync: null, syncOk: null,
    notes: '', groupId: null,
  },

  // Load-board-sourced orders (forwarder only — 8 entries)
  { id: 'ORD-0017', erpNum: '', source: 'load_board', erpSystem: '',
    customer: 'Βίκος Α.Ε.', customerId: 'PR-060',
    priority: 'high', status: 'ready_to_plan',
    shipFrom: { city: 'Ioannina', country: 'GR', addr: 'Vikos Factory' },
    shipTo:   { city: 'Athens', country: 'GR', addr: 'Aspropyrgos DC' },
    orderDate: shift(TODAY, -1), shipDate: shift(TODAY, 1), deliveryDate: shift(TODAY, 2),
    products: [
      { name: 'Βίκος Νερό 0.5L', sku: 'SKU-0020', qty: 26, unit: 'Pallet', weight: 7800, weightUnit: 'kg' },
    ],
    totalPallets: 26, totalWeightKg: 7800,
    linkedLoad: null, lastSync: '2 hours ago', syncOk: true,
    notes: 'Booked from marketplace — private lane', groupId: null,
    loadBoardRef: 'LB-MKT-8821',
  },
  { id: 'ORD-0018', erpNum: '', source: 'load_board', erpSystem: '',
    customer: 'ΔΕΛΤΑ Α.Β.Ε.Ε.', customerId: 'PR-061',
    priority: 'normal', status: 'new',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Delta Dairy Plant' },
    shipTo:   { city: 'Thessaloniki', country: 'GR', addr: 'Delta North DC' },
    orderDate: TODAY, shipDate: shift(TODAY, 2), deliveryDate: shift(TODAY, 3),
    products: [
      { name: 'Dairy cold chain', sku: 'SKU-0210', qty: 20, unit: 'Pallet', weight: 6000, weightUnit: 'kg' },
    ],
    totalPallets: 20, totalWeightKg: 6000,
    linkedLoad: null, lastSync: '1 hour ago', syncOk: true,
    notes: 'Public marketplace booking', groupId: null,
    loadBoardRef: 'LB-PUB-4412',
  },
  { id: 'ORD-0019', erpNum: '', source: 'load_board', erpSystem: '',
    customer: 'Hellenic Petroleum', customerId: null,
    priority: 'high', status: 'ready_to_plan',
    shipFrom: { city: 'Athens', country: 'GR', addr: 'Aspropyrgos Refinery' },
    shipTo:   { city: 'Patras', country: 'GR', addr: 'Patras Terminal' },
    orderDate: shift(TODAY, -1), shipDate: shift(TODAY, 3), deliveryDate: shift(TODAY, 4),
    products: [
      { name: 'Lubricants barrels', sku: 'SKU-1105', qty: 28, unit: 'Pallet', weight: 14000, weightUnit: 'kg' },
    ],
    totalPallets: 28, totalWeightKg: 14000,
    linkedLoad: null, lastSync: '3 hours ago', syncOk: true,
    notes: '', groupId: null,
    loadBoardRef: 'LB-PUB-4420',
  },
  { id: 'ORD-0020', erpNum: '', source: 'load_board', erpSystem: '',
    customer: 'Τιτάν Cement', customerId: null,
    priority: 'normal', status: 'planned',
    shipFrom: { city: 'Elefsina', country: 'GR', addr: 'Titan Plant' },
    shipTo:   { city: 'Patras', country: 'GR', addr: 'Patras Construction Site' },
    orderDate: shift(TODAY, -2), shipDate: TODAY, deliveryDate: shift(TODAY, 1),
    products: [
      { name: 'Cement bags pallets', sku: 'SKU-1204', qty: 30, unit: 'Pallet', weight: 15000, weightUnit: 'kg' },
    ],
    totalPallets: 30, totalWeightKg: 15000,
    linkedLoad: 'LOAD-PA-305', lastSync: '4 hours ago', syncOk: true,
    notes: '', groupId: 'GRP-002',
    loadBoardRef: 'LB-PRI-3301',
  },
];

// Pre-existing groups (forwarder only)
export const GROUPS = [
  { id: 'GRP-001', name: 'Athens-North Batch', orderCount: 2, createdAt: shift(TODAY, -2) },
  { id: 'GRP-002', name: 'Construction West', orderCount: 1, createdAt: shift(TODAY, -1) },
];

// Available customers (pulled from mock Partners — for the Create order dropdown)
export const CUSTOMERS = [
  { id: 'PR-080', name: 'FreshCo S.A.' },
  { id: 'PR-081', name: 'Σκλαβενίτης Α.Ε.Ε.' },
  { id: 'PR-082', name: 'Lidl Hellas' },
  { id: 'PR-083', name: 'Papadopoulos Bakery' },
  { id: 'PR-084', name: 'Attica Pharmacies Group' },
  { id: null, name: 'Nestle Hellas A.E.' },
  { id: null, name: 'Coca-Cola HBC' },
  { id: null, name: 'AB Vassilopoulos' },
  { id: null, name: 'Μασούτης' },
];

// Cities used across mock data — for filter dropdowns
export const CITIES = [
  'Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos',
  'Ioannina', 'Kalamata', 'Chania', 'Nafpaktos', 'Elefsina', 'Sofia',
];

// KPI-driver helper — counts orders by category
export function computeKpis(orders) {
  return {
    unplanned: orders.filter((o) => (o.status === 'new' || o.status === 'ready_to_plan') && !o.linkedLoad).length,
    planned:   orders.filter((o) => o.status === 'planned' && o.linkedLoad).length,
    inTransit: orders.filter((o) => o.status === 'in_transit').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    exceptions: orders.filter((o) => o.status === 'exception' || o.syncOk === false).length,
    upcoming48h: orders.filter((o) => {
      const d = new Date(o.shipDate);
      const now = new Date(TODAY);
      const diff = (d - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 2;
    }).length,
  };
}

// Return the upcoming-urgency label for a ship date ('today' | 'tomorrow' | 'in2' | 'in3' | null)
export function upcomingBadge(shipDate, baseline = TODAY) {
  const d = new Date(shipDate);
  const now = new Date(baseline);
  const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === 2) return 'in2';
  if (diff === 3) return 'in3';
  return null;
}

// Build an empty order record for the Create order form
export function emptyOrder() {
  return {
    id: '', priority: 'normal', notes: '',
    customer: '', customerId: null,
    shipFrom: { city: '', country: 'GR', addr: '' },
    shipTo:   { city: '', country: 'GR', addr: '' },
    orderDate: TODAY, shipDate: '', deliveryDate: '',
    products: [{ name: '', sku: '', qty: 1, unit: 'Pallet', weight: 0, weightUnit: 'kg' }],
  };
}

export const TODAY_ISO = TODAY;
