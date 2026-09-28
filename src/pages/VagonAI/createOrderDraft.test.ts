import { describe, expect, it } from 'vitest';
import type { OrderFlowBundle } from '../../hooks/useChat';
import {
  ORDER_QTY_UNITS, ORDER_WEIGHT_UNITS, emptyOrderDraft, emptyOrderLine, orderIssues,
  orderWarnings, referenceClashOf, serializeOrderDraft, setLineProduct,
  type OrderDraft,
} from './createOrderDraft';

/**
 * The create-order form's own rules, asserted without React.
 *
 * The cases worth knowing about:
 *
 * - **A past delivery date is ACCEPTED.** This is the one place the order form
 *   deliberately disagrees with the shipment wizard, which refuses a past-dated
 *   stop because an unbookable stop is a broken load. Orders get entered late,
 *   and refusing a back-dated one would break the data entry this form exists to
 *   do — so the absence of that check is asserted, not assumed.
 * - **A ship date after its delivery date is blamed on the SHIP date.** The
 *   delivery date is the one the customer agreed to; `issues[0].field` is what
 *   the form scrolls to, and sending them to the delivery date sends them to the
 *   wrong field.
 * - **A reference clash is not a malformed field.** It has to be reported
 *   separately from `orderIssues`, because the ID is perfectly valid — it is just
 *   taken, and MYVAGON will refuse it after the whole form has been filled in.
 * - **A line with no product id still files.** MYVAGON accepts a bare
 *   `product_name`, so a product not yet in the Product Master is warned about
 *   rather than blocked — the alternative is derailing an order into an
 *   add-product flow nobody asked for.
 * - **The units are the shipment's own cargo vocabulary, spelled identically.**
 *   The API stores an order line's unit as free text, so nothing on the wire
 *   keeps them in step: an order filed as "pallets" and a cargo line that only
 *   understands "EUR Pallets" is how a load built from an order loses its unit.
 */

function bundle(overrides: Partial<OrderFlowBundle> = {}): OrderFlowBundle {
  return {
    customers: [
      { id: '31', name: 'Alphavita SA', vat: 'EL123456789', email: 'ops@alphavita.gr', isPartner: false },
      { id: '32', name: 'Sklavenitis', vat: null, email: null, isPartner: true },
    ],
    locations: [
      { id: '1841', name: 'Athens DC', company: 'MYVAGON', city: 'Athens', role: 'both' },
      { id: '1842', name: 'Milan Store', company: 'Alphavita', city: 'Milan', role: 'delivery' },
    ],
    products: [
      {
        id: '97',
        name: 'Frozen Peas 2kg',
        sku: 'FRZ-PEAS-2KG',
        category: 'Frozen',
        defaults: { unit: 'Case', weightPerUnit: 12.5, weightUnit: 'kg' },
      },
      { id: '98', name: 'Basmati Rice 5kg', sku: 'RICE-5KG', category: 'Dry Goods' },
    ],
    existingReferences: ['ORD-20260907-1', 'PO-4821'],
    defaults: { orderReference: 'ORD-20260907-2', qtyUnit: 'EUR Pallets', weightUnit: 'Kgs', highPriority: false },
    rules: {},
    notes: [],
    truncated: {},
    ...overrides,
  };
}

function draft(overrides: Partial<OrderDraft> = {}): OrderDraft {
  const base = emptyOrderDraft(bundle());
  return {
    ...base,
    customerId: '31',
    customerName: 'Alphavita SA',
    deliveryDate: '2026-09-14',
    lines: [{ ...base.lines[0]!, productId: '97', productName: 'Frozen Peas 2kg', qty: 20, weight: 8000 }],
    ...overrides,
  };
}

describe('emptyOrderDraft', () => {
  it('opens on the suggested reference from the bundle, never a local constant', () => {
    expect(emptyOrderDraft(bundle()).orderReference).toBe('ORD-20260907-2');
  });

  it('starts with one blank line, so the form is not an empty list', () => {
    const blank = emptyOrderDraft(bundle());
    expect(blank.lines).toHaveLength(1);
    expect(blank.lines[0]!.productName).toBe('');
  });

  it('seeds the line units from the bundle defaults', () => {
    const line = emptyOrderLine(bundle());
    expect(line.unit).toBe('EUR Pallets');
    expect(line.weightUnit).toBe('Kgs');
  });

  it('carries no shipment fields at all — an order has no stops, truck or price', () => {
    const keys = Object.keys(emptyOrderDraft(bundle()));
    for (const forbidden of ['stops', 'vehicleTypeIds', 'broadcast', 'pricing', 'responseWindow', 'bulk']) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe('orderIssues', () => {
  it('accepts a reference, a customer, a delivery date and one complete line', () => {
    expect(orderIssues(draft())).toEqual([]);
  });

  it('asks for the order ID when it is blank', () => {
    expect(orderIssues(draft({ orderReference: '   ' }))[0]).toMatchObject({ field: 'orderReference' });
  });

  it('asks for the customer when neither an id nor a name is set', () => {
    const issues = orderIssues(draft({ customerId: null, customerName: '' }));
    expect(issues.some((i) => i.field === 'customerName')).toBe(true);
  });

  it('accepts a typed customer name with no id — a one-off buyer is valid', () => {
    expect(orderIssues(draft({ customerId: null, customerName: 'A One-Off Buyer' }))).toEqual([]);
  });

  it('asks for the delivery date, which is the one date MYVAGON requires', () => {
    expect(orderIssues(draft({ deliveryDate: '' }))[0]).toMatchObject({ field: 'deliveryDate' });
  });

  /*
   * The rule that inverts the shipment wizard. Asserted as an absence, because
   * the failure mode is somebody adding the shipment's past-date check here.
   */
  it('ACCEPTS a delivery date in the past — an order is history, not a booking', () => {
    expect(orderIssues(draft({ deliveryDate: '2020-01-15', shipDate: '2020-01-10' }))).toEqual([]);
  });

  it('refuses a ship date after its delivery date, and blames the SHIP date', () => {
    const issues = orderIssues(draft({ shipDate: '2026-09-20', deliveryDate: '2026-09-14' }));
    expect(issues[0]).toMatchObject({ field: 'shipDate' });
    expect(issues[0]!.message).toMatch(/before they leave/i);
  });

  it('accepts a same-day ship and delivery date', () => {
    expect(orderIssues(draft({ shipDate: '2026-09-14', deliveryDate: '2026-09-14' }))).toEqual([]);
  });

  it('needs a quantity and a weight on every line, named down to the index', () => {
    const base = emptyOrderDraft(bundle());
    const issues = orderIssues(
      draft({ lines: [{ ...base.lines[0]!, productName: 'Peas', qty: null, weight: null }] }),
    );
    expect(issues.map((i) => i.field)).toEqual(['lines[0].qty', 'lines[0].weight']);
  });

  it('needs a product on every line even when it carries an id', () => {
    const base = emptyOrderDraft(bundle());
    const issues = orderIssues(
      draft({ lines: [{ ...base.lines[0]!, productId: '97', productName: '  ', qty: 1, weight: 1 }] }),
    );
    expect(issues[0]).toMatchObject({ field: 'lines[0].productName' });
  });

  it('names the second line when it is the second line that is short', () => {
    const base = emptyOrderDraft(bundle());
    const issues = orderIssues(
      draft({
        lines: [
          { ...base.lines[0]!, productName: 'Peas', qty: 2, weight: 40 },
          { ...base.lines[0]!, productName: 'Rice', qty: 2, weight: null },
        ],
      }),
    );
    expect(issues.map((i) => i.field)).toEqual(['lines[1].weight']);
  });

  it('asks for at least one line', () => {
    expect(orderIssues(draft({ lines: [] }))[0]).toMatchObject({ field: 'lines' });
  });

  it('refuses a negative order value and allows zero', () => {
    expect(orderIssues(draft({ orderValue: -5 }))[0]).toMatchObject({ field: 'orderValue' });
    expect(orderIssues(draft({ orderValue: 0 }))).toEqual([]);
  });
});

describe('referenceClashOf', () => {
  it('finds a reference the shipper has already used', () => {
    expect(referenceClashOf(draft({ orderReference: 'PO-4821' }), bundle())).toBe('PO-4821');
  });

  // MYVAGON refuses both spellings, so warning about only one is worse than not
  // warning at all — the shipper would think the ID was free.
  it('matches case-insensitively and ignores surrounding space', () => {
    expect(referenceClashOf(draft({ orderReference: '  po-4821 ' }), bundle())).toBe('PO-4821');
  });

  it('is silent for a free reference, and for a blank field', () => {
    expect(referenceClashOf(draft({ orderReference: 'ORD-NEW-1' }), bundle())).toBeNull();
    expect(referenceClashOf(draft({ orderReference: '' }), bundle())).toBeNull();
  });

  /*
   * A clash is deliberately NOT an `orderIssues` entry: the field is well-formed
   * and the fix is a different ID, not a correction to what was typed.
   */
  it('is not reported as a malformed field', () => {
    expect(orderIssues(draft({ orderReference: 'PO-4821' }))).toEqual([]);
  });
});

describe('setLineProduct', () => {
  it('carries the product id and name onto the line', () => {
    const line = setLineProduct(emptyOrderLine(bundle()), bundle().products[0]!);
    expect(line.productId).toBe('97');
    expect(line.productName).toBe('Frozen Peas 2kg');
  });

  // A product's packaging unit is free text ("Case", "Crate") and a line's unit
  // is a fixed list, so copying it across is how a case gets counted as a pallet.
  it('maps the product own packaging unit onto the line vocabulary', () => {
    const line = setLineProduct(emptyOrderLine(bundle()), bundle().products[0]!);
    expect(line.unit).toBe('Boxes');
    expect(ORDER_QTY_UNITS).toContain(line.unit);
  });

  it('maps the product weight unit too, and never leaves a unit outside the list', () => {
    const line = setLineProduct(emptyOrderLine(bundle()), bundle().products[0]!);
    expect(line.weightUnit).toBe('Kgs');
    expect(ORDER_WEIGHT_UNITS).toContain(line.weightUnit);
  });

  it('keeps the line defaults for a product that records none', () => {
    const line = setLineProduct(emptyOrderLine(bundle()), bundle().products[1]!);
    expect(line.unit).toBe('EUR Pallets');
    expect(line.weightUnit).toBe('Kgs');
  });

  /*
   * A per-unit figure sitting in a total-weight field is worse than a blank one,
   * so it is only computed once a quantity gives it a meaning.
   */
  it('computes the total weight only when a quantity is already set', () => {
    const blank = setLineProduct(emptyOrderLine(bundle()), bundle().products[0]!);
    expect(blank.weight).toBeNull();

    const withQty = setLineProduct({ ...emptyOrderLine(bundle()), qty: 4 }, bundle().products[0]!);
    expect(withQty.weight).toBe(50);
  });

  it('never overwrites a weight the shipper has already typed', () => {
    const line = setLineProduct({ ...emptyOrderLine(bundle()), qty: 4, weight: 99 }, bundle().products[0]!);
    expect(line.weight).toBe(99);
  });
});

describe('orderWarnings', () => {
  it('warns about a reference the shipper has already used', () => {
    const warnings = orderWarnings(draft({ orderReference: 'PO-4821' }), bundle());
    expect(warnings.some((w) => w.includes('PO-4821'))).toBe(true);
  });

  it('warns about a line whose product was typed rather than picked', () => {
    const base = emptyOrderDraft(bundle());
    const warnings = orderWarnings(
      draft({ lines: [{ ...base.lines[0]!, productId: null, productName: 'Something New', qty: 1, weight: 1 }] }),
      bundle(),
    );
    expect(warnings.some((w) => /not in your Product Master/i.test(w))).toBe(true);
  });

  // Both sites are optional on an order, so this is worded as reassurance rather
  // than as something to go and fix.
  it('says a missing ship-from or ship-to is fine on an order', () => {
    const warnings = orderWarnings(draft(), bundle());
    expect(warnings.some((w) => /fine on an order/i.test(w))).toBe(true);
  });

  it('says nothing about the sites once both are chosen', () => {
    const warnings = orderWarnings(draft({ originLocationId: '1841', destLocationId: '1842' }), bundle());
    expect(warnings.some((w) => /ship-from/i.test(w))).toBe(false);
  });
});

describe('serializeOrderDraft', () => {
  it('sends the three required fields as the gateway names them', () => {
    const body = serializeOrderDraft(draft());
    expect(body.orderReference).toBe('ORD-20260907-2');
    expect(body.customerName).toBe('Alphavita SA');
    expect(body.deliveryDate).toBe('2026-09-14');
  });

  // The gateway's draft schema marks these `nullish` precisely so a form store
  // does not have to strip its own blanks — and a client that had to would
  // eventually forget to.
  it('sends blanks as null rather than as empty strings', () => {
    const body = serializeOrderDraft(draft({ erpReference: '   ', notes: '', shipDate: null }));
    expect(body.erpReference).toBeNull();
    expect(body.notes).toBeNull();
    expect(body.shipDate).toBeNull();
  });

  it('trims the reference and the customer name', () => {
    const body = serializeOrderDraft(draft({ orderReference: ' ORD-9 ', customerName: ' Alphavita ' }));
    expect(body.orderReference).toBe('ORD-9');
    expect(body.customerName).toBe('Alphavita');
  });

  it('sends a line product id when there is one, and null when there is not', () => {
    const base = emptyOrderDraft(bundle());
    const body = serializeOrderDraft(
      draft({
        lines: [
          { ...base.lines[0]!, productId: '97', productName: 'Peas', qty: 2, weight: 40 },
          { ...base.lines[0]!, productId: null, productName: 'Typed', qty: 1, weight: 10 },
        ],
      }),
    );
    const lines = body.lines as { productId: string | null }[];
    expect(lines[0]!.productId).toBe('97');
    expect(lines[1]!.productId).toBeNull();
  });

  it('sends nothing a shipment would need — no stops, no channel, no price', () => {
    const body = serializeOrderDraft(draft());
    for (const forbidden of ['stops', 'broadcast', 'pricing', 'vehicleTypeIds']) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });
});

describe('the shared cargo vocabulary', () => {
  /*
   * The API stores an order line's unit as free text, so nothing on the wire
   * keeps these in step with a cargo line's fixed list. Asserted here and again
   * in the gateway's own guard suite, on both sides of the wire.
   */
  it('is spelled exactly as a shipment cargo line spells it', () => {
    expect([...ORDER_QTY_UNITS]).toEqual(['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags']);
    expect([...ORDER_WEIGHT_UNITS]).toEqual(['Tonnes', 'Kgs']);
  });
});
