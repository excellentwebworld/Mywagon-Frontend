/**
 * Renders the real ConfirmActionCard for the `bid` and `publish` variants.
 *
 * A `.test.ts` with `React.createElement` and `renderToStaticMarkup`, because
 * the suite runs in node and only picks up `.test.ts`. The translation hook is
 * replaced with one that reads the real locale files, so a missing key shows up
 * here as raw key text on the card.
 */
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Dict = Record<string, unknown>;
const LOCALES: Record<'en' | 'el', Dict> = {
  en: JSON.parse(readFileSync('src/locale/en.json', 'utf-8')),
  el: JSON.parse(readFileSync('src/locale/el.json', 'utf-8')),
};
const state: { lang: 'en' | 'el' } = { lang: 'en' };

const lookup = (key: string, opts?: Record<string, unknown>): string => {
  const node = key.split('.').reduce<unknown>((at, part) => (at && typeof at === 'object' ? (at as Dict)[part] : undefined), LOCALES[state.lang]);
  const template = typeof node === 'string' ? node : typeof opts?.defaultValue === 'string' ? opts.defaultValue : key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''));
};

vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: lookup, lang: state.lang, i18n: {} }),
}));

const { default: ConfirmActionCard } = await import('./ConfirmActionCard');

const T = new Proxy({}, { get: () => '#000' }) as never;

function render(tool: string, args: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(ConfirmActionCard, {
    action: { id: 'tc-1', tool, arguments: args } as never,
    T,
    onConfirm: () => {},
    onCancel: () => {},
  }));
}

/** Text only, so assertions read like the card does. */
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

const BID = {
  truck_label: 'Semi-trailer · Refrigerated',
  truck_type_name: 'Semi-trailer',
  truck_subtype_name: 'Refrigerated',
  truck_type_name_el: 'Επικαθήμενο',
  truck_subtype_name_el: 'Ψυγείο',
  carrier_name: 'Trans Hellas',
  truck_pickup: 'Athens',
  truck_available_from: '2026-03-01T08:00:00Z',
  shipment_label: 'LD-2026-0042',
  shipment_lane: 'Athens → Thessaloniki',
  shipment_pickup_at: '2026-03-01T09:00:00+02:00',
  offer_price: 1200,
  offer_currency: 'EUR',
  offer_price_source: 'carrier_asking_price',
  exact_match: true,
  offer_visible_to_carrier: true,
  availability_id: '5512',
  shipment_id: '9001',
  notes: 'Tail lift needed',
};

beforeEach(() => {
  state.lang = 'en';
});

describe('ConfirmActionCard - bid variant (PTB-02 / PTB-03)', () => {
  it('renders the bid title and button, not the generic card', () => {
    const out = text(render('place_truck_bid', BID));
    expect(out).toContain('Send this offer to the carrier?');
    expect(out).toContain('Send offer');
    expect(out).not.toContain('Confirm this action?');
    // The generic card would have listed raw argument names.
    expect(out).not.toContain('Availability id');
  });

  it('shows truck with subtype, carrier, load ref and lane', () => {
    const out = text(render('place_truck_bid', BID));
    expect(out).toContain('Semi-trailer · Refrigerated');
    expect(out).toContain('Trans Hellas');
    expect(out).toContain('LD-2026-0042 · Athens → Thessaloniki');
  });

  it('shows the price with its currency, says whose price it is, and the exact-match verdict', () => {
    const out = text(render('place_truck_bid', BID));
    expect(out).toMatch(/€ 1,200 · the carrier's asking price/);
    expect(out).toContain('Exact match');
    expect(out).toContain('Tail lift needed');
    const quoted = text(render('place_truck_bid', { ...BID, offer_price: 950, offer_price_source: 'quote', quote: 950, exact_match: false }));
    expect(quoted).toMatch(/€ 950 · your offer/);
    expect(quoted).toContain('Partial match');
  });

  it('carries the amber "visible to the carrier, not a booking" warning', () => {
    const html = render('place_truck_bid', BID);
    expect(html).toMatch(/data-testid="bid-warning"[^>]*background:rgba\(245,158,11,0\.12\)/);
    expect(text(html)).toContain('the carrier sees this offer straight away');
    expect(text(html)).toContain('not a booking');
  });

  it('renders in Greek with Greek truck names', () => {
    state.lang = 'el';
    const out = text(render('place_truck_bid', BID));
    expect(out).toContain('Αποστολή αυτής της προσφοράς στον μεταφορέα;');
    expect(out).toContain('Επικαθήμενο · Ψυγείο');
    expect(out).toContain('όχι κράτηση');
  });
});

describe('ConfirmActionCard - bid price against an older gateway (FAT-01 round 1, FE-S1)', () => {
  beforeEach(() => { state.lang = 'en'; });
  // What a gateway without PR #7 sends: no offer_price / offer_currency / offer_price_source.
  const OLD: Record<string, unknown> = Object.fromEntries(
    Object.entries(BID).filter(([key]) => !['offer_price', 'offer_currency', 'offer_price_source'].includes(key)),
  );

  it('shows the quote when offer_price is missing', () => {
    const out = text(render('place_truck_bid', { ...OLD, quote: 950 }));
    expect(out).toMatch(/Offer €\s?950 · your offer/);
  });

  it('shows the "amount not shown" warning row when there is no figure at all, in both languages', () => {
    const out = text(render('place_truck_bid', OLD));
    expect(out).toContain("Offer The carrier's asking price - the amount was not shown.");
    state.lang = 'el';
    expect(text(render('place_truck_bid', OLD))).toContain('το ποσό δεν εμφανίστηκε');
  });

  it('names the truck once - in the heading, not again as a row (N4)', () => {
    const out = text(render('place_truck_bid', BID));
    expect(out.split('Semi-trailer · Refrigerated').length - 1).toBe(1);
  });
});

describe('ConfirmActionCard - publish truck row (PUB-02)', () => {
  const publish = (vehicle: Record<string, unknown>) => text(render('publish_shipment', {
    draft_id: '5501',
    broadcast_type: 'private',
    shipment_reference: 'SH-5501',
    vehicle_type_ids: [4],
    vehicle_type_names: ['Semi-trailer'],
    partner_names: ['Kappa Logistics'],
    target_price: 780,
    negotiable: true,
    stops: [],
    ...vehicle,
  }));

  it('names the subtype on a narrowed publish', () => {
    const out = publish({
      vehicle_subtype_names: ['Semi-trailer · Refrigerated'],
      vehicle_selection: [{ type_id: 4, type_name: 'Semi-trailer', subtypes: [{ id: 31, name: 'Refrigerated' }], any_subtype: false }],
    });
    expect(out).toContain('Truck type Semi-trailer · Refrigerated');
  });

  it('says "any subtype" on a widened publish, so the two cards differ', () => {
    const out = publish({ vehicle_selection: [{ type_id: 4, type_name: 'Semi-trailer', subtypes: [], any_subtype: true }] });
    expect(out).toContain('Truck type Semi-trailer · any subtype');
  });
});
