/**
 * Validates that an optional string input represents a strictly positive measurement (> 0).
 * Handles numbers with or without decimal points, commas, and unit suffixes (e.g. "kg", "m", "t", "tons", "g", "lbs", "oz").
 */
export function isPositiveMeasurement(
  value: string | number | undefined | null,
  suffixRegex: RegExp = /(m|t|tons?|kg|g|lbs?|oz)$/i
): boolean {
  if (value === undefined || value === null) return true;
  const str = String(value).trim();
  if (!str) return true;
  if (str.startsWith('-')) return false;
  const cleaned = str.replace(/,/g, '.').replace(suffixRegex, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0;
}
