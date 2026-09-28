import { describe, expect, it } from 'vitest';
import type { LocationFlowBundle } from '../../hooks/useChat';
import {
  DIRECTORY_LABELS, ROLE_LABELS, SITE_ROLES, SITE_TYPE_LABELS, SITE_TYPES,
  duplicateOf, emptyLocationDraft, knownCompany, locationIssues, locationWarnings, needsVat,
  serializeLocationDraft, type LocationDraft,
} from './createLocationDraft';

/**
 * The add-address form's own rules, asserted without React.
 *
 * The cases worth knowing about:
 *
 * - **Save is blocked until a place is picked.** A shipper who types a street
 *   without selecting a suggestion has given us no coordinates, and the API cannot
 *   derive them. Guessing saves cleanly and silently distorts the route distance
 *   the carrier is priced against, so this is the one field that must not be
 *   defaulted.
 * - **"Known company" is not the same as "VAT ready".** A company in the Address
 *   Book with no VAT on file still needs one typed — treating the two as one hides
 *   the field for a save the server then refuses for a value nobody was asked for.
 * - **A site name collides per COMPANY, not globally.** Two customers may both
 *   have a "Main Warehouse", so a check on the name alone would block a legitimate
 *   site.
 */

function bundle(overrides: Partial<LocationFlowBundle> = {}): LocationFlowBundle {
  return {
    companies: [
      { name: 'Acme Foods', vat: 'EL123456789' },
      { name: 'Nova Retail', vat: null },
    ],
    locations: [
      { id: 'loc-1', name: 'Athens DC', company: 'Acme Foods', city: 'Athens' },
      { id: 'loc-2', name: 'Main Warehouse', company: 'Nova Retail', city: 'Patras' },
    ],
    defaults: { siteType: 'other', dockType: 'Not specified', maxTruckLength: '13.6 m', maxWeight: '24 t', loadTimeMinutes: 30 },
    rules: {},
    notes: [],
    truncated: {},
    ...overrides,
  };
}

/** A complete draft: a place has been picked, so it has coordinates. */
function draft(overrides: Partial<LocationDraft> = {}): LocationDraft {
  return {
    ...emptyLocationDraft(),
    name: 'Thessaloniki DC',
    companyName: 'Acme Foods',
    address: '12 Pireos Street',
    city: 'Thessaloniki',
    lat: 40.640063,
    lng: 22.944419,
    ...overrides,
  };
}

describe('locationIssues', () => {
  it('accepts a draft whose address came from a place pick', () => {
    expect(locationIssues(draft(), bundle())).toEqual([]);
  });

  it('blocks Save when no place was picked, however complete the text is', () => {
    const typed = draft({ lat: null, lng: null });
    const fields = locationIssues(typed, bundle()).map((i) => i.field);
    expect(fields).toContain('lat');
    expect(locationIssues(typed, bundle())[0]!.message).toMatch(/pick the address from the suggestions/i);
  });

  it('names each required field the gateway would name', () => {
    expect(locationIssues(draft({ name: ' ' }), bundle()).map((i) => i.field)).toContain('name');
    expect(locationIssues(draft({ companyName: '' }), bundle()).map((i) => i.field)).toContain('companyName');
    expect(locationIssues(draft({ city: '' }), bundle()).map((i) => i.field)).toContain('city');
  });

  it('demands a VAT only for a company it cannot supply one for', () => {
    // Known, VAT on file — no field, no issue.
    expect(locationIssues(draft({ companyName: 'Acme Foods' }), bundle()).map((i) => i.field)).not.toContain('companyVat');
    // Genuinely new.
    expect(locationIssues(draft({ companyName: 'Brand New Ltd' }), bundle()).map((i) => i.field)).toContain('companyVat');
    // Known, but no VAT recorded — still has to be asked.
    expect(locationIssues(draft({ companyName: 'Nova Retail' }), bundle()).map((i) => i.field)).toContain('companyVat');
  });

  it('accepts a new company once its VAT is typed', () => {
    const d = draft({ companyName: 'Brand New Ltd', companyVat: 'EL999999999' });
    expect(locationIssues(d, bundle())).toEqual([]);
  });

  it('refuses an appointment site with no window, and a bad window', () => {
    expect(locationIssues(draft({ appointmentRequired: true }), bundle()).map((i) => i.field))
      .toContain('receivingWindows');
    expect(locationIssues(draft({ receivingWindows: [{ start: '00:00', end: '16:00' }] }), bundle()).map((i) => i.field))
      .toContain('receivingWindows[0]');
    expect(locationIssues(draft({ receivingWindows: [{ start: '18:00', end: '09:00' }] }), bundle()).map((i) => i.field))
      .toContain('receivingWindows[0]');
  });
});

describe('the company / VAT split', () => {
  it('matches a company on its exact trimmed name, as the gateway does', () => {
    expect(knownCompany(draft({ companyName: '  acme foods ' }), bundle())?.vat).toBe('EL123456789');
    // Deliberately NOT a partial match: a looser rule here would hide the VAT field
    // for a company the server then treats as new.
    expect(knownCompany(draft({ companyName: 'Acme' }), bundle())).toBeNull();
  });

  it('asks for nothing while the company field is still empty', () => {
    expect(needsVat(draft({ companyName: '' }), bundle())).toBe(false);
  });
});

describe('the duplicate check', () => {
  it('collides on site name and company together', () => {
    expect(duplicateOf(draft({ name: 'Athens DC', companyName: 'Acme Foods' }), bundle())?.id).toBe('loc-1');
  });

  it('allows the same site name under a different company', () => {
    // Two customers may both have a "Main Warehouse" - blocking that would refuse a
    // legitimate site.
    expect(duplicateOf(draft({ name: 'Main Warehouse', companyName: 'Acme Foods' }), bundle())).toBeNull();
  });

  it('stays quiet until both halves are filled in', () => {
    expect(duplicateOf(draft({ name: '' }), bundle())).toBeNull();
    expect(duplicateOf(draft({ companyName: '' }), bundle())).toBeNull();
  });
});

describe('serializeLocationDraft', () => {
  it('turns whitespace-only optionals into null', () => {
    const out = serializeLocationDraft(draft({ region: '  ', phone: '', dockType: ' ' }));
    expect(out.region).toBeNull();
    expect(out.phone).toBeNull();
    expect(out.dockType).toBeNull();
  });

  it('keeps the coordinates as numbers', () => {
    const out = serializeLocationDraft(draft());
    expect(out.lat).toBe(40.640063);
    expect(out.lng).toBe(22.944419);
  });

  it('drops a contact row the shipper started and abandoned', () => {
    const out = serializeLocationDraft(draft({
      contacts: [
        { name: 'Maria', role: null, phone: '210', email: null },
        { name: '  ', role: null, phone: null, email: null },
      ],
    }));
    expect(out.contacts).toHaveLength(1);
  });

  it('sends null rather than an empty array for tags and contacts', () => {
    const out = serializeLocationDraft(draft({ tags: [], contacts: [] }));
    expect(out.tags).toBeNull();
    expect(out.contacts).toBeNull();
  });
});

describe('locationWarnings', () => {
  it('names every value that will be assumed, and why it matters', () => {
    const warned = locationWarnings(draft(), bundle()).join(' ');
    expect(warned).toMatch(/13\.6 m/);
    expect(warned).toMatch(/24 t/);
    expect(warned).toMatch(/Carriers are matched against these/i);
  });

  it('says nothing about assumptions the shipper overrode', () => {
    const filled = draft({
      siteType: 'warehouse', dockType: 'Ramp', maxTruckLength: '16.5 m', maxWeight: '40 t', loadTimeMinutes: 45,
    });
    expect(locationWarnings(filled, bundle()).join(' ')).not.toMatch(/Standard values/i);
  });

  it('admits the duplicate check is partial when the book was capped', () => {
    expect(locationWarnings(draft(), bundle({ truncated: { locations: 200 } })).join(' '))
      .toMatch(/only see part of your Address Book/i);
  });
});

describe('the labels every wire value needs', () => {
  it('gives each directory, role and site type something readable', () => {
    expect(Object.keys(DIRECTORY_LABELS)).toHaveLength(2);
    for (const role of SITE_ROLES) expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    for (const type of SITE_TYPES) expect(SITE_TYPE_LABELS[type].length).toBeGreaterThan(0);
  });

  it('opens on "both", which keeps the site usable on either leg of a load', () => {
    expect(emptyLocationDraft().role).toBe('both');
  });
});
