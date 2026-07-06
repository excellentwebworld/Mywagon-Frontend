import type { ApiStop } from '../../../api/types/createShipment';
import type { CargoFlow, LoadBalance, TripTotals } from './types';

export const TRUCK_WEIGHT_CAP_KG = 28000;

export function weightToKg(weight: string | number | undefined, wtUnit?: string): number {
  const w = parseFloat(String(weight ?? '')) || 0;
  const unit = (wtUnit || '').toLowerCase();
  if (unit === 't' || unit === 'ton' || unit === 'tons') return w * 1000;
  if (unit === 'lb' || unit === 'lbs') return w * 0.4536;
  return w;
}

export function formatWeightKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
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

  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      const q = parseFloat(String(ln.qty ?? '')) || 0;
      const wk = weightToKg(ln.weight, ln.wtUnit);
      if (ln.action === 'pickup') {
        pkU += q;
        pkW += wk;
      } else {
        doU += q;
        doW += wk;
      }
      const nm = ln.productName || '—';
      if (!byP[nm]) byP[nm] = { pk: 0, do: 0, unit: ln.unit };
      if (ln.action === 'pickup') byP[nm].pk += q;
      else byP[nm].do += q;
    })
  );

  const mx = Math.max(pkU, doU, 1);
  return {
    pkU,
    doU,
    pkW,
    doW,
    pkBar: (pkU / mx) * 50,
    doBar: (doU / mx) * 50,
    balanced: pkU > 0 && doU > 0 && pkU === doU,
    byP,
  };
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
          unit: ln.unit,
        };
      }
      if (ln.action === 'pickup') {
        flows[key].pickup = si;
        flows[key].qty = parseFloat(String(ln.qty ?? '')) || 0;
        flows[key].weightKg = weightToKg(ln.weight, ln.wtUnit);
        flows[key].unit = ln.unit;
      } else if (ln.action === 'dropoff') {
        flows[key].dropoff = si;
      }
    })
  );

  return Object.values(flows);
}
