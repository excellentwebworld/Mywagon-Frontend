import type { ApiStop } from '../../../api/types/createShipment';
import {
  formatWeightDisplay,
  formatWeightKgTotal,
  normalizeQtyUnit,
  weightToKg,
} from '../../../constants/cargoUnits';
import type { CargoFlow, LoadBalance, TripTotals } from './types';

export const TRUCK_WEIGHT_CAP_KG = 28000;

export {
  formatWeightDisplay,
  normalizeQtyUnit,
  normalizeWeightUnit,
  weightToKg,
} from '../../../constants/cargoUnits';

export function formatWeightKg(kg: number): string {
  return formatWeightKgTotal(kg);
}

export function formatQtyWithUnit(qty: number, unit?: string): string {
  if (qty <= 0) return '—';
  const u = normalizeQtyUnit(unit);
  return u ? `${qty} ${u}` : String(qty);
}

export function summarizeStopLines(stop: ApiStop): { qty: number; weightKg: number; unit: string } {
  let qty = 0;
  let weightKg = 0;
  let unit = '';

  (stop.lines || []).forEach((ln) => {
    qty += parseFloat(String(ln.qty ?? '')) || 0;
    weightKg += weightToKg(ln.weight, ln.wtUnit);
    if (!unit && ln.unit) unit = normalizeQtyUnit(ln.unit) || ln.unit;
  });

  return { qty, weightKg, unit };
}

export function formatDurationMin(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}min`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function computeLoadBalance(stops: ApiStop[]): LoadBalance {
  let pkU = 0;
  let doU = 0;
  let pkW = 0;
  let doW = 0;
  const byP: LoadBalance['byP'] = {};
  const byUnit: Record<string, { pk: number; do: number }> = {};

  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      const q = parseFloat(String(ln.qty ?? '')) || 0;
      const wk = weightToKg(ln.weight, ln.wtUnit);
      const unitKey = normalizeQtyUnit(ln.unit) || '—';
      if (!byUnit[unitKey]) byUnit[unitKey] = { pk: 0, do: 0 };

      if (ln.action === 'pickup') {
        pkU += q;
        pkW += wk;
        byUnit[unitKey].pk += q;
      } else {
        doU += q;
        doW += wk;
        byUnit[unitKey].do += q;
      }
      const nm = ln.productName || '—';
      const prodKey = `${nm}||${unitKey}`;
      if (!byP[prodKey]) byP[prodKey] = { pk: 0, do: 0, unit: unitKey };
      if (ln.action === 'pickup') byP[prodKey].pk += q;
      else byP[prodKey].do += q;
    })
  );

  const mx = Math.max(pkW, doW, 1);
  // Qty is balanced only when every unit bucket matches pickup ↔ dropoff
  const unitKeys = Object.keys(byUnit);
  const hasQty = unitKeys.some((k) => byUnit[k].pk > 0 || byUnit[k].do > 0);
  const qtyBalanced =
    hasQty &&
    unitKeys.every((k) => {
      const { pk, do: d } = byUnit[k];
      if (pk === 0 && d === 0) return true;
      return pk > 0 && d > 0 && pk === d;
    });
  const weightBalanced = pkW > 0 && doW > 0 && Math.abs(pkW - doW) < 0.01;
  return {
    pkU,
    doU,
    pkW,
    doW,
    pkBar: (pkW / mx) * 50,
    doBar: (doW / mx) * 50,
    balanced: qtyBalanced && weightBalanced,
    byP,
    byUnit,
  };
}

export function qtyUnitsMatch(a?: string | null, b?: string | null): boolean {
  const na = normalizeQtyUnit(a);
  const nb = normalizeQtyUnit(b);
  if (!na && !nb) return true;
  return na === nb;
}

/**
 * Sum pickup qty for the same order + product across stops.
 * When `unit` is provided, only lines with that unit are included.
 */
export function getPickupAllocatedQty(
  stops: ApiStop[],
  orderId: string,
  productId: string,
  options?: { excludeLineId?: string; unit?: string }
): number {
  if (!orderId || !productId) return 0;
  const wantUnit = options?.unit != null ? normalizeQtyUnit(options.unit) : null;
  let sum = 0;
  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      if (ln.action !== 'pickup') return;
      if (String(ln.orderId || '') !== String(orderId)) return;
      if (String(ln.productId || '') !== String(productId)) return;
      if (options?.excludeLineId && String(ln.id) === String(options.excludeLineId)) return;
      if (wantUnit != null && !qtyUnitsMatch(ln.unit, wantUnit)) return;
      sum += parseFloat(String(ln.qty ?? '')) || 0;
    })
  );
  return sum;
}

export interface OrderPickupAllocation {
  orderId: string;
  productId: string;
  productName: string;
  orderRef: string;
  orderQty: number;
  orderUnit: string;
  pickupSum: number;
  pickupUnit: string;
  unitMismatch: boolean;
}

/** Build pickup allocations vs order line qty+unit for conflict checks. */
export function computeOrderPickupAllocations(
  stops: ApiStop[],
  orderDetailsById: Record<string, { orderReference?: string; lines?: Array<{
    id?: number;
    productSkuId?: number | null;
    productName?: string;
    quantity?: number | null;
    unit?: string;
  }> }>
): OrderPickupAllocation[] {
  type Acc = {
    orderId: string;
    productId: string;
    productName: string;
    orderRef: string;
    pickupSum: number;
    units: Set<string>;
  };
  const map = new Map<string, Acc>();

  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      if (ln.action !== 'pickup' || !ln.orderId || !ln.productId) return;
      const key = `${ln.orderId}||${ln.productId}`;
      let acc = map.get(key);
      if (!acc) {
        acc = {
          orderId: String(ln.orderId),
          productId: String(ln.productId),
          productName: ln.productName || '',
          orderRef: ln.orderRef || '',
          pickupSum: 0,
          units: new Set(),
        };
        map.set(key, acc);
      }
      acc.pickupSum += parseFloat(String(ln.qty ?? '')) || 0;
      if (ln.unit) acc.units.add(normalizeQtyUnit(ln.unit));
      if (ln.productName) acc.productName = ln.productName;
      if (ln.orderRef) acc.orderRef = ln.orderRef;
    })
  );

  const results: OrderPickupAllocation[] = [];
  map.forEach((acc) => {
    const order = orderDetailsById[acc.orderId];
    const orderLine = order?.lines?.find(
      (line) => String(line.productSkuId) === String(acc.productId)
    );
    if (!orderLine || orderLine.quantity == null) return;
    const orderQty = Number(orderLine.quantity) || 0;
    if (orderQty <= 0) return;
    const orderUnit = normalizeQtyUnit(orderLine.unit);
    const pickupUnits = [...acc.units];
    const pickupUnit = pickupUnits[0] || '';
    const unitMismatch =
      pickupUnits.length > 1 ||
      (pickupUnit !== '' && orderUnit !== '' && !qtyUnitsMatch(pickupUnit, orderUnit));

    results.push({
      orderId: acc.orderId,
      productId: acc.productId,
      productName: acc.productName || orderLine.productName || acc.productId,
      orderRef: acc.orderRef || order?.orderReference || acc.orderId,
      orderQty,
      orderUnit,
      pickupSum: acc.pickupSum,
      pickupUnit,
      unitMismatch,
    });
  });

  return results;
}

export function computeTripTotals(stops: ApiStop[]): TripTotals {
  let totalPallets = 0;
  let totalWeightKg = 0;
  let droppedWeightKg = 0;
  const uniqueCustomers = new Set<string>();
  const orderIds = new Set<string>();

  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      const q = parseFloat(String(ln.qty ?? '')) || 0;
      const wk = weightToKg(ln.weight, ln.wtUnit);
      if (ln.customerName) uniqueCustomers.add(ln.customerName);
      if (ln.orderId) orderIds.add(String(ln.orderId));
      if (ln.action === 'pickup') {
        totalPallets += q;
        totalWeightKg += wk;
      } else if (ln.action === 'dropoff') {
        droppedWeightKg += wk;
      }
    })
  );

  return { totalPallets, totalWeightKg, droppedWeightKg, uniqueCustomers, orderCount: orderIds.size };
}

export function computeRunningWeights(stops: ApiStop[]): number[] {
  let w = 0;
  return stops.map((s) => {
    (s.lines || []).forEach((ln) => {
      const wk = weightToKg(ln.weight, ln.wtUnit);
      w += ln.action === 'pickup' ? wk : -wk;
    });
    return w;
  });
}

export function buildCargoFlows(stops: ApiStop[]): CargoFlow[] {
  const flows: Record<string, CargoFlow> = {};

  stops.forEach((s, si) =>
    (s.lines || []).forEach((ln) => {
      if (!ln.productName && !ln.productId) return;
      const key = `${ln.customerName || ''}|${ln.productName || ln.productId || ''}`;
      if (!flows[key]) {
        flows[key] = {
          customer: ln.customerName || '',
          product: ln.productName || '',
          pickup: -1,
          dropoff: -1,
          qty: 0,
          weightKg: 0,
          unit: normalizeQtyUnit(ln.unit),
        };
      }
      if (ln.action === 'pickup') {
        flows[key].pickup = si;
        flows[key].qty = parseFloat(String(ln.qty ?? '')) || 0;
        flows[key].weightKg = weightToKg(ln.weight, ln.wtUnit);
        flows[key].unit = normalizeQtyUnit(ln.unit);
      } else if (ln.action === 'dropoff') {
        flows[key].dropoff = si;
      }
    })
  );

  return Object.values(flows);
}
