import { normalizeQtyUnit, normalizeWeightUnit } from '../../../constants/cargoUnits';
import type { LocationItem } from '../../../context/AppContext';
import type { ErpOrder } from '../../ErpOrders/types';
import {
  createNewCargoLine,
  createNewStop,
  type CargoLine,
  type Stop,
} from '../../../components/CreateShipmentWizard/types';

export const ERP_ORDERS_PREFILL_KEY = 'erp_orders_prefill';

export type ErpOrdersPrefillPayload = {
  orderIds: string[];
};

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

function locationKey(locationId: number | null | undefined, fallbackName: string): string {
  if (locationId != null) return `id:${locationId}`;
  const name = (fallbackName || '').trim().toLowerCase();
  return name ? `name:${name}` : 'empty';
}

function pickEarlierDate(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

type StopBucket = {
  locationId: string;
  locationName: string;
  locationCompany: string;
  locationCity: string;
  locationCountry: string;
  dateFrom: string;
  lines: CargoLine[];
};

function resolveLocationFields(
  locationId: number | null,
  fallbackName: string,
  locations: LocationItem[] | undefined
): Pick<
  StopBucket,
  'locationId' | 'locationName' | 'locationCompany' | 'locationCity' | 'locationCountry'
> {
  if (locationId != null) {
    const loc = locations?.find((l) => String(l.id) === String(locationId));
    if (loc) {
      return {
        locationId: String(loc.id),
        locationName: loc.name || fallbackName || '',
        locationCompany: loc.company || '',
        locationCity: loc.city || '',
        locationCountry: loc.region || '',
      };
    }
    return {
      locationId: String(locationId),
      locationName: fallbackName || '',
      locationCompany: '',
      locationCity: '',
      locationCountry: '',
    };
  }

  return {
    locationId: '',
    locationName: fallbackName || '',
    locationCompany: '',
    locationCity: '',
    locationCountry: '',
  };
}

function ensureBucket(
  map: Map<string, StopBucket>,
  key: string,
  locationId: number | null,
  fallbackName: string,
  date: string,
  locations: LocationItem[] | undefined
): StopBucket {
  const existing = map.get(key);
  if (existing) {
    existing.dateFrom = pickEarlierDate(existing.dateFrom, date);
    if (!existing.locationName && fallbackName) existing.locationName = fallbackName;
    return existing;
  }

  const fields = resolveLocationFields(locationId, fallbackName, locations);
  const bucket: StopBucket = {
    ...fields,
    dateFrom: date || '',
    lines: [],
  };
  map.set(key, bucket);
  return bucket;
}

function orderLineToCargo(
  order: ErpOrder,
  ln: ErpOrder['lines'][number],
  action: 'pickup' | 'dropoff',
  mirrorOf: string
): CargoLine {
  return {
    id: makeId('l'),
    productId: ln.productSkuId != null ? String(ln.productSkuId) : '',
    productName: ln.productName || '',
    customerId: order.companyEntityId != null ? String(order.companyEntityId) : '',
    customerName: order.customerName || '',
    orderId: order.id,
    orderRef: order.orderReference,
    orderLineId: ln.id != null ? String(ln.id) : '',
    action,
    qty: ln.quantity != null ? String(ln.quantity) : '',
    unit: normalizeQtyUnit(ln.unit) || 'EUR Pallets',
    weight: ln.weight != null ? String(ln.weight) : '',
    wtUnit: normalizeWeightUnit(ln.weightUnit),
    mirrorOf,
  };
}

function bucketToStop(bucket: StopBucket, expanded: boolean): Stop {
  const stop = createNewStop(expanded);
  stop.locationId = bucket.locationId;
  stop.locationName = bucket.locationName;
  stop.locationCompany = bucket.locationCompany;
  stop.locationCity = bucket.locationCity;
  stop.locationCountry = bucket.locationCountry;
  stop.dateFrom = bucket.dateFrom;
  stop.lines = bucket.lines.length ? bucket.lines : [createNewCargoLine()];
  return stop;
}

/**
 * Build wizard stops from ERP order details.
 * Unique origins become pickup stops; unique destinations become dropoff stops.
 * Same origin/dest across orders collapses onto shared stops (e.g. Athens→Ioannina).
 */
export function buildStopsFromErpOrders(
  orders: ErpOrder[],
  locations?: LocationItem[]
): Stop[] {
  if (!orders.length) {
    return [createNewStop(true), createNewStop(true)];
  }

  const originBuckets = new Map<string, StopBucket>();
  const destBuckets = new Map<string, StopBucket>();

  for (const order of orders) {
    const oKey = locationKey(order.originLocationId, order.shipFrom);
    const dKey = locationKey(order.destLocationId, order.shipTo);

    const origin = ensureBucket(
      originBuckets,
      oKey,
      order.originLocationId,
      order.shipFrom,
      order.shipDate,
      locations
    );
    const dest = ensureBucket(
      destBuckets,
      dKey,
      order.destLocationId,
      order.shipTo,
      order.deliveryDate,
      locations
    );

    const lines = order.lines?.length ? order.lines : [null];
    for (const ln of lines) {
      if (!ln) {
        const pickup = createNewCargoLine('pickup');
        pickup.orderId = order.id;
        pickup.orderRef = order.orderReference;
        pickup.customerId =
          order.companyEntityId != null ? String(order.companyEntityId) : '';
        pickup.customerName = order.customerName || '';
        const dropoff = {
          ...pickup,
          id: makeId('l'),
          action: 'dropoff' as const,
          mirrorOf: pickup.id,
        };
        origin.lines.push(pickup);
        dest.lines.push(dropoff);
        continue;
      }

      const pickup = orderLineToCargo(order, ln, 'pickup', '');
      const dropoff = orderLineToCargo(order, ln, 'dropoff', pickup.id);
      origin.lines.push(pickup);
      dest.lines.push(dropoff);
    }
  }

  const pickups = Array.from(originBuckets.values()).map((b, i) =>
    bucketToStop(b, i === 0)
  );
  const dropoffs = Array.from(destBuckets.values()).map((b, i) =>
    bucketToStop(b, i === 0 && pickups.length === 0)
  );

  if (!pickups.length) pickups.push(createNewStop(true));
  if (!dropoffs.length) dropoffs.push(createNewStop(true));

  return [...pickups, ...dropoffs];
}

export function isOrderEligibleForCreateLoad(order: Pick<
  ErpOrder,
  'status' | 'linkedLoadId' | 'linkedLoadSid'
>): boolean {
  return (
    order.status === 'unplanned' &&
    !order.linkedLoadId &&
    !order.linkedLoadSid
  );
}
