/** Location form field limits and input sanitizers. */

export const LOCATION_NAME_MAX = 30;
export const LOCATION_POSTAL_MAX = 10;
export const LOCATION_CODE_MAX = 10;
export const MAX_TRUCK_LENGTH_M = 25;
export const MAX_WEIGHT_T = 100;
export const DECIMAL_PLACES_MAX = 2;
export const NOTE_MAX = 500;

/** Letters, digits, spaces only — no special characters; max 30. */
export function sanitizeLocationNameInput(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s]/gu, '').slice(0, LOCATION_NAME_MAX);
}

export function isValidLocationName(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.length > LOCATION_NAME_MAX) return false;
  return /^[\p{L}\p{N}\s]+$/u.test(v);
}

/** Digits only, max 10. */
export function sanitizePostalCodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, LOCATION_POSTAL_MAX);
}

export function isValidPostalCode(value: string): boolean {
  const v = value.trim();
  if (!v) return true; // optional
  return /^\d{1,10}$/.test(v);
}

/** Letters, digits, and special characters; max 10. */
export function sanitizeInternalCodeInput(value: string): string {
  return value.slice(0, LOCATION_CODE_MAX);
}

export function isValidInternalCode(value: string): boolean {
  const v = value.trim();
  if (!v) return true; // optional
  return v.length <= LOCATION_CODE_MAX;
}

/**
 * Decimal input: digits + one separator, up to `maxDecimals` places.
 * Blocks e / + / letters.
 */
export function sanitizeDecimalInput(value: string, maxDecimals = DECIMAL_PLACES_MAX): string {
  const cleaned = value.replace(/[^0-9.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, '');
  const fracPart = cleaned
    .slice(sepIndex + 1)
    .replace(/[.,]/g, '')
    .slice(0, maxDecimals);
  return `${intPart}${cleaned[sepIndex]}${fracPart}`;
}

export function isValidBoundedDecimal(
  value: string | undefined | null,
  max: number,
  opts: { optional?: boolean; decimals?: number } = {}
): boolean {
  const optional = opts.optional !== false;
  const decimals = opts.decimals ?? DECIMAL_PLACES_MAX;
  if (value === undefined || value === null) return optional;
  const raw = String(value).trim();
  if (!raw) return optional;
  if (/[eE+]/.test(raw)) return false;
  const normalized = raw
    .replace(/,/g, '.')
    .replace(/\s*(m|t|tons?|kg)$/i, '')
    .trim();
  const decimalRe = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!decimalRe.test(normalized)) return false;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 && n <= max;
}

export function sanitizeNoteInput(value: string): string {
  return value.slice(0, NOTE_MAX);
}

export function isValidNote(value: string): boolean {
  return value.trim().length <= NOTE_MAX;
}
