/**
 * productMasterData.js — Mock data for Product Master page
 *
 * Contains:
 * - CATEGORIES: 8 default product categories with bilingual names + emoji icons
 * - PRODUCT_TYPES: 14 default product types linked to categories
 * - SKUS: 20 realistic Greek-market SKUs with ERP sync data
 * - DEFAULT_ICONS: 20 emoji icons for category creation
 * - SYNC_LOG: mock sync log entries
 * - UOM_OPTIONS / PALLET_OPTIONS / TEMP_OPTIONS: dropdown choices
 */

// 8 default categories with bilingual names
export const CATEGORIES = [
  { id: 'CAT-01', nameKey: 'cat_fnb', icon: '🍷' },
  { id: 'CAT-02', nameKey: 'cat_building', icon: '🧱' },
  { id: 'CAT-03', nameKey: 'cat_chemicals', icon: '⚗️' },
  { id: 'CAT-04', nameKey: 'cat_consumer', icon: '🛒' },
  { id: 'CAT-05', nameKey: 'cat_electronics', icon: '💻' },
  { id: 'CAT-06', nameKey: 'cat_pharma', icon: '💊' },
  { id: 'CAT-07', nameKey: 'cat_textiles', icon: '👕' },
  { id: 'CAT-08', nameKey: 'cat_automotive', icon: '🔧' },
];

// 14 product types
export const PRODUCT_TYPES = [
  { id: 'PT-01', catId: 'CAT-01', name: 'Bottled Water', description: 'Bottled water products of various sizes and brands', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 42, s90: 118 },
  { id: 'PT-02', catId: 'CAT-01', name: 'Carbonated Drinks', description: 'Carbonated soft drinks and sodas', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 28, s90: 85 },
  { id: 'PT-03', catId: 'CAT-01', name: 'Dairy Products', description: 'Fresh dairy including milk, yoghurt, and cheese', active: true, defaults: { tempRequired: true, temp: '2–8°C', adrRequired: false, adrClass: '', stackable: false, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 15, s90: 44 },
  { id: 'PT-04', catId: 'CAT-01', name: 'Frozen Foods', description: 'Frozen food products requiring -18°C storage', active: true, defaults: { tempRequired: true, temp: '-18°C', adrRequired: false, adrClass: '', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 10, s90: 31 },
  { id: 'PT-05', catId: 'CAT-01', name: 'Snacks & Confectionery', description: 'Shelf-stable snacks, biscuits, and confectionery', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 8, s90: 22 },
  { id: 'PT-06', catId: 'CAT-02', name: 'Cement & Aggregates', description: 'Bagged cement, mortar, and construction aggregates', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: false, palletType: 'Industrial', dimensions: { l: '', w: '', h: '' } }, s30: 6, s90: 20 },
  { id: 'PT-07', catId: 'CAT-02', name: 'Steel & Metal', description: 'Steel rods, beams, and metal sheets', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: false, palletType: 'Industrial', dimensions: { l: '600', w: '10', h: '10' } }, s30: 4, s90: 14 },
  { id: 'PT-08', catId: 'CAT-03', name: 'Industrial Solvents', description: 'Flammable industrial solvents and thinners', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: true, adrClass: '3 — Flammable liquids', stackable: false, palletType: 'Chemical', dimensions: { l: '', w: '', h: '' } }, s30: 3, s90: 9 },
  { id: 'PT-09', catId: 'CAT-03', name: 'Cleaning Agents', description: 'Industrial and household cleaning chemicals', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: true, adrClass: '8 — Corrosive substances', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 5, s90: 16 },
  { id: 'PT-10', catId: 'CAT-04', name: 'Personal Care', description: 'Skincare, hygiene, and personal care products', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 7, s90: 21 },
  { id: 'PT-11', catId: 'CAT-04', name: 'Household Appliances', description: 'Small and medium household electrical appliances', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: false, palletType: 'EUR', dimensions: { l: '80', w: '60', h: '80' } }, s30: 3, s90: 10 },
  { id: 'PT-12', catId: 'CAT-01', name: 'Olive Oil & Condiments', description: 'Olive oil, vinegar, sauces and condiments', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: true, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } }, s30: 6, s90: 19 },
  { id: 'PT-13', catId: 'CAT-06', name: 'OTC Medications', description: 'Over-the-counter pharmaceuticals and supplements', active: true, defaults: { tempRequired: true, temp: '15–25°C', adrRequired: false, adrClass: '', stackable: true, palletType: 'Pharma', dimensions: { l: '', w: '', h: '' } }, s30: 2, s90: 8 },
  { id: 'PT-14', catId: 'CAT-05', name: 'Consumer Electronics', description: 'Tablets, phones, laptops and accessories', active: true, defaults: { tempRequired: false, temp: 'Ambient', adrRequired: false, adrClass: '', stackable: false, palletType: 'EUR', dimensions: { l: '50', w: '40', h: '30' } }, s30: 4, s90: 12 },
];

// 20 realistic SKUs covering all sync statuses (ok/pending/error/conflict) + 2 unmapped + 1 inactive
export const SKUS = [
  { id: 'SKU-001', name: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', description: 'Natural mineral water from Vikos springs, 500ml PET bottles, shrink-wrapped case of 24', number: '5201054001011', barcode: '5201054001011', catId: 'CAT-01', typeId: 'PT-01', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-001011', lastSync: '2h ago', status: 'ok', error: '' }, weight: '12.5 kg', uom: 'Case', tags: ['Fast-mover'], shipments30: 8, shipments90: 24, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '40', w: '27', h: '22' } },
  { id: 'SKU-002', name: 'ΒΙΚΟΣ Φυσικό Νερό 1.5L (x6)', description: 'Natural mineral water, 1.5L PET bottles, pack of 6', number: '5201054001028', barcode: '5201054001028', catId: 'CAT-01', typeId: 'PT-01', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-001028', lastSync: '2h ago', status: 'ok', error: '' }, weight: '9.2 kg', uom: 'Case', tags: ['Fast-mover'], shipments30: 12, shipments90: 34, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '35', w: '23', h: '32' } },
  { id: 'SKU-003', name: 'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)', description: 'Lemon-flavoured sparkling water, 330ml cans, tray of 24', number: '5201054002018', barcode: '5201054002018', catId: 'CAT-01', typeId: 'PT-02', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-002018', lastSync: '2h ago', status: 'ok', error: '' }, weight: '8.4 kg', uom: 'Case', tags: [], shipments30: 6, shipments90: 18, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '40', w: '27', h: '13' } },
  { id: 'SKU-004', name: 'ΒΙΚΟΣ Σόδα Classic 330ml (x24)', description: '', number: '5201054002025', barcode: '5201054002025', catId: 'CAT-01', typeId: 'PT-02', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-002025', lastSync: '2h ago', status: 'ok', error: '' }, weight: '8.4 kg', uom: 'Case', tags: [], shipments30: 7, shipments90: 20, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-005', name: 'ΒΙΚΟΣ Φυσ. Μεταλ. Νερό 750ml (x12)', description: '', number: '5201054001035', barcode: '5201054001035', catId: 'CAT-01', typeId: 'PT-01', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-001035', lastSync: '5h ago', status: 'ok', error: '' }, weight: '9.8 kg', uom: 'Case', tags: ['Premium'], shipments30: 4, shipments90: 11, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-006', name: 'ΔΕΛΤΑ Γάλα Πλήρες 1L (x12)', description: 'Full-fat fresh milk, 1L Tetra Pak cartons, case of 12', number: '5201054060012', barcode: '5201054060012', catId: 'CAT-01', typeId: 'PT-03', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-060012', lastSync: '1d ago', status: 'ok', error: '' }, weight: '12.8 kg', uom: 'Case', tags: ['Chilled'], shipments30: 9, shipments90: 27, tempRequired: true, tempValue: '2–8°C', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '38', w: '25', h: '26' } },
  { id: 'SKU-007', name: 'ΦΑΓΕ Γιαούρτι Total 1kg (x6)', description: 'Greek strained yoghurt, 1kg tubs, case of 6', number: '5201054060029', barcode: '5201054060029', catId: 'CAT-01', typeId: 'PT-03', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-060029', lastSync: '1d ago', status: 'ok', error: '' }, weight: '6.5 kg', uom: 'Case', tags: ['Chilled'], shipments30: 5, shipments90: 15, tempRequired: true, tempValue: '2–8°C', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-008', name: 'Κρις Κρις Frozen Pizza (x8)', description: '', number: '5201054070011', barcode: '5201054070011', catId: 'CAT-01', typeId: 'PT-04', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-070011', lastSync: '3d ago', status: 'pending', error: '' }, weight: '4.2 kg', uom: 'Case', tags: ['Frozen'], shipments30: 3, shipments90: 9, tempRequired: true, tempValue: '-18°C', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-009', name: 'Παπαδοπούλου Μπισκότα Μιράντα (x16)', description: '', number: '5201054080018', barcode: '5201054080018', catId: 'CAT-01', typeId: 'PT-05', source: 'manual', active: true, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '3.8 kg', uom: 'Case', tags: [], shipments30: 2, shipments90: 8, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-010', name: 'ΕΛΑΪΣ Ελαιόλαδο Extra Virgin 1L (x12)', description: 'Premium extra virgin olive oil, 1L glass bottles', number: '5201054090014', barcode: '5201054090014', catId: 'CAT-01', typeId: 'PT-12', source: 'manual', active: true, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '11.5 kg', uom: 'Case', tags: ['Premium'], shipments30: 6, shipments90: 19, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '36', w: '24', h: '30' } },
  { id: 'SKU-011', name: 'ΤΙΤΑΝ Τσιμέντο Γκρι 25kg', description: 'Portland grey cement, 25kg bag', number: '5201999010011', barcode: '5201999010011', catId: 'CAT-02', typeId: 'PT-06', source: 'erp', active: true, erp: { system: 'Soft1', extId: 'CEM-010011', lastSync: '6h ago', status: 'ok', error: '' }, weight: '25 kg', uom: 'Big_Bag', tags: ['Heavy'], shipments30: 5, shipments90: 16, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '50', w: '30', h: '15' } },
  { id: 'SKU-012', name: 'Χαλύβδινη Ράβδος Φ12 (6m)', description: 'Reinforcement steel bar, 12mm diameter, 6m length', number: '5201999020018', barcode: '', catId: 'CAT-02', typeId: 'PT-07', source: 'erp', active: true, erp: { system: 'Soft1', extId: 'STL-020018', lastSync: '1d ago', status: 'error', error: 'Missing weight field in ERP' }, weight: '', uom: 'Piece', tags: ['Long-load'], shipments30: 2, shipments90: 6, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '600', w: '1.2', h: '1.2' } },
  { id: 'SKU-013', name: 'Ασετόν Βιομηχανικό 5L', description: 'Industrial-grade acetone, 5L canister', number: '5201999030015', barcode: '5201999030015', catId: 'CAT-03', typeId: 'PT-08', source: 'manual', active: true, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '4.8 kg', uom: 'Tank', tags: ['ADR'], shipments30: 1, shipments90: 4, tempRequired: false, tempValue: '', adrRequired: true, adrClass: '3 — Flammable liquids', stackable: false, dimensions: { l: '20', w: '15', h: '25' } },
  { id: 'SKU-014', name: 'Ajax Καθ. Γενικής Χρήσης 4L (x4)', description: '', number: '5201999040012', barcode: '5201999040012', catId: 'CAT-03', typeId: 'PT-09', source: 'erp', active: true, erp: { system: 'SAP', extId: 'CLN-040012', lastSync: '12h ago', status: 'ok', error: '' }, weight: '16.5 kg', uom: 'Case', tags: [], shipments30: 3, shipments90: 10, tempRequired: false, tempValue: '', adrRequired: true, adrClass: '8 — Corrosive substances', stackable: true, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-015', name: 'Nivea Body Lotion 400ml (x12)', description: '', number: '5201999050019', barcode: '5201999050019', catId: 'CAT-04', typeId: 'PT-10', source: 'erp', active: true, erp: { system: 'SAP', extId: 'PC-050019', lastSync: '2d ago', status: 'conflict', error: 'Name mismatch: ERP="NIVEA Body Milk 400ml"' }, weight: '5.2 kg', uom: 'Case', tags: [], shipments30: 4, shipments90: 12, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-016', name: 'Samsung Galaxy Tab A9 (Box)', description: 'Samsung tablet A9 retail box, individually packed', number: '8806095360911', barcode: '8806095360911', catId: 'CAT-05', typeId: 'PT-14', source: 'erp', active: true, erp: { system: 'BC', extId: 'ELEC-360911', lastSync: '4d ago', status: 'ok', error: '' }, weight: '0.48 kg', uom: 'Piece', tags: ['Fragile'], shipments30: 2, shipments90: 7, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '25', w: '17', h: '4' } },
  { id: 'SKU-017', name: 'Depon Maximum 1000mg (x30)', description: 'Paracetamol tablets 1000mg, box of 30 blisters', number: '5201054130014', barcode: '5201054130014', catId: 'CAT-06', typeId: 'PT-13', source: 'erp', active: true, erp: { system: 'Epsilon', extId: 'PH-130014', lastSync: '7d ago', status: 'ok', error: '' }, weight: '0.15 kg', uom: 'Box', tags: ['Pharma'], shipments30: 2, shipments90: 8, tempRequired: true, tempValue: '15–25°C', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '12', w: '8', h: '3' } },
  { id: 'SKU-018', name: 'ERP New Item — Unmapped #1', description: '', number: '5209999990011', barcode: '', catId: 'CAT-01', typeId: '', source: 'erp', active: true, erp: { system: 'SAP', extId: 'NEW-990011', lastSync: '30m ago', status: 'ok', error: '' }, weight: '', uom: '', tags: ['Unmapped'], shipments30: 0, shipments90: 0, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-019', name: 'ERP New Item — Unmapped #2', description: '', number: '5209999990028', barcode: '', catId: 'CAT-04', typeId: '', source: 'erp', active: true, erp: { system: 'SAP', extId: 'NEW-990028', lastSync: '30m ago', status: 'ok', error: '' }, weight: '', uom: '', tags: ['Unmapped'], shipments30: 0, shipments90: 0, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '', w: '', h: '' } },
  { id: 'SKU-020', name: 'Παλιό Προϊόν — Inactive', description: '', number: '5201054099099', barcode: '5201054099099', catId: 'CAT-01', typeId: 'PT-05', source: 'manual', active: false, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '2.1 kg', uom: 'Case', tags: ['Discontinued'], shipments30: 0, shipments90: 0, tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '', w: '', h: '' } },
];

export const DEFAULT_ICONS = ['📦','🏭','🌿','🎨','📐','🧪','🧊','🔩','📱','🍔','🏗️','🧴','🛡️','🎁','🚚','🧲','🥤','🌾','💎','🎵'];

export const UOM_OPTIONS = ['EUR_Pallet','Industrial_Pallet','Case','Box','Piece','Big_Bag','Tank'];
export const PALLET_OPTIONS = ['EUR','Industrial','Chemical','Pharma'];
export const TEMP_OPTIONS = ['Ambient','2–8°C','15–25°C','-18°C'];
export const ADR_CLASSES = [
  '1 — Explosives',
  '2 — Gases',
  '3 — Flammable liquids',
  '4.1 — Flammable solids',
  '4.2 — Spontaneously combustible',
  '4.3 — Dangerous when wet',
  '5.1 — Oxidizing substances',
  '5.2 — Organic peroxides',
  '6.1 — Toxic substances',
  '6.2 — Infectious substances',
  '7 — Radioactive material',
  '8 — Corrosive substances',
  '9 — Miscellaneous',
];

// Mock sync log entries (for Sync Log panel)
export const SYNC_LOG = [
  { id: 'SL-001', ts: '2026-04-16 07:12', status: 'ok', skuId: 'SKU-001', system: 'SAP', msg: 'SKU synced successfully.' },
  { id: 'SL-002', ts: '2026-04-16 07:11', status: 'conflict', skuId: 'SKU-015', system: 'SAP', msg: 'Name mismatch: ERP="NIVEA Body Milk 400ml" vs MYVAGON="Nivea Body Lotion 400ml"' },
  { id: 'SL-003', ts: '2026-04-16 06:55', status: 'error', skuId: 'SKU-012', system: 'Soft1', msg: 'Missing weight field in ERP payload.' },
  { id: 'SL-004', ts: '2026-04-16 06:42', status: 'pending', skuId: 'SKU-008', system: 'SAP', msg: 'Pending full sync — batch scheduled.' },
  { id: 'SL-005', ts: '2026-04-16 06:30', status: 'ok', skuId: 'SKU-002', system: 'SAP', msg: 'SKU synced successfully.' },
  { id: 'SL-006', ts: '2026-04-16 06:15', status: 'ok', skuId: 'SKU-018', system: 'SAP', msg: 'New ERP item received — needs type mapping.' },
  { id: 'SL-007', ts: '2026-04-16 06:00', status: 'ok', skuId: 'SKU-019', system: 'SAP', msg: 'New ERP item received — needs type mapping.' },
  { id: 'SL-008', ts: '2026-04-15 22:10', status: 'ok', skuId: 'SKU-014', system: 'SAP', msg: 'SKU synced successfully.' },
];

export function getEmptyType() {
  return { catId: '', name: '', description: '', temp: 'Ambient', tempRequired: false, adrRequired: false, adrClass: '', stackable: false, palletType: 'EUR', dimensions: { l: '', w: '', h: '' } };
}
export function getEmptySKU() {
  return { catId: '', typeId: '', name: '', description: '', number: '', barcode: '', uom: 'Case', weight: '', active: true, tags: '', tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '', w: '', h: '' } };
}
export function getEmptyCategory() {
  return { name: '', icon: '📦' };
}

// ERP sync — mock batch of new SKUs appearing from an ERP pull.
// Used by ProductMaster's "ERP Sync → Sync now" action. The function
// uses Date.now() in IDs so repeated syncs keep adding fresh items,
// but the extId field (MAT-999xxx range) is stable so the page can
// dedupe if it wants to.
export function makeErpSkuBatch() {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ');
  const recent = 'just now';
  return [
    {
      id: `SKU-ERP-${Date.now()}-1`, name: 'Tasty Pasta Spaghetti 500g (x24)',
      description: '', number: '5201888991001', barcode: '5201888991001',
      catId: 'CAT-01', typeId: 'PT-05', source: 'erp', active: true,
      erp: { system: 'SAP', extId: 'MAT-991001', lastSync: recent, status: 'ok', error: '' },
      weight: '12.4 kg', uom: 'Case', tags: ['Dry goods'], shipments30: 0, shipments90: 0,
      tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' },
    },
    {
      id: `SKU-ERP-${Date.now()}-2`, name: 'Frozen Veg Medley 1kg (x10)',
      description: '', number: '5201888991018', barcode: '5201888991018',
      catId: 'CAT-01', typeId: 'PT-04', source: 'erp', active: true,
      erp: { system: 'SAP', extId: 'MAT-991018', lastSync: recent, status: 'ok', error: '' },
      weight: '10.5 kg', uom: 'Case', tags: ['Frozen'], shipments30: 0, shipments90: 0,
      tempRequired: true, tempValue: '-18°C', adrRequired: false, adrClass: '', stackable: true, dimensions: { l: '', w: '', h: '' },
    },
    {
      id: `SKU-ERP-${Date.now()}-3`, name: 'Household Liquid Soap 5L',
      description: '', number: '5201999991025', barcode: '',
      catId: 'CAT-03', typeId: 'PT-09', source: 'erp', active: true,
      erp: { system: 'Soft1', extId: 'CLN-991025', lastSync: recent, status: 'ok', error: '' },
      weight: '5.3 kg', uom: 'Tank', tags: [], shipments30: 0, shipments90: 0,
      tempRequired: false, tempValue: '', adrRequired: false, adrClass: '', stackable: false, dimensions: { l: '', w: '', h: '' },
    },
  ];
}

// Sync log entries to append when a sync runs. Parent page prepends these
// into its syncLog state so the panel shows the new run at the top.
export function makeErpSyncLogEntries(skuCount) {
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return [
    { id: `SL-NEW-${Date.now()}`, ts, status: 'ok', skuId: '—', system: 'SAP',
      msg: `Sync completed successfully — ${skuCount} new SKU(s) imported.` },
  ];
}
