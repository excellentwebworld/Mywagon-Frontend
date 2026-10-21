import { describe, expect, it } from 'vitest';
import {
  bidFields, bidPriceValue, bidTruckLabel, joinTruckName, publishTruckValue, type TruckBidArgs,
} from './confirmFields';

/** Echoes the key, so a row's label and copy can be asserted without a locale. */
const t = (key: string) => key;

const BID: TruckBidArgs = {
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
};

const value = (fields: { label: string; value: string }[], label: string) => fields.find((f) => f.label === label)?.value;

describe('bid card fields (PTB-02 / PTB-03)', () => {
  it('names the truck with its subtype, in Greek when the UI is Greek', () => {
    expect(bidTruckLabel(BID, 'en')).toBe('Semi-trailer · Refrigerated');
    expect(bidTruckLabel(BID, 'el')).toBe('Επικαθήμενο · Ψυγείο');
    expect(bidTruckLabel({ truck_type_name: 'Van' }, 'el')).toBe('Van');
  });

  it('shows the price with its currency and says it is the asking price when quote was left out', () => {
    const fields = bidFields(BID, t, 'en');
    const price = value(fields, 'vagonai.confirm.bid.price');
    expect(price).toContain('€');
    expect(price).toContain('1,200');
    expect(price).toContain('vagonai.confirm.bid.askingPrice');
  });

  it('labels a quoted figure as the shipper\'s own offer, in a non-euro currency', () => {
    const fields = bidFields({ ...BID, offer_price: 4800, offer_currency: 'RON', offer_price_source: 'quote' }, t, 'en');
    const price = value(fields, 'vagonai.confirm.bid.price');
    expect(price).toContain('RON');
    expect(price).toContain('4,800');
    expect(price).toContain('vagonai.confirm.bid.yourOffer');
  });

  it('lists truck, carrier, load and lane, and the exact-match verdict both ways', () => {
    const fields = bidFields(BID, t, 'en');
    expect(value(fields, 'vagonai.confirm.bid.truck')).toBe('Semi-trailer · Refrigerated');
    expect(value(fields, 'vagonai.confirm.bid.carrier')).toBe('Trans Hellas');
    expect(value(fields, 'vagonai.confirm.bid.load')).toBe('LD-2026-0042 · Athens → Thessaloniki');
    expect(value(fields, 'vagonai.confirm.bid.match')).toBe('vagonai.confirm.bid.exactYes');
    expect(value(bidFields({ ...BID, exact_match: false }, t, 'en'), 'vagonai.confirm.bid.match')).toBe('vagonai.confirm.bid.exactNo');
  });

  it('shows the note only when there is one, and never leaks ids as rows', () => {
    expect(value(bidFields(BID, t, 'en'), 'vagonai.confirm.bid.notes')).toBeUndefined();
    expect(value(bidFields({ ...BID, notes: 'Tail lift needed' }, t, 'en'), 'vagonai.confirm.bid.notes')).toBe('Tail lift needed');
    const all = bidFields(BID, t, 'en').map((f) => f.value).join(' ');
    expect(all).not.toContain('5512');
    expect(all).not.toContain('9001');
  });
});

describe('bid card price row is never missing (FAT-01 round 1, FE-S1)', () => {
  // What a gateway without PR #7 sends: no offer_price / offer_currency / offer_price_source.
  const OLD_GATEWAY: TruckBidArgs = Object.fromEntries(
    Object.entries(BID).filter(([key]) => !['offer_price', 'offer_currency', 'offer_price_source'].includes(key)),
  );

  it('falls back to quote when offer_price is missing (an older gateway)', () => {
    const fields = bidFields({ ...OLD_GATEWAY, quote: 950 }, t, 'en');
    const price = value(fields, 'vagonai.confirm.bid.price');
    expect(price).toContain('950');
    expect(price).toContain('€');
    expect(price).toContain('vagonai.confirm.bid.yourOffer');
  });

  it('shows a warning row - not no row - when there is no figure at all', () => {
    const fields = bidFields(OLD_GATEWAY, t, 'en');
    expect(value(fields, 'vagonai.confirm.bid.price')).toBe('vagonai.confirm.bid.priceNotShown');
    expect(bidPriceValue(OLD_GATEWAY, t)).toEqual({ value: 'vagonai.confirm.bid.priceNotShown', missing: true });
  });

  it('prefers offer_price over quote when both are present', () => {
    const price = value(bidFields({ ...BID, offer_price_source: 'quote', offer_price: 900, quote: 900 }, t, 'en'), 'vagonai.confirm.bid.price');
    expect(price).toContain('900');
    expect(bidPriceValue({ ...BID, quote: 1 }, t).missing).toBe(false);
  });

  it('every bid card - new gateway, old gateway with quote, old gateway without - has a price row', () => {
    for (const args of [BID, { ...OLD_GATEWAY, quote: 950 }, OLD_GATEWAY]) {
      expect(value(bidFields(args, t, 'en'), 'vagonai.confirm.bid.price')).toBeTruthy();
    }
  });

  it('can leave the truck row out when the heading already names it (N4)', () => {
    expect(value(bidFields(BID, t, 'en', { omitTruck: true }), 'vagonai.confirm.bid.truck')).toBeUndefined();
    expect(value(bidFields(BID, t, 'en'), 'vagonai.confirm.bid.truck')).toBe('Semi-trailer · Refrigerated');
  });
});

describe('publish card truck row (PUB-02)', () => {
  it('names a narrowed type with its subtype', () => {
    expect(publishTruckValue({
      vehicle_selection: [{ type_id: 4, type_name: 'Semi-trailer', subtypes: [{ id: 31, name: 'Refrigerated', name_el: 'Ψυγείο' }], any_subtype: false }],
    }, t, 'en')).toBe('Semi-trailer · Refrigerated');
  });

  it('says "any subtype" for a type sent without one, so a widened request is visible', () => {
    expect(publishTruckValue({
      vehicle_selection: [{ type_id: 4, type_name: 'Semi-trailer', subtypes: [], any_subtype: true }],
    }, t, 'en')).toBe('Semi-trailer · vagonai.confirm.publish.anySubtype');
  });

  it('a narrowed and a widened publish read differently', () => {
    const narrowed = publishTruckValue({ vehicle_selection: [{ type_id: 4, type_name: 'Semi-trailer', subtypes: [{ id: 31, name: 'Refrigerated' }], any_subtype: false }] }, t, 'en');
    const widened = publishTruckValue({ vehicle_selection: [{ type_id: 4, type_name: 'Semi-trailer', subtypes: [], any_subtype: true }] }, t, 'en');
    expect(narrowed).not.toBe(widened);
  });

  it('uses Greek names in Greek and joins several types', () => {
    expect(publishTruckValue({
      vehicle_selection: [
        { type_id: 4, type_name: 'Semi-trailer', type_name_el: 'Επικαθήμενο', subtypes: [{ id: 31, name: 'Refrigerated', name_el: 'Ψυγείο' }], any_subtype: false },
        { type_id: 7, type_name: 'Van', subtypes: [], any_subtype: true },
      ],
    }, t, 'el')).toBe('Επικαθήμενο · Ψυγείο, Van · vagonai.confirm.publish.anySubtype');
  });

  it('falls back to the older name lists from an older gateway', () => {
    expect(publishTruckValue({ vehicle_type_names: ['Semi-trailer'], vehicle_subtype_names: ['Semi-trailer - Reefer'] }, t, 'en')).toBe('Semi-trailer - Reefer');
    expect(publishTruckValue({ vehicle_type_names: ['Semi-trailer', 'Van'] }, t, 'en')).toBe('Semi-trailer, Van');
  });

  it('joinTruckName dedupes a subtype that repeats its type', () => {
    expect(joinTruckName('Reefer', 'reefer')).toBe('Reefer');
  });
});
