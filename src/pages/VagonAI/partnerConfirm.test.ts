import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { confirmVariant } from './confirmVariants';
import {
  PARTNER_ACTIONS, PARTNER_STATUSES, PARTNER_TYPES, PARTNER_WARNINGS, PARTNER_WRITE_TOOLS,
  partnerAction, partnerFields, partnerHeading, partnerWarning,
} from './partnerConfirm';

type Dict = Record<string, unknown>;

const load = (lang: 'en' | 'el'): Dict => JSON.parse(readFileSync(`src/locale/${lang}.json`, 'utf-8'));
const LOCALES: [string, Dict][] = [['en', load('en')], ['el', load('el')]];

const at = (dict: Dict, key: string): unknown => key
  .split('.')
  .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Dict)[part] : undefined), dict);

/** Resolves keys against the English file, so a missing key shows up as the key itself. */
const en = LOCALES[0][1];
const t = (key: string, opts?: Record<string, unknown>): string => {
  const value = at(en, key);
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(opts?.[name] ?? ''));
};

const P = 'vagonai.confirm.partner';

describe('partner confirmation card', () => {
  it('gives every partner write the partner card, never the generic list', () => {
    for (const tool of PARTNER_WRITE_TOOLS) expect(confirmVariant(tool)).toBe('partner');
  });

  // The setters are split by direction. A card that said "Suspend" for a
  // reactivation is the inversion the gateway's setter design exists to stop.
  it('titles the setters by the direction they set', () => {
    expect(partnerAction('set_partner_suspended', { suspended: true })).toBe('suspend');
    expect(partnerAction('set_partner_suspended', { suspended: false })).toBe('reactivate');
    expect(partnerAction('set_partner_preferred', { preferred: true })).toBe('prefer');
    expect(partnerAction('set_partner_preferred', { preferred: false })).toBe('unprefer');
  });

  it.each(LOCALES)('%s has a title, a button and every label the card can show', (_lang, dict) => {
    for (const action of PARTNER_ACTIONS) {
      for (const key of ['title', 'confirm']) expect(at(dict, `${P}.actions.${action}.${key}`)).toBeTruthy();
    }
    for (const warning of PARTNER_WARNINGS) expect(at(dict, `${P}.warnings.${warning}`)).toBeTruthy();
    for (const type of PARTNER_TYPES) expect(at(dict, `${P}.types.${type}`)).toBeTruthy();
    for (const status of PARTNER_STATUSES) expect(at(dict, `${P}.statuses.${status}`)).toBeTruthy();
  });

  // The generic card cut these: the validator adds them AFTER the tool's own
  // arguments, and the generic list kept only the first ten.
  it('shows the route and the rate on a new contract lane', () => {
    const args = {
      partner_id: '41', origin_city: 'Athens', destination_city: 'Milan', price: 1200, unit: 'load',
      trip_type: 'roundtrip', effective_from: '2026-10-10', effective_to: '2026-12-31',
      partner_name: 'Kappa Logistics', partner_type: 'carrier_company', partner_status: 'active', partner_region: 'Attica',
      rate_summary: '1200 EUR per load', route: 'Athens -> Milan',
    };
    const fields = partnerFields('addLane', args, t);
    const value = (label: string) => fields.find((f) => f.label === t(`${P}.fields.${label}`))?.value;
    expect(value('route')).toBe('Athens → Milan');
    expect(value('rate')).toBe('1200 EUR per load');
    expect(value('tripType')).toBe('Round trip');
    expect(value('type')).toBe('Carrier company');
    expect(fields.some((f) => f.value === '41')).toBe(false);
    expect(partnerHeading('addLane', args)).toBe('Kappa Logistics');
  });

  it('shows which tags a replace throws away, and warns about it', () => {
    const args = {
      partner_id: '41', tags: ['urgent'], mode: 'replace', partner_name: 'Kappa Logistics',
      current_tags: ['reliable', 'Reefer'], resulting_tags: ['urgent'],
    };
    const fields = partnerFields('tags', args, t);
    const value = (label: string) => fields.find((f) => f.label === t(`${P}.fields.${label}`))?.value;
    expect(value('tagsRemoved')).toBe('reliable, Reefer');
    expect(value('tagsAdded')).toBe('urgent');
    expect(value('tagsResulting')).toBe('urgent');
    expect(partnerWarning('tags', args, t)).toBe(t(`${P}.warnings.tagsReplace`));
    expect(partnerWarning('tags', { ...args, mode: 'add' }, t)).toBeNull();
  });

  it('warns on every one-way action', () => {
    for (const action of ['decline', 'remove', 'deleteLane'] as const) {
      expect(partnerWarning(action, {}, t)).toMatch(/cannot be undone/i);
    }
    expect(partnerWarning('accept', {}, t)).toBeNull();
  });

  it('shows the note being replaced', () => {
    const args = { notes: 'Late again', replaces_existing_note: 'Call before 16:00', partner_name: 'Kappa' };
    const fields = partnerFields('notes', args, t);
    expect(fields.map((f) => f.value)).toEqual(expect.arrayContaining(['Late again', 'Call before 16:00']));
    expect(partnerWarning('notes', args, t)).toBe(t(`${P}.warnings.notes`));
  });

  it('names the invitee on an invitation', () => {
    expect(partnerHeading('invite', { partner_type: 'carrier_company', email: 'ops@kappa.gr' })).toBe('ops@kappa.gr');
    expect(partnerHeading('invite', { phone: '6912345678', country_code: '+30' })).toBe('+30 6912345678');
  });
});
