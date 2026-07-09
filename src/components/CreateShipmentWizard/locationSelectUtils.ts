import type { LocationItem } from '../../context/AppContext';
import { getLocationSearchFields, matchesLocationSearchQuery } from '../../utils/locationSearchUtils';

export type LocationTab = 'my' | 'customer';

export function filterLocations(locations: LocationItem[], query: string, tab: LocationTab): LocationItem[] {
  return locations.filter((loc) => {
    if (tab === 'my' && loc.group !== 'my') return false;
    if (tab === 'customer' && loc.group !== 'customer') return false;

    return matchesLocationSearchQuery(getLocationSearchFields(loc), query);
  });
}

export interface CompanyLocationGroup {
  company: string;
  locations: LocationItem[];
}

export function groupCustomerLocations(locations: LocationItem[]): CompanyLocationGroup[] {
  const map = new Map<string, LocationItem[]>();

  locations.forEach((loc) => {
    const company = loc.company?.trim() || 'Other';
    const existing = map.get(company) || [];
    existing.push(loc);
    map.set(company, existing);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([company, groupedLocations]) => ({
      company,
      locations: groupedLocations.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function groupMyLocationsByCompany(locations: LocationItem[]): CompanyLocationGroup[] {
  return groupCustomerLocations(locations.filter((loc) => loc.group === 'my'));
}
