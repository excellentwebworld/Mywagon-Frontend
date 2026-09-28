/**
 * The draft the guided add-address form fills in, and the rules it checks it
 * against.
 *
 * ## Coordinates come from the map, never the keyboard
 *
 * The Address Book API requires a latitude and a longitude and cannot derive them
 * from an address. `GoogleMapAddressField` produces both from one Places pick,
 * along with the city, the postcode and the region — which is why the address row
 * of this form is a single search box rather than six inputs.
 *
 * `lat`/`lng` are `null` until a place is picked, and that is the state Save is
 * blocked on. A shipper who types a street address by hand without selecting a
 * suggestion has given us no coordinates, and guessing one is worse than refusing:
 * it saves cleanly and silently distorts the route distance the carrier is priced
 * against.
 *
 * Pure, and deliberately free of React.
 */
import type { LocationFlowBundle, LocationFlowCompany } from '../../hooks/useChat';
import { englishTr, type Tr } from './i18n';

export const DIRECTORIES = ['my_locations', 'customers'] as const;
export type Directory = (typeof DIRECTORIES)[number];

export const SITE_ROLES = ['pickup', 'delivery', 'both'] as const;
export type SiteRole = (typeof SITE_ROLES)[number];

export const SITE_TYPES = ['dc', 'warehouse', 'plant', 'store', 'port', 'other'] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export interface DraftWindow {
  start: string;
  end: string;
}

export interface DraftContact {
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
}

export interface LocationDraft {
  directory: Directory;
  name: string;
  companyName: string;
  /** Only ever sent for a company the bundle did not already know. */
  companyVat: string | null;
  address: string;
  city: string;
  /** Null until a Places suggestion is picked. Save is blocked on it. */
  lat: number | null;
  lng: number | null;
  role: SiteRole;

  siteType: SiteType | null;
  postalCode: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  locationCode: string | null;
  dockType: string | null;
  maxTruckLength: string | null;
  maxWeight: string | null;
  loadTimeMinutes: number | null;
  appointmentRequired: boolean | null;
  receivingWindows: DraftWindow[] | null;
  receivingHours: string | null;
  carrierNote: string | null;
  internalNote: string | null;
  tags: string[] | null;
  contacts: DraftContact[] | null;
}

export interface LocationIssue {
  /** The draft path the gateway names in `missing[]`, so both focus the same input. */
  field: string;
  message: string;
}

export function emptyLocationDraft(): LocationDraft {
  return {
    directory: 'my_locations',
    name: '',
    companyName: '',
    companyVat: null,
    address: '',
    city: '',
    lat: null,
    lng: null,
    // 'both' rather than a forced choice: a site that can serve either leg is the
    // common case, and it is the answer that keeps the site usable in the shipment
    // wizard's pickup AND delivery cards.
    role: 'both',
    siteType: null,
    postalCode: null,
    region: null,
    phone: null,
    email: null,
    locationCode: null,
    dockType: null,
    maxTruckLength: null,
    maxWeight: null,
    loadTimeMinutes: null,
    appointmentRequired: null,
    receivingWindows: null,
    receivingHours: null,
    carrierNote: null,
    internalNote: null,
    tags: null,
    contacts: null,
  };
}

/** How each directory reads on screen. The wire values are jargon. */
export const DIRECTORY_LABELS: Record<Directory, string> = {
  my_locations: 'A site we operate',
  customers: "A customer's site",
};

export const ROLE_LABELS: Record<SiteRole, string> = {
  pickup: 'Collections only',
  delivery: 'Deliveries only',
  both: 'Both',
};

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  dc: 'Distribution centre',
  warehouse: 'Warehouse',
  plant: 'Plant',
  store: 'Store',
  port: 'Port',
  other: 'Other',
};

/** A directory's label in the shipper's language. The constants above are the English. */
export function directoryLabel(directory: Directory, tr: Tr = englishTr): string {
  return tr(`vagonai.addressForm.directories.${directory}`, DIRECTORY_LABELS[directory]);
}

export function roleLabel(role: SiteRole, tr: Tr = englishTr): string {
  return tr(`vagonai.addressForm.roles.${role}`, ROLE_LABELS[role]);
}

export function siteTypeLabel(type: SiteType, tr: Tr = englishTr): string {
  return tr(`vagonai.addressForm.siteTypes.${type}`, SITE_TYPE_LABELS[type]);
}

/**
 * The loading methods the form suggests, and the gateway's own default.
 *
 * The VALUE stays English - it is free text saved on the site, and the Address
 * Book page and the carrier read it as written - so only the on-screen label is
 * translated. Anything the shipper typed themselves is shown as it is.
 */
const DOCK_TYPE_KEYS: Record<string, string> = {
  'Dock leveler': 'dockLeveler',
  'Ground level': 'groundLevel',
  Ramp: 'ramp',
  'Side loading': 'sideLoading',
  'Not specified': 'notSpecified',
};

export function dockTypeLabel(value: string, tr: Tr = englishTr): string {
  const key = DOCK_TYPE_KEYS[value];
  return key ? tr(`vagonai.addressForm.dockTypes.${key}`, value) : value;
}

/**
 * The company the shipper has typed, if the Address Book already knows it.
 *
 * This is what decides whether the VAT field appears at all. Matched on the exact
 * trimmed name, case-insensitively, because that is the rule the gateway's own
 * `resolveCompanyVat` applies — a looser match here would hide the field for a
 * company the server then treats as new, and the save would fail for a value
 * nobody was asked for.
 */
export function knownCompany(draft: LocationDraft, bundle: LocationFlowBundle): LocationFlowCompany | null {
  const needle = draft.companyName.trim().toLowerCase();
  if (needle.length === 0) return null;
  return bundle.companies.find((company) => company.name.trim().toLowerCase() === needle) ?? null;
}

/**
 * Whether the shipper has to type a VAT number.
 *
 * True for a company the book does not know, and also for one it knows without a
 * VAT on file — "known" is not the same as "VAT ready", and treating them the same
 * hides the field for a save that will be refused.
 */
export function needsVat(draft: LocationDraft, bundle: LocationFlowBundle): boolean {
  if (draft.companyName.trim().length === 0) return false;
  const known = knownCompany(draft, bundle);
  return known === null || known.vat === null;
}

/** What stops Save, in the order the form asks for it. */
export function locationIssues(draft: LocationDraft, bundle: LocationFlowBundle, tr: Tr = englishTr): LocationIssue[] {
  const issues: LocationIssue[] = [];

  if (draft.name.trim().length === 0) {
    issues.push({ field: 'name', message: tr('vagonai.addressForm.issues.nameRequired', 'This site needs a name.') });
  }
  if (draft.companyName.trim().length === 0) {
    issues.push({ field: 'companyName', message: tr('vagonai.addressForm.issues.companyRequired', 'Name the company at this site.') });
  }
  if (needsVat(draft, bundle) && (draft.companyVat?.trim() ?? '').length === 0) {
    issues.push({
      field: 'companyVat',
      message: tr(
        'vagonai.addressForm.issues.vatRequired',
        'This company is new to your Address Book, so its VAT number is needed to save the site.',
      ),
    });
  }
  if (draft.address.trim().length === 0) {
    issues.push({
      field: 'address',
      message: tr('vagonai.addressForm.issues.addressRequired', 'Search for the address and pick it from the list.'),
    });
  }
  if (draft.city.trim().length === 0) {
    issues.push({ field: 'city', message: tr('vagonai.addressForm.issues.cityRequired', 'The city is required.') });
  }
  // The one that matters most, and the one a shipper is most likely to hit: they
  // typed the address instead of picking a suggestion, so there are no coordinates.
  if (draft.lat === null || draft.lng === null) {
    issues.push({
      field: 'lat',
      message: tr(
        'vagonai.addressForm.issues.coordinatesRequired',
        'Pick the address from the suggestions so the map can place it — the site cannot be saved without coordinates.',
      ),
    });
  }

  const windows = draft.receivingWindows ?? [];
  if (draft.appointmentRequired && windows.length === 0) {
    issues.push({
      field: 'receivingWindows',
      message: tr(
        'vagonai.addressForm.issues.windowRequired',
        'This site needs an appointment, so add at least one receiving window.',
      ),
    });
  }
  windows.forEach((window, index) => {
    if (window.start === '00:00' || window.end === '00:00') {
      issues.push({
        field: `receivingWindows[${index}]`,
        message: tr('vagonai.addressForm.issues.windowMidnight', 'A receiving window cannot start or end at 00:00.'),
      });
    } else if (window.start >= window.end) {
      issues.push({
        field: `receivingWindows[${index}]`,
        message: tr('vagonai.addressForm.issues.windowOrder', 'Window {{n}} ends at or before it starts.', { n: index + 1 }),
      });
    }
  });

  return issues;
}

/**
 * The site this draft would collide with, if any.
 *
 * A site name is unique per COMPANY, not globally — two customers may both have a
 * "Main Warehouse" — so both halves are needed before this can say anything.
 */
export function duplicateOf(draft: LocationDraft, bundle: LocationFlowBundle) {
  const name = draft.name.trim().toLowerCase();
  const company = draft.companyName.trim().toLowerCase();
  if (name.length === 0 || company.length === 0) return null;

  return (
    bundle.locations.find(
      (site) => site.name.trim().toLowerCase() === name && (site.company ?? '').trim().toLowerCase() === company,
    ) ?? null
  );
}

/** Real, but not blocking — shown under the form so nothing is a surprise. */
export function locationWarnings(draft: LocationDraft, bundle: LocationFlowBundle, tr: Tr = englishTr): string[] {
  const warnings: string[] = [];

  const assumed = [
    draft.siteType === null && tr('vagonai.addressForm.assumed.siteType', 'kind of site'),
    draft.dockType === null && tr('vagonai.addressForm.assumed.dockType', 'loading method'),
    draft.maxTruckLength === null && tr('vagonai.addressForm.assumed.maxTruckLength', 'maximum truck length (13.6 m)'),
    draft.maxWeight === null && tr('vagonai.addressForm.assumed.maxWeight', 'maximum weight (24 t)'),
    draft.loadTimeMinutes === null && tr('vagonai.addressForm.assumed.loadTime', 'loading time (30 min)'),
  ].filter((value): value is string => typeof value === 'string');

  if (assumed.length > 0) {
    warnings.push(
      tr(
        'vagonai.addressForm.warnings.standardValues',
        'Standard values will be used for {{fields}}. Carriers are matched against these, so correct them in the Address Book if they are wrong.',
        { fields: assumed.join(', ') },
      ),
    );
  }

  if (bundle.truncated.locations !== undefined) {
    warnings.push(
      tr(
        'vagonai.addressForm.warnings.partialDuplicateCheck',
        'The duplicate check can only see part of your Address Book, so it may not spot a clash with an older site.',
      ),
    );
  }

  return warnings;
}

/** Strips the blanks the gateway treats as absent. */
export function serializeLocationDraft(draft: LocationDraft): Record<string, unknown> {
  const text = (value: string | null) => {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  };
  const tags = (draft.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  const contacts = (draft.contacts ?? [])
    .map((contact) => ({
      name: contact.name.trim(),
      role: text(contact.role),
      phone: text(contact.phone),
      email: text(contact.email),
    }))
    .filter((contact) => contact.name.length > 0);

  return {
    directory: draft.directory,
    name: draft.name.trim(),
    companyName: draft.companyName.trim(),
    companyVat: text(draft.companyVat),
    address: draft.address.trim(),
    city: draft.city.trim(),
    lat: draft.lat,
    lng: draft.lng,
    role: draft.role,
    siteType: draft.siteType,
    postalCode: text(draft.postalCode),
    region: text(draft.region),
    phone: text(draft.phone),
    email: text(draft.email),
    locationCode: text(draft.locationCode),
    dockType: text(draft.dockType),
    maxTruckLength: text(draft.maxTruckLength),
    maxWeight: text(draft.maxWeight),
    loadTimeMinutes: draft.loadTimeMinutes,
    appointmentRequired: draft.appointmentRequired,
    receivingWindows: (draft.receivingWindows ?? []).length > 0 ? draft.receivingWindows : null,
    receivingHours: text(draft.receivingHours),
    carrierNote: text(draft.carrierNote),
    internalNote: text(draft.internalNote),
    tags: tags.length > 0 ? tags : null,
    contacts: contacts.length > 0 ? contacts : null,
  };
}
