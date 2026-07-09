/** Fields commonly searched when picking a location. */
export function getLocationSearchFields(loc: {
  name?: string;
  company?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  code?: string;
  custCode?: string;
}): (string | undefined)[] {
  return [
    loc.name,
    loc.company,
    loc.address,
    loc.city,
    loc.region,
    loc.postalCode,
    loc.code,
    loc.custCode,
  ];
}

export function buildLocationSearchHaystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Match query against location text, ignoring whitespace differences in postal codes. */
export function matchesLocationSearchQuery(
  haystackParts: (string | null | undefined)[],
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const haystack = buildLocationSearchHaystack(haystackParts).toLowerCase();
  const normalizedQuery = trimmed.toLowerCase();

  if (haystack.includes(normalizedQuery)) return true;

  const compactHaystack = haystack.replace(/\s+/g, '');
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  return Boolean(compactQuery && compactHaystack.includes(compactQuery));
}
