import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FACILITY_SUBTYPES, confirmVariant, type ConfirmVariant } from './confirmVariants';

type Dict = Record<string, unknown>;

const load = (lang: 'en' | 'el'): Dict => JSON.parse(readFileSync(`src/locale/${lang}.json`, 'utf-8'));
const LOCALES: [string, Dict][] = [['en', load('en')], ['el', load('el')]];

/** Resolves a dotted i18next key the way the runtime does. */
const at = (dict: Dict, key: string): unknown => key
  .split('.')
  .reduce<unknown>((node, part) => (node && typeof node === 'object'
    ? (node as Dict)[part]
    : undefined), dict);

const VARIANTS: ConfirmVariant[] = ['shipment', 'publish', 'location', 'product', 'erpOrder', 'bid', 'partner', 'generic'];

describe('confirmVariant', () => {
  it('gives each write tool its own module card', () => {
    expect(confirmVariant('create_shipment')).toBe('shipment');
    expect(confirmVariant('create_location')).toBe('location');
    expect(confirmVariant('create_product')).toBe('product');
    expect(confirmVariant('create_order')).toBe('erpOrder');
  });

  // The variant is `erpOrder`, not `order`, because `vagonai.confirm.order` is
  // already the cargo-line label ("Order PO-4821") the shipment card renders.
  // A variant named `order` would resolve `vagonai.confirm.order.title` against
  // that plain string and put an empty title on the card.
  it('does not collide with the cargo-line order label', () => {
    expect(confirmVariant('create_order')).not.toBe('order');
    for (const [, dict] of LOCALES) {
      expect(typeof at(dict, 'vagonai.confirm.order')).toBe('string');
    }
  });

  // An order and a shipment are different records in different modules, and the
  // whole reason this variant exists is that the two were being confused. A
  // filed order announced as a draft load is that bug wearing a card.
  it('never announces a filed order as a shipment', () => {
    expect(confirmVariant('create_order')).not.toBe('shipment');
    expect(confirmVariant('create_order')).not.toBe('publish');
  });

  // Falling back to 'shipment' is the bug this guards: a proposed address would
  // then be announced as a draft shipment, so the shipper approves a different
  // thing than the card claims.
  it('falls back to the generic card, never to a module it is not', () => {
    expect(confirmVariant('create_partner')).toBe('generic');
    expect(confirmVariant('')).toBe('generic');
  });
});

describe('confirmation copy', () => {
  it.each(LOCALES)('%s has a title and button for every variant', (_lang, dict) => {
    for (const variant of VARIANTS) {
      for (const key of ['title', 'confirm']) {
        const value = at(dict, `vagonai.confirm.${variant}.${key}`);
        expect(typeof value === 'string' && value.length > 0).toBe(true);
      }
    }
  });

  // The old flat keys were shipment copy. Leaving them behind invites a card to
  // read `vagonai.confirm.title` again and quietly get "Create this draft
  // shipment?" for a location or a product.
  it.each(LOCALES)('%s no longer carries the shipment-specific flat keys', (_lang, dict) => {
    expect(at(dict, 'vagonai.confirm.title')).toBeUndefined();
    expect(at(dict, 'vagonai.confirm.confirm')).toBeUndefined();
  });

  // A confirmation the gateway no longer holds streams nothing back, so this
  // line is the whole turn. Missing, it settles as an empty bubble.
  it.each(LOCALES)('%s explains a proposal that is no longer confirmable', (_lang, dict) => {
    expect(at(dict, 'vagonai.confirm.expired')).toBeTruthy();
  });

  it.each(LOCALES)('%s names every Address Book facility type the card can show', (_lang, dict) => {
    for (const subtype of FACILITY_SUBTYPES) {
      expect(at(dict, `vagonai.confirm.location.subtype.${subtype}`)).toBeTruthy();
    }
    expect(at(dict, 'vagonai.confirm.location.usedFor')).toBeTruthy();
    expect(at(dict, 'vagonai.confirm.location.coordinates')).toBeTruthy();
  });

  // Field labels are borrowed from the modules the record lands in, so the
  // shipper reads the same words on the card as on the form. A missing key
  // renders as the raw key text instead.
  it.each(LOCALES)('%s has every borrowed field label', (_lang, dict) => {
    const borrowed = [
      'companyName', 'addressCol', 'city', 'pickup', 'delivery',
      'skuNumber', 'category', 'unit', 'weightPerUnit', 'temperature', 'palletType',
    ];
    for (const key of borrowed) expect(at(dict, key)).toBeTruthy();
  });

  it('translates the same confirm and tool keys in both languages', () => {
    const [, en] = LOCALES[0];
    const [, el] = LOCALES[1];
    const flatten = (node: unknown, prefix = ''): string[] => (node && typeof node === 'object'
      ? Object.entries(node as Dict).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
      : [prefix]);

    expect(flatten(at(el, 'vagonai.confirm')).sort()).toEqual(flatten(at(en, 'vagonai.confirm')).sort());
    expect(flatten(at(el, 'vagonai.tool')).sort()).toEqual(flatten(at(en, 'vagonai.tool')).sort());
  });
});

it('maps mark_shipment_complete to markComplete', () => {
  expect(confirmVariant('mark_shipment_complete')).toBe('markComplete');
});

// A closed ORDER must never borrow the shipment card, which tells the shipper a
// load is being completed.
it('gives the order completion writes their own cards, in both languages', () => {
  expect(confirmVariant('mark_order_complete')).toBe('markOrderComplete');
  expect(confirmVariant('reopen_order')).toBe('reopenOrder');
  for (const [, dict] of LOCALES) {
    for (const variant of ['markOrderComplete', 'reopenOrder']) {
      for (const key of ['title', 'confirm', 'warning', 'customer', 'status', 'result']) {
        expect(at(dict, `vagonai.confirm.${variant}.${key}`)).toBeTruthy();
      }
    }
    for (const status of ['unplanned', 'partially_planned', 'completed']) {
      expect(at(dict, `vagonai.confirm.orderStatus.${status}`)).toBeTruthy();
    }
  }
});

// A file import creates orders AND master records - it must never borrow the
// single-order card, which promises one order and nothing else.
it('gives run_order_import its own card, with its warning in both languages', () => {
  expect(confirmVariant('run_order_import')).toBe('orderImport');
  for (const [, dict] of LOCALES) {
    for (const key of ['title', 'confirm', 'warning']) {
      expect(at(dict, `vagonai.confirm.orderImport.${key}`)).toBeTruthy();
    }
  }
});

// PTB-02: an offer to another company's truck gets its own card, never the
// generic argument list - the carrier sees it the moment it is confirmed.
it('gives place_truck_bid the bid card, with all its copy in both languages', () => {
  expect(confirmVariant('place_truck_bid')).toBe('bid');
  for (const [, dict] of LOCALES) {
    for (const key of [
      'title', 'confirm', 'truck', 'carrier', 'truckAvailable', 'load', 'loadPickup',
      'price', 'askingPrice', 'yourOffer', 'match', 'exactYes', 'exactNo', 'notes', 'warning',
    ]) {
      expect(at(dict, `vagonai.confirm.bid.${key}`)).toBeTruthy();
    }
    // PUB-02: the publish card says "any subtype" when a type is not narrowed.
    expect(at(dict, 'vagonai.confirm.publish.anySubtype')).toBeTruthy();
  }
});
