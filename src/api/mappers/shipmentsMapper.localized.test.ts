import { describe, expect, it } from 'vitest';
import { mapApiDetailToShipment } from './shipmentsMapper';

describe('mapApiDetailToShipment localized labels', () => {
  it('renders {en, el, label} as text on the detail model', () => {
    const shipment = mapApiDetailToShipment({
      id: 10452,
      auto_id: 'SID-157175',
      status: 'pending',
      origin: { en: 'Athens', el: 'Athina', label: 'Athens label' },
      dest: { en: 'Patras', el: 'Patra', label: 'Patras label' },
      truck_types: [{ en: 'Box', el: 'Kibotio', label: 'Box truck' }],
      stops: [
        {
          id: 1,
          type: 'pickup',
          location: { en: 'Warehouse', el: 'Apothiki', label: 'Warehouse label' },
          product_name: { en: 'Oil', el: 'Ladi', label: 'Oil label' },
          company_name: 'Acme',
        },
      ],
    } as never);
    expect(shipment.origin).toBe('Athens');
    expect(shipment.dest).toBe('Patras');
    expect(shipment.truckTypes).toEqual(['Box']);
    expect(shipment.stops?.[0]?.location).toBe('Warehouse');
    expect(typeof shipment.stops?.[0]?.location).toBe('string');
    const product = shipment.stops?.[0]?.customers?.[0]?.orders?.[0];
    const name = typeof product === 'string' ? product : product?.products;
    expect(name).toBe('Oil');
  });
});
