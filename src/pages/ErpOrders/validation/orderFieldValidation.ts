import { normalizeWeightUnit } from '../../../constants/cargoUnits';

export const ORDER_ID_MIN = 3;
export const ORDER_ID_MAX = 30;
export const ORDER_ID_PATTERN = /^[A-Z0-9\-_\/]+$/;
export const QTY_MIN = 1;
export const QTY_MAX = 99_999;
export const WEIGHT_DECIMALS_MAX = 3;
export const WEIGHT_MAX_BY_UNIT = {
  Kgs: 50_000,
  Tonnes: 100,
} as const;
export const ORDER_VALUE_MAX = 10_000_000;
export const ORDER_VALUE_DECIMALS_MAX = 2;
export const NOTES_MAX = 200;

/** Trim, uppercase, strip spaces/invalid chars; hard-cap at 30. */
export function sanitizeOrderIdInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9\-_\/]/g, '')
    .slice(0, ORDER_ID_MAX);
}

export function normalizeOrderId(value: string): string {
  return sanitizeOrderIdInput(value.trim());
}

export function isValidOrderId(value: string, opts: { required?: boolean } = {}): boolean {
  const required = opts.required === true;
  const v = normalizeOrderId(value);
  if (!v) return !required;
  return v.length >= ORDER_ID_MIN && v.length <= ORDER_ID_MAX && ORDER_ID_PATTERN.test(v);
}

/** Whole number qty 1–99999 (ignores decimals / non-digits). */
export function sanitizeQtyInput(value: string): string {
  const match = value.match(/^\d+/);
  const digits = match?.[0] ?? '';
  if (!digits) return '';
  const n = Number(digits);
  if (!Number.isFinite(n)) return '';
  if (n > QTY_MAX) return String(QTY_MAX);
  return digits.replace(/^0+(?=\d)/, '');
}

export function isValidQty(value: number | null | undefined): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  return Number.isInteger(value) && value >= QTY_MIN && value <= QTY_MAX;
}

export function getWeightMaxForUnit(unit?: string | null): number {
  return normalizeWeightUnit(unit) === 'Tonnes'
    ? WEIGHT_MAX_BY_UNIT.Tonnes
    : WEIGHT_MAX_BY_UNIT.Kgs;
}

/** Digits + one decimal separator; max 3 decimals. */
export function sanitizeWeightInput(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, '');
  const fracPart = cleaned
    .slice(sepIndex + 1)
    .replace(/[.,]/g, '')
    .slice(0, WEIGHT_DECIMALS_MAX);
  return `${intPart}${cleaned[sepIndex]}${fracPart}`;
}

export function parseWeightNumber(value: string): number | null {
  const raw = value.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function isValidLineWeight(
  weight: number | null | undefined,
  weightUnit?: string | null,
  opts: { required?: boolean } = {}
): boolean {
  const required = opts.required !== false;
  if (weight == null) return !required;
  if (!Number.isFinite(weight) || weight <= 0) return false;
  const normalized = String(weight);
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
    // Allow float representation with up to 3 meaningful decimals
    const rounded = Math.round(weight * 1000) / 1000;
    if (Math.abs(rounded - weight) > 1e-9) return false;
  }
  return weight <= getWeightMaxForUnit(weightUnit);
}

/** Order value: digits + one separator; max 2 decimals. */
export function sanitizeOrderValueInput(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, '');
  const fracPart = cleaned
    .slice(sepIndex + 1)
    .replace(/[.,]/g, '')
    .slice(0, ORDER_VALUE_DECIMALS_MAX);
  return `${intPart}${cleaned[sepIndex]}${fracPart}`;
}

export function parseOrderValueNumber(value: string): number | null {
  const raw = value.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function isValidOrderValue(value: number | null | undefined): boolean {
  if (value == null) return true;
  if (!Number.isFinite(value) || value < 0 || value > ORDER_VALUE_MAX) return false;
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded - value) < 1e-9;
}

export function sanitizeNotesInput(value: string): string {
  return value.slice(0, NOTES_MAX);
}

export function isValidNotes(value: string): boolean {
  return value.trim().length <= NOTES_MAX;
}
