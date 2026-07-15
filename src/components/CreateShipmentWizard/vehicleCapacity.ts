import type { ApiStop } from '../../api/types/createShipment';
import { weightToKg } from '../../constants/cargoUnits';
import type { WizardVehicleType } from './vehicleTypes';

export type VehicleCapacityClass = 'semi' | 'road-train' | 'rigid' | 'van';

export interface VehicleCapacity {
  /** Kept for capacity map / future pallet assessment. Not used in fit logic. */
  maxPallets: number;
  maxWeightKg: number;
}

/** Client-specified limits (PDS-928). Fit assessment currently uses weight only. */
export const VEHICLE_CAPACITY_BY_CLASS: Record<VehicleCapacityClass, VehicleCapacity> = {
  semi: { maxPallets: 33, maxWeightKg: 24000 },
  'road-train': { maxPallets: 33, maxWeightKg: 24000 },
  rigid: { maxPallets: 14, maxWeightKg: 12000 },
  van: { maxPallets: 6, maxWeightKg: 4000 },
};

export type VehicleFitStatus = 'fits' | 'too_small';

export interface VehicleFitAssessment {
  status: VehicleFitStatus;
  /** Utilization 0–100+ (may exceed 100 when too small). */
  utilPct: number;
  /** Bar fill width clamped to 0–100. */
  barPct: number;
  /** False when there is no weight to assess. */
  show: boolean;
  maxPallets: number;
  maxWeightKg: number;
}

/** Pickup weight total (kg) for weight-only fit assessment. */
export function computeFitCargoTotals(stops: ApiStop[]): {
  totalWeightKg: number;
} {
  let totalWeightKg = 0;

  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      if (ln.action !== 'pickup') return;
      totalWeightKg += weightToKg(ln.weight, ln.wtUnit);
    })
  );

  return { totalWeightKg };
}

/** Map API vehicle type name → capacity class (EN + EL heuristics). */
export function resolveVehicleCapacityClass(
  name: string,
  nameEl?: string
): VehicleCapacityClass {
  const normalized = `${name} ${nameEl || ''}`.toLowerCase();

  if (normalized.includes('semi') || normalized.includes('επικαθ')) return 'semi';
  if (
    (normalized.includes('trailer') || normalized.includes('συρρ')) &&
    !normalized.includes('semi')
  ) {
    return 'road-train';
  }
  if (
    normalized.includes('van') ||
    normalized.includes('βαν') ||
    normalized.includes('transporter') ||
    normalized.includes('μεταφορέ')
  ) {
    return 'van';
  }
  // Rigid / 7–12t truck and default fallback
  return 'rigid';
}

export function resolveVehicleCapacity(vt: Pick<WizardVehicleType, 'name' | 'nameEl'>): VehicleCapacity {
  return VEHICLE_CAPACITY_BY_CLASS[resolveVehicleCapacityClass(vt.name, vt.nameEl)];
}

export function assessVehicleFit(input: {
  totalWeightKg: number;
  maxWeightKg: number;
  maxPallets?: number;
}): VehicleFitAssessment {
  const { totalWeightKg, maxWeightKg, maxPallets = 0 } = input;
  const show = totalWeightKg > 0;

  const util = maxWeightKg > 0 && totalWeightKg > 0 ? totalWeightKg / maxWeightKg : 0;
  const utilPct = Math.round(util * 100);
  const tooSmall = util > 1;

  return {
    status: tooSmall ? 'too_small' : 'fits',
    utilPct,
    barPct: tooSmall ? 100 : Math.min(Math.max(utilPct, 0), 100),
    show,
    maxPallets,
    maxWeightKg,
  };
}

export function assessVehicleTypeFit(
  vt: Pick<WizardVehicleType, 'name' | 'nameEl'>,
  totalWeightKg: number
): VehicleFitAssessment {
  const capacity = resolveVehicleCapacity(vt);
  return assessVehicleFit({
    totalWeightKg,
    maxWeightKg: capacity.maxWeightKg,
    maxPallets: capacity.maxPallets,
  });
}
