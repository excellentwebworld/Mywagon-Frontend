export const QTY_UNIT_OPTIONS = ['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags'] as const;
export const WEIGHT_UNIT_OPTIONS = ['Tonnes', 'Kgs'] as const;

export type QtyUnit = (typeof QTY_UNIT_OPTIONS)[number];
export type WeightUnit = (typeof WEIGHT_UNIT_OPTIONS)[number];

/** Optional i18n helper — keep English stored values; translate only for display. */
export type CargoUnitTranslate = (key: string, fallback?: string) => string;

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

/**
 * Display label for stored English cargo / measure units.
 * Values stay English in API/DB; only UI text is localized.
 */
export function translateCargoUnit(
  unit: string | null | undefined,
  t?: CargoUnitTranslate,
): string {
  const raw = String(unit || '').trim();
  if (!raw) return '';
  const key = qtyUnitLookupKey(raw);
  const tr = t ?? ((_k: string, fallback?: string) => fallback || raw);

  const map: Record<string, [string, string]> = {
    'eur pallets': ['constants.eur_pallets', 'EUR Pallets'],
    'eur pallet': ['constants.eur_pallets', 'EUR Pallets'],
    'us pallets': ['constants.us_pallets', 'US Pallets'],
    'us pallet': ['constants.us_pallets', 'US Pallets'],
    pallets: ['constants.eur_pallets', 'EUR Pallets'],
    pallet: ['constants.eur_pallets', 'EUR Pallets'],
    boxes: ['constants.boxes', 'Boxes'],
    box: ['constants.boxes', 'Boxes'],
    units: ['constants.units', 'Units'],
    unit: ['constants.units', 'Units'],
    'big bags': ['constants.big_bags', 'Big Bags'],
    'big bag': ['constants.big_bags', 'Big Bags'],
    tonnes: ['constants.tonnes', 'Tonnes'],
    tonne: ['constants.tonnes', 'Tonnes'],
    tons: ['constants.tonnes', 'Tonnes'],
    ton: ['constants.tonnes', 'Tonnes'],
    t: ['constants.tonnes', 'Tonnes'],
    kgs: ['constants.kgs', 'Kgs'],
    kg: ['constants.kgs', 'Kgs'],
    kilos: ['constants.kgs', 'Kgs'],
    κιλά: ['constants.kgs', 'Kgs'],
    km: ['unitKm', 'km'],
    χλμ: ['unitKm', 'km'],
    min: ['constants.min', 'min'],
    mins: ['constants.min', 'min'],
    minute: ['constants.min', 'min'],
    minutes: ['constants.min', 'min'],
    h: ['constants.hourShort', 'h'],
    hr: ['constants.hourShort', 'h'],
    hrs: ['constants.hourShort', 'h'],
    hour: ['constants.hourShort', 'h'],
    hours: ['constants.hourShort', 'h'],
  };

  const hit = map[key];
  if (hit) return tr(hit[0], hit[1]);
  return raw;
}

/** "50 EUR Pallets" / "2 Tonnes" — translate trailing unit token(s). */
export function formatQuantityWithTranslatedUnit(
  amount: string | number,
  unit: string | null | undefined,
  t?: CargoUnitTranslate,
): string {
  const label = translateCargoUnit(unit, t);
  const text = typeof amount === 'number' ? String(amount) : String(amount ?? '').trim();
  if (!text && !label) return '';
  if (!label) return text;
  if (!text) return label;
  return `${text} ${label}`;
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

export function formatWeightDisplay(
  weight: string | number | undefined,
  wtUnit?: string | null,
  t?: CargoUnitTranslate,
): string {
  const w = parseFloat(String(weight ?? '')) || 0;
  const unit = normalizeWeightUnit(wtUnit);
  const unitLabel = translateCargoUnit(unit, t);
  if (w <= 0) return `0 ${unitLabel}`;
  const rounded = Math.round(w * 100) / 100;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${value} ${unitLabel}`;
}

/** Format a kg total for summary labels (shows Tonnes when >= 1000 kg). */
export function formatWeightKgTotal(kg: number, t?: CargoUnitTranslate): string {
  if (kg <= 0) return `0 ${translateCargoUnit('Kgs', t)}`;
  if (kg >= 1000) {
    const tonnes = Math.round((kg / 1000) * 10) / 10;
    const value = Number.isInteger(tonnes) ? tonnes : tonnes.toFixed(1);
    return `${value} ${translateCargoUnit('Tonnes', t)}`;
  }
  const rounded = Math.round(kg * 10) / 10;
  const value = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `${value} ${translateCargoUnit('Kgs', t)}`;
}

export function formatDurationMin(minutes: number, t?: CargoUnitTranslate): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const hourLabel = translateCargoUnit('h', t);
  const minLabel = translateCargoUnit('min', t);
  if (h <= 0) return `${m}${minLabel}`;
  if (m <= 0) return `${h}${hourLabel}`;
  return `${h}${hourLabel} ${m}${minLabel}`;
}
