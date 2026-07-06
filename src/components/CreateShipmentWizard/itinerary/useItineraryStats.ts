import { useMemo } from 'react';
import type { LocationItem } from '../../../context/AppContext';
import type { ApiStop } from '../../../api/types/createShipment';
import {
  buildCargoFlows,
  computeLoadBalance,
  computeRunningWeights,
  computeTripTotals,
} from './cargoUtils';
import { computeDriveGapWarnings, computeWeekendHolidayWarnings } from './scheduleWarnings';
import { enrichStops } from './stopEnrichment';
import type { RouteLeg } from './types';

export function useItineraryStats(stops: ApiStop[], locations: LocationItem[], legs: RouteLeg[] = []) {
  const enrichedStops = useMemo(() => enrichStops(stops, locations), [stops, locations]);
  const balance = useMemo(() => computeLoadBalance(stops), [stops]);
  const totals = useMemo(() => computeTripTotals(stops), [stops]);
  const runningWeights = useMemo(() => computeRunningWeights(stops), [stops]);
  const cargoFlows = useMemo(() => buildCargoFlows(stops), [stops]);
  const weekendWarnings = useMemo(() => computeWeekendHolidayWarnings(stops), [stops]);
  const driveWarnings = useMemo(() => computeDriveGapWarnings(stops, legs), [stops, legs]);

  return {
    enrichedStops,
    balance,
    totals,
    runningWeights,
    cargoFlows,
    weekendWarnings,
    driveWarnings,
  };
}
