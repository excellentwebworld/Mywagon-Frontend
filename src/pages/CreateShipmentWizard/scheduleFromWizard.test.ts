/**
 * Guards for the wizard-to-draft mapping.
 *
 * The cases that matter, and why each is here rather than left to the type
 * checker:
 *
 * - **No ids are invented.** This is the whole reason the feature was reworked.
 *   A missing `locationId` or `productId` must refuse, because the version that
 *   guessed from a name is what produced the "a few things have to be chosen"
 *   screen — and at posting time there is nobody to answer it.
 * - **Stop times carry no offset.** They are wall clock; the posting instant is
 *   not. Both typecheck as `string`, and getting them the wrong way round shifts
 *   every stop in the batch by the server's offset — invisible on a UTC box.
 * - **A closing time is never invented.** Defaulting an absent `timeTo` to
 *   `00:00` puts a window's close before its open, a failure this converter
 *   would have created on its own.
 * - **An inexpressible unit refuses instead of coercing.** Quietly turning Big
 *   Bags into Units would do it on every load in the batch, to carriers bidding
 *   on what they were shown.
 */
import { describe, expect, it } from 'vitest';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import type { WizardVehicleType } from '../../components/CreateShipmentWizard/vehicleTypes';
import { wizardValuesToDraft, windowsFromWizard } from './scheduleFromWizard';

function line(overrides: Partial<WizardFormValues['stops'][number]['lines'][number]> = {}) {
  return {
    id: 'l-1',
    productId: 'sku-1',
    productName: 'Olive oil',
    customerId: 'cus-1',
    customerName: 'Acme',
    orderId: 'ord-1',
    orderRef: 'PO-1',
    orderLineId: '9',
    action: 'pickup' as const,
    qty: '16',
    unit: 'EUR Pallets',
    weight: '13',
    wtUnit: 'Tonnes',
    mirrorOf: '',
    ...overrides,
  };
}

function stop(overrides: Partial<WizardFormValues['stops'][number]> = {}) {
  return {
    id: 's-1',
    locationId: 'loc-1',
    locationName: 'Athens DC',
    locationCompany: '',
    locationCity: 'Athens',
    locationCountry: 'GR',
    dateFrom: '2026-09-10',
    timeFrom: '06:00',
    dateTo: '',
    timeTo: '',
    expanded: false,
    lines: [line()],
    noteCarrier: '',
    noteInternal: '',
    contactName: '',
    contactPhone: '',
    appointmentMode: 'fixed' as const,
    windowStart: '',
    windowEnd: '',
    allowedLoadingPoints: [],
    ...overrides,
  };
}

function values(overrides: Partial<WizardFormValues> = {}): WizardFormValues {
  return {
    loadId: 'SID-NEW',
    custRef: 'PO-4821',
    coOwners: [],
    stops: [
      stop(),
      stop({
        id: 's-2',
        locationId: 'loc-2',
        locationName: 'Thessaloniki Hub',
        dateFrom: '2026-09-10',
        timeFrom: '18:00',
        lines: [line({ id: 'l-2', action: 'dropoff' })],
      }),
    ],
    itineraryConfirmed: true,
    itineraryConfirmSnapshot: 'fp',
    routeSummary: { totalDistKm: 447, totalDriveMin: 320 },
    vehicleSpecs: { '3': ['11', '12'] },
    vehicleSelectionConfirmed: true,
    broadcastType: 'private',
    selectedCarriers: ['ptr-1'],
    targetPrice: '520',
    negotiable: true,
    trackingEmails: { 'ord-1': ['ops@acme.example'] },
    driverNotes: '',
    gpsRequired: true,
    orderValue: '',
    ...overrides,
  } as WizardFormValues;
}

const CATALOG: WizardVehicleType[] = [
  {
    formKey: '3',
    name: 'Truck',
    nameEl: 'Φορτηγό',
    subtitle: '',
    categories: [
      {
        id: 'c-1',
        label: 'Trailer',
        labelEl: '',
        items: [
          { id: '11', label: 'Curtainsider', labelEl: '' },
          { id: '12', label: 'Box', labelEl: '' },
          { id: '13', label: 'Reefer', labelEl: '' },
        ],
      },
    ],
  },
];

function ok(result: ReturnType<typeof wizardValuesToDraft>) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`);
  return result;
}

/** Every cargo line across the itinerary, for the cases that count the load. */
const flatLines = <L,>(draft: { stops: { lines: L[] }[] }): L[] => draft.stops.flatMap((s) => s.lines);

describe('wizardValuesToDraft', () => {
  it('maps a complete wizard load without asking anything', () => {
    const result = ok(wizardValuesToDraft(values()));

    expect(result.draft.stops).toHaveLength(2);
    expect(result.draft.stops[0]).toMatchObject({ locationId: 'loc-1' });
    expect(result.draft.stops[1]).toMatchObject({ locationId: 'loc-2' });
    // Cargo now sits under the stop that handles it rather than in one flat
    // array, which is what lets a wizard-built multi-stop load be scheduled as
    // the load it actually is.
    expect(flatLines(result.draft)).toHaveLength(2);
    expect(result.draft.stops.map((s) => s.lines.length)).toEqual([1, 1]);
    expect(result.draft.customerReference).toBe('PO-4821');
    expect(result.draft.pricing.startingPrice).toBe(520);
    expect(result.draft.routeSummary).toBeUndefined();
    expect(result.routeSummary).toEqual({ total_dist_km: 447, total_drive_min: 320 });
  });

  it('carries every record id straight through, and invents none', () => {
    // The headline case. The previous design matched names to records here; this
    // one has ids because the shipper picked them from their own catalogs.
    const result = ok(wizardValuesToDraft(values()));
    expect(result.draft.stops.map((s) => s.locationId)).toEqual(['loc-1', 'loc-2']);
    expect(flatLines(result.draft).map((l) => l.productId)).toEqual(['sku-1', 'sku-1']);
    expect(flatLines(result.draft)[0]).toMatchObject({ orderId: 'ord-1', orderLineId: '9', customerId: 'cus-1' });
  });

  it('refuses a stop with no saved location rather than guessing from its name', () => {
    const broken = values({
      stops: [stop({ locationId: '', locationName: 'Athens DC' }), stop({ id: 's-2', locationId: 'loc-2' })],
    });
    const result = wizardValuesToDraft(broken);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('stops[0].locationId');
  });

  it('refuses a cargo line with no product rather than guessing from its name', () => {
    const broken = values({
      stops: [
        stop({ lines: [line({ productId: '', productName: 'Olive oil' })] }),
        stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'dropoff' })] }),
      ],
    });
    const result = wizardValuesToDraft(broken);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('stops[0].lines[0].productId');
  });

  it('writes stop times as a zone-less wall clock, never an instant', () => {
    // Laravel re-materializes stop times against its own zone, so an offset here
    // would be applied twice. The posting time is the opposite and is built by
    // the modal, not by this file.
    const result = ok(wizardValuesToDraft(values()));
    expect(result.draft.stops[0].from).toBe('2026-09-10T06:00');
    expect(result.draft.stops[0].from).not.toMatch(/[Zz]|[+-]\d{2}:?\d{2}$/);
    expect(result.draft.stops[1].from).toBe('2026-09-10T18:00');
  });

  it('never invents a closing time from a closing date alone', () => {
    // `00:00` here would put the window's close before its open, and the publish
    // gate would report a failure this converter had created.
    const result = ok(
      wizardValuesToDraft(
        values({
          stops: [
            stop({ dateTo: '2026-09-10', timeTo: '' }),
            stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'dropoff' })] }),
          ],
        }),
      ),
    );
    expect(result.draft.stops[0].to).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/closing date but no closing time/i);
  });

  it('carries a closing time when there is a real one', () => {
    const result = ok(
      wizardValuesToDraft(
        values({
          stops: [
            stop({ dateTo: '2026-09-10', timeTo: '10:00' }),
            stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'dropoff' })] }),
          ],
        }),
      ),
    );
    expect(result.draft.stops[0].to).toBe('2026-09-10T10:00');
  });

  it('refuses a unit the draft cannot express instead of coercing it', () => {
    // Big Bags has no draft equivalent. Reclassifying it as Units would do so on
    // every load in the batch, to carriers who bid on what they were shown.
    const result = wizardValuesToDraft(
      values({
        stops: [
          stop({ lines: [line({ unit: 'Big Bags' })] }),
          stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'dropoff' })] }),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('stops[0].lines[0].unit');
    expect(result.reason).toMatch(/EUR Pallets and Units only/i);
  });

  it('maps the two units it does support, both ways', () => {
    const result = ok(
      wizardValuesToDraft(
        values({
          stops: [
            stop({ lines: [line({ unit: 'Units', wtUnit: 'Kgs' })] }),
            stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'dropoff' })] }),
          ],
        }),
      ),
    );
    expect(flatLines(result.draft)[0]).toMatchObject({ unit: 'UNIT', wUnit: 'KG' });
    expect(flatLines(result.draft)[1]).toMatchObject({ unit: 'EUR_PALLET', wUnit: 'T' });
  });

  it('reads a stop role from its lines, not from its position', () => {
    // A three-stop run that unloads in the middle. Position alone would call the
    // middle stop a dropoff and the itinerary would be wrong at the far end.
    const result = ok(
      wizardValuesToDraft(
        values({
          stops: [
            stop(),
            stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'pickup' })] }),
            stop({ id: 's-3', locationId: 'loc-3', lines: [line({ id: 'l-3', action: 'dropoff' })] }),
          ],
        }),
      ),
    );
    // Derived from each stop's OWN cargo, and the point of the change: stop 2
    // keeps its pickup line instead of being flattened into a shared array and
    // relabelled by position.
    expect(result.draft.stops.map((s) => s.lines.map((l) => l.action))).toEqual([
      ['pick'],
      ['pick'],
      ['drop'],
    ]);
  });

  it('maps line actions to the draft vocabulary', () => {
    const result = ok(wizardValuesToDraft(values()));
    expect(flatLines(result.draft).map((l) => l.action)).toEqual(['pick', 'drop']);
  });

  it('takes vehicle type ids from the spec keys', () => {
    const result = ok(wizardValuesToDraft(values()));
    expect(result.draft.vehicleTypeIds).toEqual(['3']);
  });

  it('ignores a vehicle type whose subtypes were all deselected', () => {
    const result = ok(wizardValuesToDraft(values({ vehicleSpecs: { '3': ['11'], '4': [] } })));
    expect(result.draft.vehicleTypeIds).toEqual(['3']);
  });

  it('warns when the batch will accept more subtypes than were ticked', () => {
    // Two of three items chosen. The draft carries the type only, so the batch
    // is broader than the load in front of them - said out loud, not silently.
    const result = ok(wizardValuesToDraft(values(), { vehicleTypes: CATALOG }));
    expect(result.warnings.join(' ')).toMatch(/any Truck/i);
  });

  it('does not warn when every subtype of the type was ticked', () => {
    const result = ok(
      wizardValuesToDraft(values({ vehicleSpecs: { '3': ['11', '12', '13'] } }), { vehicleTypes: CATALOG }),
    );
    expect(result.warnings.join(' ')).not.toMatch(/any Truck/i);
  });

  it('maps a private load to its carriers', () => {
    const priv = ok(wizardValuesToDraft(values()));
    expect(priv.draft.broadcast).toMatchObject({ channels: ['private'], carrierPartnerIds: ['ptr-1'] });
  });

  /*
   * A marketplace load cannot become a batch here, and the refusal is the point.
   *
   * Vagon AI posts to the shipper's own carriers only, so a template saying
   * `public` would either be refused by the gateway or - far worse - quietly
   * posted to the carriers on the load instead of the market the shipper chose.
   * Refused with the same shape as every other gap, so the drawer reports it
   * like one.
   */
  it('refuses to copy a marketplace load rather than quietly making it private', () => {
    const result = wizardValuesToDraft(values({ broadcastType: 'public', selectedCarriers: ['ptr-1'] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('broadcast.channels');
    expect(result.reason).toMatch(/your own carriers only/i);
  });

  it('keeps every queued load a single-mode create', () => {
    // The batch is the gateway's queue, not a bulk mode the core API refuses.
    const result = ok(wizardValuesToDraft(values()));
    expect(result.draft.bulk).toEqual({ mode: 'single' });
  });

  it('treats a blank or zero price as no price rather than as zero', () => {
    expect(ok(wizardValuesToDraft(values({ targetPrice: '' }))).draft.pricing.startingPrice).toBeNull();
    expect(ok(wizardValuesToDraft(values({ targetPrice: '0' }))).draft.pricing.startingPrice).toBeNull();
  });

  it('carries only the order ids that actually have a tracking recipient', () => {
    const result = ok(
      wizardValuesToDraft(values({ trackingEmails: { 'ord-1': ['ops@acme.example'], 'ord-2': [] } })),
    );
    expect(result.draft.trackingOrderIds).toEqual(['ord-1']);
  });

  it('warns rather than refuses when the route has not been measured', () => {
    // The gateway refuses without one, but the shipper fixes it in step 2 - so
    // this reports it where they can act on it instead of blocking the mapping.
    const result = ok(wizardValuesToDraft(values({ routeSummary: null })));
    expect(result.routeSummary).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/no measured route/i);
  });

  it('refuses a one-stop itinerary', () => {
    const result = wizardValuesToDraft(values({ stops: [stop()] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('stops');
  });

  it('refuses an itinerary with no drop-off at all', () => {
    const result = wizardValuesToDraft(
      values({
        stops: [stop(), stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'pickup' })] })],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('stops');
  });

  it('reports every problem at once rather than the first', () => {
    const result = wizardValuesToDraft(
      values({
        stops: [
          stop({ locationId: '', lines: [line({ productId: '', qty: '0' })] }),
          stop({ id: 's-2', locationId: 'loc-2', lines: [line({ id: 'l-2', action: 'dropoff' })] }),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const path of ['stops[0].locationId', 'stops[0].lines[0].productId', 'stops[0].lines[0].qty']) {
      expect(result.missing).toContain(path);
    }
  });
});

describe('windowsFromWizard', () => {
  it('seeds the modal from the load being scheduled', () => {
    // A repeat of the load in front of them almost always moves its dates
    // forward, so starting from today would be a worse guess than starting here.
    expect(windowsFromWizard(values())).toEqual({
      pickup: { date: '2026-09-10', time: '06:00' },
      dropoff: { date: '2026-09-10', time: '18:00' },
    });
  });

  it('returns blanks when the wizard has nothing, so the modal still asks', () => {
    const bare = values({ stops: [stop({ dateFrom: '', timeFrom: '' }), stop({ id: 's-2', dateFrom: '', timeFrom: '' })] });
    expect(windowsFromWizard(bare)).toEqual({
      pickup: { date: '', time: '' },
      dropoff: { date: '', time: '' },
    });
  });
});
