import { describe, expect, it } from 'vitest';
import type { FlowBundle, FlowDraftSeed, FlowOrder } from '../../hooks/useChat';
import {
  allLines, draftFromSeed, gapHints, mergeSeedIntoDraft, saveIssues, sectionComplete, sectionForField, sendIssues,
  stopRole, toggleTrackingOrder, trackingCandidates,
} from './createShipmentDraft';

/**
 * Reading the load the gateway assembled.
 *
 * This replaces the prefill suite. That file tested `draftFromPrefill`, which
 * turned an order's stops and lines into a draft on the CLIENT; the gateway does
 * that now (`shipmentFlow/autoDraft.ts`, guarded in its own suite) and sends a
 * finished draft. What is left on this side is smaller and worth pinning
 * exactly:
 *
 * **The seed is copied, never interpreted.** A blank site or a zero quantity is
 * a gap the card asks about, and anything this file "helpfully" filled in would
 * be a value nobody chose sitting on real freight.
 *
 * **The channel is not read off the wire.** Every load built here is private. A
 * bundle from an older gateway carrying something else must not render a load
 * the server then refuses.
 *
 * **Saving and sending have different bars.** `saveIssues` is the itinerary and
 * the cargo; `sendIssues` adds the truck, the carrier and the price. Confusing
 * the two is how a Save button starts refusing the unfinished load it exists to
 * keep.
 */

/** A load as the gateway assembles one: Athens to Milan, one matched product. */
function seed(overrides: Partial<FlowDraftSeed> = {}): FlowDraftSeed {
  const line = (action: 'pick' | 'drop') => ({
    productId: '97',
    productName: 'Frozen peas',
    action,
    qty: 10,
    unit: 'EUR_PALLET' as const,
    weight: 8000,
    wUnit: 'KG' as const,
    sourceUnit: 'EUR Pallets',
    orderId: '1042',
    orderLineId: '5511',
    customerId: '31',
  });

  return {
    customerReference: null,
    stops: [
      { locationId: '1841', locationName: 'Athens DC', from: '2030-09-14T08:00', to: null, lines: [line('pick')] },
      { locationId: '1842', locationName: 'Milan DC', from: '2030-09-16T08:00', to: null, lines: [line('drop')] },
    ],
    vehicleTypeIds: ['3'],
    vehicleCategoryIds: [],
    broadcast: { channels: ['private'], carrierPartnerIds: ['3312'], driverId: null },
    pricing: { negotiable: true, startingPrice: 1200, negotiableFloor: null, currency: 'EUR' },
    requireTracking: false,
    responseWindow: '48h',
    settlement: 'direct',
    bulk: { mode: 'single' },
    trackingOrderIds: [],
    ...overrides,
  };
}

const ORDER: FlowOrder = {
  orderId: '1042',
  reference: 'ORD-88',
  customerName: 'Alphavita SA',
  customerId: '31',
  deliveryDate: '2026-09-16',
  trackingEmail: 'ops@alphavita.example',
};

function bundle(draft: FlowDraftSeed = seed(), orders: FlowOrder[] = [ORDER]): FlowBundle {
  return {
    draft,
    gaps: [],
    suggestions: {
      vehicle: {
        vehicleTypeId: '3',
        label: 'Rigid truck',
        capacityClass: 'rigid',
        capacity: { maxPallets: 14, maxWeightKg: 12000 },
        utilizationPct: 67,
        fit: 'FITS',
        rationale: 'Rigid truck chosen for 8 t over 10 pallets - about 67% of what it holds.',
      },
      partner: { partnerId: '3312', name: 'Kappa Logistics', reason: 'they are marked preferred', named: false },
      partnerAlternatives: [],
    },
    orders,
    locations: [
      { id: '1841', name: 'Athens DC', city: 'Athens', country: 'GR', role: 'both', lat: 37.9, lng: 23.7 },
      { id: '1842', name: 'Milan DC', city: 'Milan', country: 'IT', role: 'both', lat: 45.4, lng: 9.2 },
    ],
    products: [{ id: '97', name: 'Frozen peas', sku: 'SKU-97', category: null, type: null }],
    partners: [{ id: '3312', name: 'Kappa Logistics', uniqueId: 'MVC1', type: 'carrier_company', rating: 4.6, preferred: true, trips: 12, vehicleTypes: [], contractLanes: [] }],
    vehicleTypes: [{ id: '3', label: 'Rigid truck', subtypes: [], categoryIds: [], subtypeOptions: [] }],
    defaults: {
      responseWindow: '48h',
      settlement: 'direct',
      requireTracking: false,
      negotiable: true,
      currency: 'EUR',
      bulkMode: 'single',
    },
    rules: {},
    notes: [],
    truncated: {},
  };
}

describe('draftFromSeed', () => {
  it('copies the assembled load field for field', () => {
    const draft = draftFromSeed(bundle());

    expect(draft.stops).toHaveLength(2);
    expect(draft.stops[0]?.locationId).toBe('1841');
    expect(draft.stops[0]?.from).toBe('2030-09-14T08:00');
    expect(draft.vehicleTypeIds).toEqual(['3']);
    expect(draft.broadcast.carrierPartnerIds).toEqual(['3312']);
    expect(draft.pricing.startingPrice).toBe(1200);
  });

  /*
   * The ERP linkage is the one thing a load built by hand can never recover:
   * `orderLineId` completes the order-to-product mapping, and the order id is
   * the only key a tracking link can be sent against.
   */
  it('carries the ERP linkage onto every cargo line', () => {
    const lines = allLines(draftFromSeed(bundle()));
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.orderId).toBe('1042');
      expect(line.orderLineId).toBe('5511');
      expect(line.customerId).toBe('31');
    }
  });

  it('delivers what it collects, so the card never shows an empty delivery', () => {
    const draft = draftFromSeed(bundle());
    expect(stopRole(draft.stops[0]!)).toBe('pickup');
    expect(stopRole(draft.stops[1]!)).toBe('dropoff');
  });

  /*
   * The narrowing has to happen HERE and not only on the server. A bundle from
   * an older gateway could still carry `public`, and rendering it would show a
   * shipper a marketplace load that the save then refuses.
   */
  it('is private whatever the wire says', () => {
    const draft = draftFromSeed(bundle(seed({
      broadcast: { channels: ['public'], carrierPartnerIds: ['3312'], driverId: null },
    })));
    expect(draft.broadcast.channels).toEqual(['private']);
  });

  it("keeps the shipper's remembered defaults when the seed is silent", () => {
    const b = bundle(seed());
    b.defaults.requireTracking = true;
    const bare = { ...seed() } as FlowDraftSeed;
    // @ts-expect-error - an older gateway simply omits the field
    delete bare.requireTracking;
    expect(draftFromSeed({ ...b, draft: bare }).requireTracking).toBe(true);
  });
});

describe('gaps', () => {
  it('leaves a site the order recorded as text blank, and offers its own words to search with', () => {
    const b = bundle(seed({
      stops: [
        { locationId: '', locationName: 'Athens Depot', from: '2030-09-14T08:00', to: null, lines: seed().stops[0]!.lines },
        seed().stops[1]!,
      ],
    }));

    expect(draftFromSeed(b).stops[0]?.locationId).toBe('');
    expect(gapHints(b)['stops[0].locationId']).toBe('Athens Depot');
    expect(saveIssues(draftFromSeed(b)).some((issue) => issue.field === 'stops[0].locationId')).toBe(true);
    expect(sectionComplete(draftFromSeed(b), 'route')).toBe(false);
  });

  it('leaves an unmatched product blank rather than picking one that looks close', () => {
    const b = bundle(seed({
      stops: seed().stops.map((stop) => ({
        ...stop,
        lines: stop.lines.map((line) => ({ ...line, productId: '', productName: 'Sprite 1.5L' })),
      })),
    }));

    const draft = draftFromSeed(b);
    expect(allLines(draft).every((line) => line.productId === '')).toBe(true);
    expect(gapHints(b)['stops[0].lines[0].productId']).toBe('Sprite 1.5L');

    const issue = saveIssues(draft).find((i) => i.field.endsWith('.productId'));
    expect(issue).toBeDefined();
    expect(sectionForField(issue!.field)).toBe('cargo');
  });

  /*
   * The distinction the whole card is built on. A load with no price SAVES
   * perfectly - that is what a draft is - and only fails to send.
   */
  it('keeps a missing price out of the way of Save as draft', () => {
    const draft = draftFromSeed(bundle(seed({
      pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
    })));

    expect(saveIssues(draft)).toEqual([]);
    expect(sendIssues(draft).some((issue) => issue.field === 'pricing.startingPrice')).toBe(true);
  });

  it('keeps a missing carrier out of the way of Save as draft too', () => {
    const draft = draftFromSeed(bundle(seed({
      broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
    })));

    expect(saveIssues(draft)).toEqual([]);
    expect(sendIssues(draft).some((issue) => issue.field === 'broadcast.carrierPartnerIds')).toBe(true);
    expect(sectionForField('broadcast.carrierPartnerIds')).toBe('carrier');
  });
});

describe('tracking recipients', () => {
  it('offers the customers whose orders are still on the load', () => {
    const candidates = trackingCandidates(draftFromSeed(bundle()), bundle());
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ orderId: '1042', customerName: 'Alphavita SA' });
  });

  /*
   * MYVAGON accepts `tracking_emails` only against order ids actually on the
   * cargo and silently drops anything else, so an order whose lines the shipper
   * deleted has to disappear from the offer rather than be promised and dropped.
   */
  it('drops an order once its cargo is gone', () => {
    const draft = draftFromSeed(bundle());
    const emptied = { ...draft, stops: draft.stops.map((stop) => ({ ...stop, lines: [] })) };
    expect(trackingCandidates(emptied, bundle())).toEqual([]);
  });

  it('offers nothing on a load that was not built from an order', () => {
    const b = bundle(seed(), []);
    expect(trackingCandidates(draftFromSeed(b), b)).toEqual([]);
  });

  it('holds ids only, never an address', () => {
    const draft = toggleTrackingOrder(draftFromSeed(bundle()), '1042');
    expect(draft.trackingOrderIds).toEqual(['1042']);
    expect(draft.trackingOrderIds.every((id) => !id.includes('@'))).toBe(true);
    expect(toggleTrackingOrder(draft, '1042').trackingOrderIds).toEqual([]);
  });
});

describe('mergeSeedIntoDraft', () => {
  it('fills zero qty/weight from a refreshed seed without wiping a site the shipper set', () => {
    const incomplete = draftFromSeed(bundle(seed({
      stops: [
        {
          locationId: '1841',
          locationName: 'Athens DC',
          from: '2030-09-14T08:00',
          to: null,
          lines: [{
            productId: '97', productName: 'Frozen peas', action: 'pick',
            qty: 0, unit: 'EUR_PALLET', weight: 0, wUnit: 'KG',
            sourceUnit: null, orderId: '1042', orderLineId: '5511', customerId: '31',
          }],
        },
        seed().stops[1]!,
      ],
    })));
    // Shipper picked a delivery site on the card while weight was still missing.
    incomplete.stops[1]!.locationId = '9999';

    const refreshed = draftFromSeed(bundle(seed({
      stops: [
        {
          locationId: '1841',
          locationName: 'Athens DC',
          from: '2030-09-14T08:00',
          to: null,
          lines: [{
            productId: '97', productName: 'Frozen peas', action: 'pick',
            qty: 12, unit: 'EUR_PALLET', weight: 9600, wUnit: 'KG',
            sourceUnit: null, orderId: '1042', orderLineId: '5511', customerId: '31',
          }],
        },
        seed().stops[1]!,
      ],
    })));

    const merged = mergeSeedIntoDraft(incomplete, refreshed);
    expect(merged.stops[0]!.lines[0]!.qty).toBe(12);
    expect(merged.stops[0]!.lines[0]!.weight).toBe(9600);
    expect(merged.stops[1]!.locationId).toBe('9999');
  });

  it('keeps a qty the shipper already typed when the seed repeats an older zero', () => {
    const current = draftFromSeed(bundle());
    current.stops[0]!.lines[0]!.qty = 15;
    const stale = draftFromSeed(bundle(seed({
      stops: seed().stops.map((stop) => ({
        ...stop,
        lines: stop.lines.map((line) => ({ ...line, qty: 0, weight: 0 })),
      })),
    })));
    const merged = mergeSeedIntoDraft(current, stale);
    expect(merged.stops[0]!.lines[0]!.qty).toBe(15);
  });

  // "set price 500" typed in chat while the card is open. The gateway refreshes
  // the seed with 500; the card already shows 1200 from the first seed, so
  // fill-the-blanks alone would keep 1200 while the assistant said it changed.
  it('lets a price changed in chat replace the one already on the card', () => {
    const first = draftFromSeed(bundle());
    const current = draftFromSeed(bundle());
    const refreshed = draftFromSeed(bundle(seed({
      pricing: { negotiable: false, startingPrice: 500, negotiableFloor: null, currency: 'EUR' },
    })));

    const merged = mergeSeedIntoDraft(current, refreshed, first);
    expect(merged.pricing.startingPrice).toBe(500);
    expect(merged.pricing.negotiable).toBe(false);
  });

  it('lets a pickup time changed in chat replace the one already on the card', () => {
    const first = draftFromSeed(bundle());
    const current = draftFromSeed(bundle());
    const refreshed = draftFromSeed(bundle(seed({
      stops: [{ ...seed().stops[0]!, from: '2030-09-15T09:00' }, seed().stops[1]!],
    })));

    const merged = mergeSeedIntoDraft(current, refreshed, first);
    expect(merged.stops[0]!.from).toBe('2030-09-15T09:00');
    expect(merged.stops[1]!.from).toBe('2030-09-16T08:00');
  });

  it('keeps an edit typed on the card when the refreshed seed did not touch that field', () => {
    const first = draftFromSeed(bundle());
    const current = draftFromSeed(bundle());
    current.pricing.startingPrice = 950;
    current.stops[0]!.lines[0]!.qty = 12;
    const refreshed = draftFromSeed(bundle(seed({ customerReference: 'PO-99' })));

    const merged = mergeSeedIntoDraft(current, refreshed, first);
    expect(merged.pricing.startingPrice).toBe(950);
    expect(merged.stops[0]!.lines[0]!.qty).toBe(12);
    expect(merged.customerReference).toBe('PO-99');
  });
});
