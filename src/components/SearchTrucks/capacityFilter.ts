import { normalizeQtyUnit } from '../../constants/cargoUnits';
import type { CapacityFilterMode } from '../../pages/SearchTrucks/types';

const CAPACITY_MAX_DIGITS = 5;

/** Digits only, at most 5. Drops decimals and any other characters. */
export function sanitizeCapacityDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, CAPACITY_MAX_DIGITS);
}

export function parseCapacityBound(value: string | undefined): number | null {
  const raw = (value ?? '').trim();
  if (!/^\d{1,5}$/.test(raw)) return null;
  return Number(raw);
}

/** Null, missing, or non-positive qty means the poster did not declare capacity. */
export function isUnspecifiedCapacity(capVal: number | null | undefined): boolean {
  return capVal == null || !Number.isFinite(capVal) || capVal <= 0;
}

export function capacityRangeError(
  minCapacity: string | undefined,
  maxCapacity: string | undefined
): boolean {
  const min = parseCapacityBound(minCapacity);
  const max = parseCapacityBound(maxCapacity);
  return min != null && max != null && max < min;
}

function capacityUnitsMatch(capUnit: string | null | undefined, filterUnit: string | undefined): boolean {
  const wanted = normalizeQtyUnit(filterUnit);
  if (!wanted) return true;
  const actual = normalizeQtyUnit(capUnit);
  return actual !== '' && actual === wanted;
}

/**
 * Declared mode with no bounds keeps posts that have a positive qty.
 * A selected unit limits that match to the same unit.
 * Include-unspecified only widens an active range or unit; it does not match everything.
 */
export function matchesCapacityFilter(input: {
  capVal: number | null | undefined;
  capUnit?: string | null;
  mode?: CapacityFilterMode;
  minCapacity?: string;
  maxCapacity?: string;
  capacityUnit?: string;
  includeUnspecified?: boolean;
}): boolean {
  const mode = input.mode ?? 'any';
  if (mode === 'any') return true;

  const unspecified = isUnspecifiedCapacity(input.capVal);
  if (mode === 'unspecified') return unspecified;

  const min = parseCapacityBound(input.minCapacity);
  const max = parseCapacityBound(input.maxCapacity);
  const hasUnit = Boolean(normalizeQtyUnit(input.capacityUnit));
  const inRange =
    !unspecified &&
    capacityUnitsMatch(input.capUnit, input.capacityUnit) &&
    (min == null || (input.capVal as number) >= min) &&
    (max == null || (input.capVal as number) <= max);
  if (inRange) return true;

  const hasBound = min != null || max != null || hasUnit;
  return Boolean(input.includeUnspecified) && hasBound && unspecified;
}
