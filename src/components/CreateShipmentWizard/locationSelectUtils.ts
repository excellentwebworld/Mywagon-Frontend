import type { LocationItem } from '../../context/AppContext';

export type LocationTab = 'my' | 'customer';

export function filterLocations(locations: LocationItem[], query: string, tab: LocationTab): LocationItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return locations.filter((loc) => {
    if (tab === 'my' && loc.group !== 'my') return false;
    if (tab === 'customer' && loc.group !== 'customer') return false;

    if (!normalizedQuery) return true;

    const haystack = [loc.name, loc.company, loc.address, loc.city]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
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
