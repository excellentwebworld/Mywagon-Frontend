export const CATEGORY_ICONS = ['📦', '🍷🥨', '🧱', '⚗️', '🛒', '💻', '💊', '👕', '🔧', '🍭', '🍿', '🍶', '🧴', '🍕', '☕'];

export const UOM_OPTIONS = ['Case', 'Piece', 'Bag', 'Box', 'Can', 'Pallet'];

export const TEMP_OPTIONS = ['Ambient', '2–8°C', '15–25°C', '-18°C'];

export const PALLET_OPTIONS = ['EUR', 'Industrial', 'Chemical', 'Pharma'];

export const SYNC_LOGS = [
  { t: 'Today 14:32', s: 'SAP', a: 'Full sync', st: 'ok' as const, d: '14 SKUs synced' },
  { t: 'Today 14:32', s: 'SAP', a: 'Conflict', st: 'conflict' as const, d: 'SKU-015 name mismatch' },
  { t: 'Today 14:30', s: 'SAP', a: '2 new SKUs', st: 'pending' as const, d: 'Awaiting mapping' },
  { t: 'Today 08:15', s: 'Soft1', a: 'Sync OK', st: 'ok' as const, d: '2 SKUs synced' },
  { t: 'Today 08:15', s: 'Soft1', a: 'Error', st: 'error' as const, d: 'SKU-012 missing weight' },
];
