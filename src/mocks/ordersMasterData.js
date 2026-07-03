/**
 * Orders Master — mock data.
 *
 * Roles:
 *  - SHIPPER sees source ∈ {'erp', 'manual'}
 *  - FORWARDER sees source ∈ {'erp', 'manual', 'load_board'}
 *  - CARRIER never sees this page
 *
 * Statuses:
 *  - new, ready_to_plan, planned, in_transit, completed, exception, split
 *
 * Priorities:
 *  - normal, high, urgent
 */

export const ORDER_SOURCES = ['erp', 'manual', 'load_board'];
export const ORDER_STATUSES = ['new', 'ready_to_plan', 'planned', 'in_transit', 'completed', 'exception', 'split'];
export const ORDER_PRIORITIES = ['normal', 'high', 'urgent'];

// Status pill colours (same palette pattern as Partners module)
export const STATUS_COLORS = {
  new:           { bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE' }, // blue
  ready_to_plan: { bg: '#EEF2FF', fg: '#4338CA', bd: '#C7D2FE' }, // indigo
  planned:       { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#BFDBFE' }, // blue-darker
  in_transit:    { bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A' }, // amber
  completed:     { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' }, // green
  exception:     { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' }, // red
  split:         { bg: '#F5F3FF', fg: '#6D28D9', bd: '#DDD6FE' }, // purple
  archived:      { bg: '#F3F4F6', fg: '#6B7280', bd: '#D1D5DB' }, // gray
};

export const PRIORITY_COLORS = {
  urgent: { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA', icon: '⚡' },
  high:   { bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A', icon: '▲' },
  normal: { bg: 'transparent', fg: 'transparent', bd: 'transparent', icon: '' },
};

export const SOURCE_COLORS = {
  erp:        { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#BFDBFE', icon: '📥', labelKey: 'orders.source.erp' },
  manual:     { bg: '#F9FAFB', fg: '#374151', bd: '#E5E7EB', icon: '✏️', labelKey: 'orders.source.manual' },
  load_board: { bg: '#F5F3FF', fg: '#6D28D9', bd: '#DDD6FE', icon: '🚛', labelKey: 'orders.source.loadboard' },
};

// Product line items — compact structure, SKU + name + qty
function line(name, sku, qty, unit = 'pallets', weight = 0, weightUnit = 'kg') {
  return { id: `LN-${Math.random().toString(36).slice(2, 7)}`, name, sku, qty, unit, weight, weightUnit };
}

// Relative date helper — today offset by N days in ISO format
function relDay(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Order factory — minimal helper so we can define 30+ orders compactly
function mkOrder(id, opts) {
  return {
    id,
    erpNumber: opts.erpNumber || '',
    source: opts.source || 'erp',
    erpSystem: opts.erpSystem || (opts.source === 'erp' ? 'SAP' : ''),
    customer: opts.customer,
    customerId: opts.customerId || '',
    priority: opts.priority || 'normal',
    status: opts.status || 'new',
    shipFrom: opts.shipFrom,
    shipTo: opts.shipTo,
    orderDate: opts.orderDate || relDay(-3),
    shipDate: opts.shipDate,
    deliveryDate: opts.deliveryDate || opts.shipDate,
    lines: opts.lines || [],
    notes: opts.notes || '',
    linkedLoadId: opts.linkedLoadId || null,
    lastSync: opts.lastSync || (opts.source === 'erp' ? 'Just now' : '—'),
    syncOk: opts.syncOk !== false,
    groupId: opts.groupId || null,
    exception: opts.exception || null,
    splitFromId: opts.splitFromId || null,
    revenueValue: opts.revenueValue || 0,
  };
}

// ─── Mock orders ───
// Mix of sources, statuses, priorities, dates; some with qty>30 to trigger split hint;
// some dates today/tomorrow/+3 to trigger upcoming badges.
export const ORDERS = [
  mkOrder('ORD-0001', {
    erpNumber: 'SAP-4501789', source: 'erp', erpSystem: 'SAP',
    customer: 'Nestle S.A.', customerId: 'PR-080',
    priority: 'urgent', status: 'new',
    shipFrom: 'Athens Warehouse, Piraeus, GR',
    shipTo: 'Thessaloniki DC, Thessaloniki, GR',
    shipDate: relDay(0), deliveryDate: relDay(1),
    lines: [
      line('ΒΙΚΟΣ Natural water 500ml (x24)', '5201054001011', 22, 'pallets', 4400),
      line('ΒΙΚΟΣ Natural water 1.5L (x6)', '5201054001028', 6, 'pallets', 1200),
    ],
    notes: 'Delivery to cold-dock only. Call receiver 1h before arrival.',
    revenueValue: 1200,
  }),
  mkOrder('ORD-0002', {
    erpNumber: 'SAP-4501792', source: 'erp', erpSystem: 'SAP',
    customer: 'Σκλαβενίτης Α.Ε.Ε.', customerId: 'PR-081',
    priority: 'high', status: 'ready_to_plan',
    shipFrom: 'ΔΕΛΤΑ plant, Αγ. Στέφανος, GR',
    shipTo: 'Σκλαβενίτης DC, Ασπρόπυργος, GR',
    shipDate: relDay(1), deliveryDate: relDay(2),
    lines: [line('Fresh milk 1L (x6)', '5201093100115', 18, 'pallets', 9500, 'kg')],
    revenueValue: 2400,
  }),
  mkOrder('ORD-0003', {
    erpNumber: 'SAP-4501804', source: 'erp', erpSystem: 'SAP',
    customer: 'Lidl Hellas', customerId: 'PR-082',
    priority: 'normal', status: 'planned',
    shipFrom: 'Central warehouse, Mandra, GR',
    shipTo: 'Lidl DC Heraklion, Crete, GR',
    shipDate: relDay(2), deliveryDate: relDay(4),
    lines: [
      line('ΒΙΚΟΣ Soda Lemon 330ml (x24)', '5201054002018', 10, 'pallets', 2000),
      line('ΒΙΚΟΣ Soda Classic 330ml (x24)', '5201054002025', 12, 'pallets', 2400),
      line('Tasty Pasta Spaghetti 500g', '5201888991001', 8, 'pallets', 1800),
    ],
    linkedLoadId: 'LD-8821',
  }),
  mkOrder('ORD-0004', {
    erpNumber: 'DYN-002341', source: 'erp', erpSystem: 'Dynamics',
    customer: 'Jumbo Α.Ε.Ε.', customerId: 'PR-ERP-C2',
    priority: 'normal', status: 'in_transit',
    shipFrom: 'Ritsona hub, GR', shipTo: 'Jumbo Thessaloniki, GR',
    shipDate: relDay(-1), deliveryDate: relDay(1),
    lines: [line('Toy assortment pack', 'TOY-5500', 16, 'pallets', 3200)],
    linkedLoadId: 'LD-8822',
  }),
  mkOrder('ORD-0005', {
    erpNumber: 'SAP-4501811', source: 'erp', erpSystem: 'SAP',
    customer: 'Papadopoulos Bakery', customerId: 'PR-083',
    priority: 'high', status: 'exception',
    shipFrom: 'Papadopoulos factory, Tavros, GR',
    shipTo: 'Multiple stores, GR',
    shipDate: relDay(0), deliveryDate: relDay(0),
    lines: [line('Cream crackers 140g (x24)', '5201093100300', 5, 'pallets', 900)],
    syncOk: false,
    exception: 'Customer not found in receiving system. Verify account code.',
  }),
  mkOrder('ORD-0006', {
    source: 'manual',
    customer: 'FreshCo S.A.', customerId: 'PR-ERP-C1',
    priority: 'normal', status: 'new',
    shipFrom: 'Athens Warehouse, Piraeus, GR',
    shipTo: 'FreshCo Patras, GR',
    shipDate: relDay(3), deliveryDate: relDay(4),
    lines: [
      line('Frozen Veg Medley 1kg (x10)', '5201888991018', 12, 'pallets', 1260),
      line('Fresh produce box', 'PROD-001', 10, 'pallets', 2000),
    ],
  }),
  mkOrder('ORD-0007', {
    source: 'manual',
    customer: 'Attica Pharmacies Group', customerId: 'PR-084',
    priority: 'urgent', status: 'ready_to_plan',
    shipFrom: 'Vari pharma distribution, GR',
    shipTo: 'Attica pharmacies network, GR',
    shipDate: relDay(0), deliveryDate: relDay(1),
    lines: [line('Pharma assortment', 'PH-BULK', 4, 'pallets', 800)],
    notes: 'Temperature controlled 2-8°C. Monitored transport required.',
  }),
  mkOrder('ORD-0008', {
    source: 'load_board',
    customer: 'Χρύσα Foods Α.Ε.', customerId: 'PR-103',
    priority: 'normal', status: 'ready_to_plan',
    shipFrom: 'Thessaloniki hub, GR', shipTo: 'Athens DC, Metamorfosi, GR',
    shipDate: relDay(2), deliveryDate: relDay(3),
    lines: [
      line('Frozen vegetables (mixed)', 'FRZ-100', 14, 'pallets', 7000),
      line('Frozen meats', 'FRZ-200', 10, 'pallets', 5000),
    ],
    notes: 'Booked from public marketplace board.',
  }),
  mkOrder('ORD-0009', {
    source: 'load_board',
    customer: 'Hellenic Petroleum Α.Ε.', customerId: 'PR-ERP-S1',
    priority: 'normal', status: 'new',
    shipFrom: 'Elefsina refinery, GR', shipTo: 'Corinth depot, GR',
    shipDate: relDay(1), deliveryDate: relDay(1),
    lines: [line('Lubricant drums', 'LUB-205', 8, 'pallets', 4800)],
  }),
  mkOrder('ORD-0010', {
    erpNumber: 'SOFT-9921', source: 'erp', erpSystem: 'Soft1',
    customer: 'ΜΠΑΡΜΠΑ ΣΤΑΘΗΣ Α.Β.Ε.Ε.', customerId: 'PR-ERP-C1',
    priority: 'normal', status: 'new',
    shipFrom: 'Thessaloniki plant, GR', shipTo: 'National supermarket chains, GR',
    shipDate: relDay(3), deliveryDate: relDay(5),
    // Large order — qty > 30 → split suggestion
    lines: [
      line('Frozen spinach pie (x12)', '520194410001', 18, 'pallets', 4500),
      line('Frozen cheese pie (x12)', '520194410018', 14, 'pallets', 3600),
      line('Frozen puff pastry', '520194410025', 10, 'pallets', 2000),
    ],
  }),
  mkOrder('ORD-0011', {
    erpNumber: 'SAP-4501820', source: 'erp', erpSystem: 'SAP',
    customer: 'Nestle S.A.', customerId: 'PR-080',
    priority: 'normal', status: 'completed',
    shipFrom: 'Athens Warehouse, Piraeus, GR',
    shipTo: 'Nestle Patras warehouse, GR',
    shipDate: relDay(-8), deliveryDate: relDay(-7),
    lines: [line('Instant coffee 100g (x12)', '520194420001', 8, 'pallets', 1500)],
    linkedLoadId: 'LD-8790',
  }),
  mkOrder('ORD-0012', {
    erpNumber: 'SAP-4501831', source: 'erp', erpSystem: 'SAP',
    customer: 'Titan Cement International', customerId: 'PR-ERP-S2',
    priority: 'normal', status: 'in_transit',
    shipFrom: 'Halkida plant, GR', shipTo: 'Thiva construction, GR',
    shipDate: relDay(-1), deliveryDate: relDay(0),
    lines: [line('Cement bags (50kg)', 'CEM-50', 22, 'pallets', 22000)],
    linkedLoadId: 'LD-8819',
  }),
  mkOrder('ORD-0013', {
    source: 'manual',
    customer: 'Chrysa Foods Α.Ε.', customerId: 'PR-103',
    priority: 'normal', status: 'new',
    shipFrom: 'Thessaloniki hub, GR', shipTo: 'Chrysa Foods main DC, GR',
    shipDate: relDay(4), deliveryDate: relDay(5),
    lines: [line('Mixed grocery', 'GRC-MIX', 12, 'pallets', 3600)],
  }),
  mkOrder('ORD-0014', {
    erpNumber: 'NS-778311', source: 'erp', erpSystem: 'NetSuite',
    customer: 'Ι.ΚΛΟΥΚΙΝΑΣ-Ι.ΛΑΠΠΑΣ Α.Ε.', customerId: 'PR-ERP-C3',
    priority: 'high', status: 'ready_to_plan',
    shipFrom: 'Construction supplies hub, Aspropyrgos, GR',
    shipTo: 'Construction site, Kifisia, GR',
    shipDate: relDay(1), deliveryDate: relDay(2),
    lines: [
      line('Steel rebar bundles', 'STL-R14', 12, 'pallets', 18000),
      line('Construction adhesive', 'ADH-20', 6, 'pallets', 1800),
    ],
  }),
  mkOrder('ORD-0015', {
    source: 'load_board',
    customer: 'Euroline Forwarders', customerId: 'PR-106',
    priority: 'high', status: 'ready_to_plan',
    shipFrom: 'Thessaloniki port, GR', shipTo: 'Skopje DC, MK',
    shipDate: relDay(2), deliveryDate: relDay(3),
    lines: [line('Import containers, assorted', 'IMP-MIX', 20, 'pallets', 16000)],
  }),
  mkOrder('ORD-0016', {
    erpNumber: 'SAP-4501842', source: 'erp', erpSystem: 'SAP',
    customer: 'Lidl Hellas', customerId: 'PR-082',
    priority: 'normal', status: 'planned',
    shipFrom: 'Central warehouse, Mandra, GR',
    shipTo: 'Lidl DC Athens, Aspropyrgos, GR',
    shipDate: relDay(2), deliveryDate: relDay(2),
    lines: [
      line('ΒΙΚΟΣ Natural water 500ml (x24)', '5201054001011', 12, 'pallets', 2400),
      line('Private label snacks', 'LID-SNK-01', 10, 'pallets', 1500),
    ],
    linkedLoadId: 'LD-8823',
  }),
  mkOrder('ORD-0017', {
    source: 'manual',
    customer: 'Papadopoulos Bakery', customerId: 'PR-083',
    priority: 'normal', status: 'ready_to_plan',
    shipFrom: 'Papadopoulos factory, Tavros, GR',
    shipTo: 'Peloponnese retail tour, GR',
    shipDate: relDay(3), deliveryDate: relDay(4),
    lines: [line('Assortment pack', 'ASS-01', 8, 'pallets', 1600)],
  }),
  mkOrder('ORD-0018', {
    erpNumber: 'SAP-4501855', source: 'erp', erpSystem: 'SAP',
    customer: 'ΓΡΕΕΝΦΑΡΜ Φαρμακευτικά Α.Ε.', customerId: 'PR-107',
    priority: 'urgent', status: 'exception',
    shipFrom: 'GreenPharm warehouse, Koropi, GR',
    shipTo: 'Pharmacy network, Epirus, GR',
    shipDate: relDay(0), deliveryDate: relDay(1),
    lines: [line('Cold chain pharma', 'PH-CC-50', 3, 'pallets', 450)],
    syncOk: false,
    exception: 'Temperature sensor offline — requires manual verification before dispatch.',
  }),
  mkOrder('ORD-0019', {
    erpNumber: 'DYN-002401', source: 'erp', erpSystem: 'Dynamics',
    customer: 'Jumbo Α.Ε.Ε.', customerId: 'PR-ERP-C2',
    priority: 'normal', status: 'completed',
    shipFrom: 'Ritsona hub, GR', shipTo: 'Jumbo Patras, GR',
    shipDate: relDay(-6), deliveryDate: relDay(-4),
    lines: [line('Seasonal toys bulk', 'TOY-S-100', 10, 'pallets', 2000)],
    linkedLoadId: 'LD-8770',
  }),
  mkOrder('ORD-0020', {
    source: 'load_board',
    customer: 'GlobalShip Forwarders', customerId: 'PR-040',
    priority: 'high', status: 'new',
    shipFrom: 'Athens port, Piraeus, GR',
    shipTo: 'Sofia distribution, BG',
    shipDate: relDay(1), deliveryDate: relDay(3),
    lines: [
      line('FMCG export pallets', 'EXP-001', 16, 'pallets', 8800),
      line('Dry goods, mixed', 'EXP-DRY', 8, 'pallets', 4000),
    ],
  }),
];

// ─── Mock groups (forwarder only) ───
export const GROUPS = [
  { id: 'GRP-001', name: 'Athens-North weekly batch', orderIds: [], createdAt: relDay(-2) },
  { id: 'GRP-002', name: 'Cold chain — Mondays', orderIds: [], createdAt: relDay(-7) },
];

// ─── Seeded customers for the Create Order modal's "Customer" dropdown ───
// In production this pulls live from the Partners master. We mirror a subset.
export const SEEDED_CUSTOMERS = [
  { id: 'PR-080', name: 'FreshCo S.A.' },
  { id: 'PR-081', name: 'Σκλαβενίτης Α.Ε.Ε.' },
  { id: 'PR-082', name: 'Lidl Hellas' },
  { id: 'PR-083', name: 'Papadopoulos Bakery' },
  { id: 'PR-084', name: 'Attica Pharmacies Group' },
  { id: 'PR-ERP-C1', name: 'ΜΠΑΡΜΠΑ ΣΤΑΘΗΣ Α.Β.Ε.Ε.' },
  { id: 'PR-ERP-C2', name: 'Jumbo Α.Ε.Ε.' },
  { id: 'PR-ERP-C3', name: 'Ι.ΚΛΟΥΚΙΝΑΣ-Ι.ΛΑΠΠΑΣ Α.Ε.' },
  { id: 'PR-103', name: 'Chrysa Foods Α.Ε.' },
  { id: 'PR-107', name: 'ΓΡΕΕΝΦΑΡΜ Φαρμακευτικά Α.Ε.' },
];

// ─── Seeded locations (pulled from Address book in production) ───
export const SEEDED_LOCATIONS = [
  'Athens Warehouse, Piraeus, GR',
  'Thessaloniki hub, GR',
  'Central warehouse, Mandra, GR',
  'Ritsona hub, GR',
  'Thessaloniki DC, Thessaloniki, GR',
  'Lidl DC Athens, Aspropyrgos, GR',
  'Lidl DC Heraklion, Crete, GR',
  'Nestle Patras warehouse, GR',
  'FreshCo Patras, GR',
  'Chrysa Foods main DC, GR',
  'Construction site, Kifisia, GR',
  'Skopje DC, MK',
  'Sofia distribution, BG',
];

// ─── Seeded products (pulled from Product Master in production) ───
export const SEEDED_PRODUCTS = [
  { id: 'SKU-001', name: 'ΒΙΚΟΣ Natural water 500ml (x24)', sku: '5201054001011' },
  { id: 'SKU-002', name: 'ΒΙΚΟΣ Natural water 1.5L (x6)', sku: '5201054001028' },
  { id: 'SKU-003', name: 'ΒΙΚΟΣ Soda Lemon 330ml (x24)', sku: '5201054002018' },
  { id: 'SKU-004', name: 'ΒΙΚΟΣ Soda Classic 330ml (x24)', sku: '5201054002025' },
  { id: 'SKU-005', name: 'Fresh milk 1L (x6)', sku: '5201093100115' },
  { id: 'SKU-006', name: 'Cream crackers 140g (x24)', sku: '5201093100300' },
  { id: 'SKU-007', name: 'Tasty Pasta Spaghetti 500g', sku: '5201888991001' },
  { id: 'SKU-008', name: 'Frozen Veg Medley 1kg (x10)', sku: '5201888991018' },
  { id: 'SKU-009', name: 'Instant coffee 100g (x12)', sku: '520194420001' },
  { id: 'SKU-010', name: 'Cement bags (50kg)', sku: 'CEM-50' },
  { id: 'SKU-011', name: 'Steel rebar bundles', sku: 'STL-R14' },
];

export const UNITS = ['Pallets', 'Kg', 'Tons', 'Boxes', 'Pieces', 'Liters'];
export const WEIGHT_UNITS = ['kg', 't', 'lb'];

// Compute totals for an order — used in list cell and detail drawer
export function getOrderTotals(order) {
  const lines = order.lines || [];
  const pallets = lines.reduce((sum, l) => sum + (l.unit === 'pallets' ? (l.qty || 0) : 0), 0);
  const weightKg = lines.reduce((sum, l) => {
    if (l.weightUnit === 't') return sum + (l.weight || 0) * 1000;
    if (l.weightUnit === 'lb') return sum + (l.weight || 0) * 0.4536;
    return sum + (l.weight || 0);
  }, 0);
  return {
    lineCount: lines.length,
    pallets,
    weightKg: Math.round(weightKg),
    weightTons: +(weightKg / 1000).toFixed(1),
  };
}

// Number of days between today and a target date string (YYYY-MM-DD)
// Returns: 0 = today, 1 = tomorrow, negative = past, else days ahead
export function daysFromToday(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  const diffMs = target - today;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

// Should this order show a split suggestion? (> 30 pallets total)
export function shouldSuggestSplit(order) {
  return getOrderTotals(order).pallets > 30;
}

// Format ISO date as "DD MMM YYYY" for display (locale-aware via navigator)
export function formatShipDate(iso, locale = 'en-GB') {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── ERP Sync log for Orders ───
export const DEFAULT_ORDER_SYNC_LOG = [
  { id: 'SL-O1', ts: '2 min ago', action: 'Sync from SAP', orderId: 'ORD-0001', status: 'ok', detail: 'Updated ship date + 1 line item' },
  { id: 'SL-O2', ts: '2 min ago', action: 'Sync from SAP', orderId: 'ORD-0003', status: 'ok', detail: 'No changes detected' },
  { id: 'SL-O3', ts: '2 min ago', action: 'Sync from Dynamics', orderId: 'ORD-0004', status: 'ok', detail: 'Status updated to in_transit' },
  { id: 'SL-O4', ts: '15 min ago', action: 'Sync from SAP', orderId: 'ORD-0005', status: 'error', detail: 'Customer not found in receiving system' },
  { id: 'SL-O5', ts: '15 min ago', action: 'Sync from SAP', orderId: 'ORD-0018', status: 'error', detail: 'Temperature sensor offline' },
  { id: 'SL-O6', ts: '1 hour ago', action: 'Bulk sync', orderId: null, status: 'ok', detail: '12 orders synced, 0 errors' },
];

export function makeErpOrderSyncLogEntries(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => ({
    id: `SL-NEW-${now.getTime()}-${i}`,
    ts: 'Just now',
    action: 'Sync from ERP',
    orderId: `ORD-NEW-${i + 1}`,
    status: 'ok',
    detail: `Imported new order (${i + 1} of ${count})`,
  }));
}

export function makeErpOrderBatch() {
  const now = new Date();
  const relDay = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  return [
    {
      id: `ORD-ERP-${now.getTime()}-1`, erpNumber: `SAP-${900000 + Math.floor(Math.random() * 10000)}`,
      source: 'erp', erpSystem: 'SAP',
      customer: 'Metro Cash & Carry', customerId: 'PR-NEW-1',
      priority: 'normal', status: 'new',
      shipFrom: 'Central warehouse, Mandra, GR', shipTo: 'Metro DC, Thessaloniki, GR',
      orderDate: relDay(0), shipDate: relDay(3), deliveryDate: relDay(4),
      lines: [{ id: `LN-${now.getTime()}-1`, name: 'FMCG Assortment', sku: 'FMCG-MIX', qty: 14, unit: 'pallets', weight: 7000, weightUnit: 'kg' }],
      notes: '', linkedLoadId: null, lastSync: 'Just now', syncOk: true, groupId: null, exception: null, splitFromId: null,
    },
    {
      id: `ORD-ERP-${now.getTime()}-2`, erpNumber: `DYN-${600000 + Math.floor(Math.random() * 10000)}`,
      source: 'erp', erpSystem: 'Dynamics',
      customer: 'ΑΒ Βασιλόπουλος', customerId: 'PR-NEW-2',
      priority: 'high', status: 'ready_to_plan',
      shipFrom: 'Ritsona hub, GR', shipTo: 'ΑΒ DC Koropi, GR',
      orderDate: relDay(0), shipDate: relDay(2), deliveryDate: relDay(3),
      lines: [
        { id: `LN-${now.getTime()}-2a`, name: 'Dairy products (cold)', sku: 'DAIRY-CC', qty: 8, unit: 'pallets', weight: 4000, weightUnit: 'kg' },
        { id: `LN-${now.getTime()}-2b`, name: 'Bakery mix', sku: 'BAK-01', qty: 6, unit: 'pallets', weight: 1200, weightUnit: 'kg' },
      ],
      notes: 'Cold chain required', linkedLoadId: null, lastSync: 'Just now', syncOk: true, groupId: null, exception: null, splitFromId: null,
    },
  ];
}
