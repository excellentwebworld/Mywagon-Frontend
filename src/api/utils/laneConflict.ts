import type { LaneLike } from './laneMetricDisplay';
import { stopsAreSamePlace } from '../../pages/PriceLists/pricelists/mapGooglePlaceToLaneStop';

export function normalizeLaneDate(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim().slice(0, 10);
  return trimmed || null;
}

/** Default missing start dates to today for conflict checks (matches CSV import). */
export function resolveConflictEffectiveFrom(value?: string | null): string {
  return normalizeLaneDate(value) || new Date().toISOString().slice(0, 10);
}

export function dateRangesOverlap(
  existingStart: string | null,
  existingEnd: string | null,
  newStart: string | null,
  newEnd: string | null,
): boolean {
  if (!existingStart || !newStart) return false;
  const leftEnd = existingEnd || '9999-12-31';
  const rightEnd = newEnd || '9999-12-31';
  return existingStart <= rightEnd && newStart <= leftEnd;
}

export function scopesOverlap(
  existingScope: string,
  existingPartnerIds: string[],
  existingDirection: string | null | undefined,
  newScope: string,
  newPartnerIds: string[],
  newDirection: string | null | undefined,
): boolean {
  if (existingDirection && newDirection && existingDirection !== newDirection) {
    return false;
  }

  if (existingScope === 'default' || newScope === 'default') {
    return true;
  }

  const left = existingPartnerIds.map(String).filter(Boolean);
  const right = newPartnerIds.map(String).filter(Boolean);
  if (left.length === 0 || right.length === 0) return false;
  return left.some((id) => right.includes(id));
}

function endpointStopsMatch(
  candidateStops: Array<Record<string, unknown> | null | undefined>,
  existingStops: Array<Record<string, unknown> | null | undefined>,
): boolean {
  if (candidateStops.length < 2 || existingStops.length < 2) return false;
  const cOrigin = candidateStops[0];
  const cDest = candidateStops[candidateStops.length - 1];
  const eOrigin = existingStops[0];
  const eDest = existingStops[existingStops.length - 1];
  return stopsAreSamePlace(cOrigin, eOrigin) && stopsAreSamePlace(cDest, eDest);
}

export type LaneConflictCandidate = LaneLike & {
  effectiveFrom?: string;
  effectiveTo?: string | null;
  scope?: string;
  scopePartnerIds?: string[];
  scopeDirection?: string | null;
  status?: string;
  id?: string;
};

/** Mirrors backend findConflictLane — route + overlapping dates + overlapping scope. */
export function laneHasConflict(
  candidate: LaneConflictCandidate,
  existing: LaneConflictCandidate,
  options: { excludeId?: string } = {},
): boolean {
  if ((existing.status || 'active') !== 'active') return false;
  if (options.excludeId && existing.id === options.excludeId) return false;

  const candidateStops = Array.isArray(candidate.stops) ? candidate.stops : [];
  const existingStops = Array.isArray(existing.stops) ? existing.stops : [];
  if (!endpointStopsMatch(candidateStops, existingStops)) return false;

  const overlapsDates = dateRangesOverlap(
    normalizeLaneDate(existing.effectiveFrom) || '1970-01-01',
    normalizeLaneDate(existing.effectiveTo ?? null),
    resolveConflictEffectiveFrom(candidate.effectiveFrom),
    normalizeLaneDate(candidate.effectiveTo ?? null),
  );
  if (!overlapsDates) return false;

  return scopesOverlap(
    existing.scope || 'default',
    existing.scopePartnerIds || [],
    existing.scopeDirection,
    candidate.scope || 'default',
    candidate.scopePartnerIds || [],
    candidate.scopeDirection,
  );
}

export function findLaneConflict(
  candidate: LaneConflictCandidate,
  lanes: LaneConflictCandidate[],
  options: { excludeId?: string } = {},
): LaneConflictCandidate | null {
  return lanes.find((lane) => laneHasConflict(candidate, lane, options)) || null;
}
