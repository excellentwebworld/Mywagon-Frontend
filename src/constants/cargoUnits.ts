export const QTY_UNIT_OPTIONS = ['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags'] as const;
export const WEIGHT_UNIT_OPTIONS = ['Tonnes', 'Kgs'] as const;

export type QtyUnit = (typeof QTY_UNIT_OPTIONS)[number];
export type WeightUnit = (typeof WEIGHT_UNIT_OPTIONS)[number];

const QTY_UNIT_ALIASES: Record<string, QtyUnit> = {
  pallet: 'EUR Pallets',
  pallets: 'EUR Pallets',
  'eur pallet': 'EUR Pallets',
  'eur pallets': 'EUR Pallets',
  'euro pallet': 'EUR Pallets',
  'euro pallets': 'EUR Pallets',
  epal: 'EUR Pallets',
  epals: 'EUR Pallets',
  'us pallet': 'US Pallets',
  'us pallets': 'US Pallets',
  'american pallet': 'US Pallets',
  'american pallets': 'US Pallets',
  box: 'Boxes',
  boxes: 'Boxes',
  case: 'Boxes',
  cases: 'Boxes',
  unit: 'Units',
  units: 'Units',
  piece: 'Units',
  pieces: 'Units',
  'big bag': 'Big Bags',
  'big bags': 'Big Bags',
  bigbag: 'Big Bags',
  bigbags: 'Big Bags',
};

function qtyUnitLookupKey(unit: string): string {
  return unit.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize ERP / legacy qty units to wizard options.
 * Bare "Pallets" maps to "EUR Pallets" so load balance and allocation stay aligned.
 */
export function normalizeQtyUnit(unit?: string | null): string {
  const raw = (unit || '').trim();
  if (!raw) return '';
  const key = qtyUnitLookupKey(raw);
  const exact = QTY_UNIT_OPTIONS.find((opt) => qtyUnitLookupKey(opt) === key);
  if (exact) return exact;
  if (QTY_UNIT_ALIASES[key]) return QTY_UNIT_ALIASES[key];
  if (key.includes('us') && key.includes('pallet')) return 'US Pallets';
  if (key.includes('pallet')) return 'EUR Pallets';
  if (key.includes('box') || key.includes('case')) return 'Boxes';
  if (key.includes('bag')) return 'Big Bags';
  return raw;
}

/** Normalize ERP / legacy values to wizard weight unit options (same as Create ERP Order). */
export function normalizeWeightUnit(unit?: string | null): WeightUnit {
  const u = (unit || '').toLowerCase().trim();
  if (u === 't' || u === 'ton' || u === 'tons' || u === 'tonne' || u === 'tonnes') {
    return 'Tonnes';
  }
  return 'Kgs';
}

export function mapErpWeightUnit(unit?: string | null): WeightUnit {
  return normalizeWeightUnit(unit);
}

export function weightToKg(weight: string | number | undefined, wtUnit?: string | null): number {
  const w = parseFloat(String(weight ?? '')) || 0;
  if (normalizeWeightUnit(wtUnit) === 'Tonnes') {
    return w * 1000;
  }
  return w;
}

/** Convert a weight magnitude between wizard weight units (Kgs ↔ Tonnes). */
export function convertWeightValue(
  weight: string | number | undefined,
  fromUnit?: string | null,
  toUnit?: string | null,
): number {
  const kg = weightToKg(weight, fromUnit);
  if (normalizeWeightUnit(toUnit) === 'Tonnes') {
    return Math.round((kg / 1000) * 1000) / 1000;
  }
  return Math.round(kg * 1000) / 1000;
}

/** Convert kg total into a display magnitude for the given wizard weight unit. */
export function kgToWeightUnit(kg: number, wtUnit?: string | null): number {
  if (normalizeWeightUnit(wtUnit) === 'Tonnes') {
    return Math.round((kg / 1000) * 1000) / 1000;
  }
  return Math.round(kg * 1000) / 1000;
}

export function formatWeightDisplay(weight: string | number | undefined, wtUnit?: string | null): string {
  const w = parseFloat(String(weight ?? '')) || 0;
  const unit = normalizeWeightUnit(wtUnit);
  if (w <= 0) return `0 ${unit}`;
  const rounded = Math.round(w * 100) / 100;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${value} ${unit}`;
}

/** Format a kg total for summary labels (shows Tonnes when >= 1000 kg). */
export function formatWeightKgTotal(kg: number): string {
  if (kg <= 0) return '0 Kgs';
  if (kg >= 1000) {
    const tonnes = Math.round((kg / 1000) * 10) / 10;
    return `${Number.isInteger(tonnes) ? tonnes : tonnes.toFixed(1)} Tonnes`;
  }
  const rounded = Math.round(kg * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} Kgs`;
}
