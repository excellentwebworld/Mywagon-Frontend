import type { ApiAddressBookSummary } from '../../../api/types/addressBook';
import type { LocationItem } from '../../../context/AppContext';
import type { CreateLocationData, DirectoryItem, FilterKey, SortOption } from '../types';

export function getNodeCountFromSummary(
  dir: DirectoryItem,
  summary: ApiAddressBookSummary | null,
  locations: LocationItem[]
): number {
  if (summary) {
    if (dir.id === 'all') return summary.all;
    if (dir.id === 'my') return summary.my_locations;
    if (dir.id === 'customer') return summary.customers;
    if (dir.id === 'archived') return summary.archived;
  }
  return getNodeCount(dir, locations);
}

export function getNodeCount(dir: DirectoryItem, locations: LocationItem[]): number {
  if (dir.id === 'all') return locations.filter((l) => l.status === 'active').length;
  if (dir.id === 'archived') return locations.filter((l) => l.status === 'archived').length;
  if (dir.filter) return locations.filter((l) => l.status === 'active' && dir.filter!(l)).length;
  return locations.filter((l) => l.status === 'active' && l.group === dir.id).length;
}

export function getDirectoryWarnings(dir: DirectoryItem, locations: LocationItem[]): number {
  if (dir.system || dir.id === 'archived') return 0;
  return locations.filter((l) => {
    const inDir = dir.filter ? dir.filter(l) : l.group === dir.id;
    return inDir && l.status === 'active' && (!l.geoVerified || l.contacts.length === 0);
  }).length;
}

function parseLastUsed(value: string): number {
  if (value === 'Never') return Infinity;
  const match = value.match(/^(\d+)([hdm])/);
  if (!match) return Infinity;
  const n = parseInt(match[1], 10);
  if (match[2] === 'h') return n;
  if (match[2] === 'd') return n * 24;
  return n / 60;
}

function parseCreatedDate(value: string): number {
  const [d, m, y] = value.split('/').map(Number);
  if (!d || !m || !y) return 0;
  return new Date(y, m - 1, d).getTime();
}

export function filterLocations(
  locations: LocationItem[],
  directories: DirectoryItem[],
  activeNode: string,
  searchQuery: string,
  activeFilters: Record<FilterKey, boolean>
): LocationItem[] {
  const dir = directories.find((d) => d.id === activeNode);

  return locations
    .filter((l) => {
      if (activeNode === 'all') return l.status === 'active';
      if (activeNode === 'archived') return l.status === 'archived';
      if (dir?.filter) return l.status === 'active' && dir.filter(l);
      return l.status === 'active' && l.group === activeNode;
    })
    .filter((l) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const contactStrings = l.contacts.map((c) => `${c.name} ${c.phone} ${c.email}`).join(' ');
      return (
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.code && l.code.toLowerCase().includes(q)) ||
        (l.custCode && l.custCode.toLowerCase().includes(q)) ||
        l.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        contactStrings.toLowerCase().includes(q)
      );
    })
    .filter((l) => {
      if (activeFilters.appt && !l.appt) return false;
      if (activeFilters.active && l.status !== 'active') return false;
      if (activeFilters.hours && !l.hours) return false;
      if (activeFilters.type && !l.type) return false;
      if (activeFilters.city && !l.city) return false;
      if (activeFilters.role && l.role === 'both') return true;
      return true;
    });
}

export function applyClientFilters(
  locations: LocationItem[],
  activeFilters: Record<FilterKey, boolean>
): LocationItem[] {
  return locations.filter((l) => {
    if (activeFilters.appt && !l.appt) return false;
    if (activeFilters.active && l.status !== 'active') return false;
    if (activeFilters.hours && !l.hours) return false;
    if (activeFilters.type && !l.type) return false;
    if (activeFilters.city && !l.city) return false;
    if (activeFilters.role && l.role === 'both') return true;
    return true;
  });
}

export function sortLocations(items: LocationItem[], sortBy: SortOption): LocationItem[] {
  const sorted = [...items];
  if (sortBy === 'Name A–Z') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'City') sorted.sort((a, b) => a.city.localeCompare(b.city));
  else if (sortBy === 'Last used') sorted.sort((a, b) => parseLastUsed(a.lastUsed) - parseLastUsed(b.lastUsed));
  else if (sortBy === 'Created') sorted.sort((a, b) => parseCreatedDate(b.created) - parseCreatedDate(a.created));
  return sorted;
}

export function findPotentialDuplicates(
  locations: LocationItem[],
  data: CreateLocationData
): LocationItem[] {
  return locations.filter(
    (l) =>
      l.status === 'active' &&
      ((data.name &&
        l.name.toLowerCase().includes(data.name.toLowerCase()) &&
        data.city &&
        l.city.toLowerCase() === data.city.toLowerCase()) ||
        (data.address &&
          l.address.toLowerCase().includes(data.address.toLowerCase().substring(0, 15))))
  );
}

export function applyTemplate(tpl: string, prev: CreateLocationData): CreateLocationData {
  const base = { ...prev, template: tpl };
  if (tpl === 'retail') {
    return { ...base, type: 'dc', appt: true, dock: 'Dock-level', hours: 'Mon-Fri 06:00–16:00' };
  }
  if (tpl === 'factory') {
    return { ...base, type: 'plant', appt: true, dock: 'Dock-level', hours: 'Mon-Fri 05:00–21:00' };
  }
  if (tpl === 'warehouse') {
    return { ...base, type: 'warehouse', appt: true, dock: 'Dock-level', hours: 'Mon-Fri 07:00–19:00' };
  }
  if (tpl === 'store') {
    return {
      ...base,
      type: 'store',
      appt: false,
      dock: 'Ramp',
      hours: 'Mon-Sat 06:00–14:00',
      maxTruck: '12m',
      maxWeight: '19T',
    };
  }
  return base;
}

export function buildDefaultDirectories(t: (k: string) => string): DirectoryItem[] {
  return [
    {
      id: 'all',
      name: t('abAllLocations'),
      icon: 'home',
      system: true,
      filter: null,
    },
    {
      id: 'my',
      name: t('abMyLocations'),
      icon: 'briefcase',
      system: false,
      filter: (l) => l.group === 'my',
    },
    {
      id: 'customer',
      name: t('abCustomerLocations'),
      icon: 'users',
      system: false,
      filter: (l) => l.group === 'customer',
    },
    {
      id: 'archived',
      name: t('abArchived'),
      icon: 'archive',
      system: true,
      filter: (l) => l.status === 'archived',
    },
  ];
}
