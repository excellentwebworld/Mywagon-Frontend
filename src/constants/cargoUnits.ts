export const QTY_UNIT_OPTIONS = ['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags'] as const;
export const WEIGHT_UNIT_OPTIONS = ['Tonnes', 'Kgs'] as const;

export type QtyUnit = (typeof QTY_UNIT_OPTIONS)[number];
export type WeightUnit = (typeof WEIGHT_UNIT_OPTIONS)[number];

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
