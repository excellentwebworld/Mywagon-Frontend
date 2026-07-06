import { useMemo } from 'react';
import type { LocationItem } from '../../../context/AppContext';
import type { ApiStop } from '../../../api/types/createShipment';
import { computeTripTotals } from './cargoUtils';
import { enrichStops } from './stopEnrichment';
import type { RouteLeg } from './types';

export function useItineraryStats(stops: ApiStop[], locations: LocationItem[], _legs: RouteLeg[] = []) {
  const enrichedStops = useMemo(() => enrichStops(stops, locations), [stops, locations]);
  const totals = useMemo(() => computeTripTotals(stops), [stops]);

  return {
    enrichedStops,
    totals,
  };
}
