import type { ApiStop } from '../../api/types/createShipment';
import { normalizeQtyUnit, weightToKg } from '../../constants/cargoUnits';
import type { WizardVehicleType } from './vehicleTypes';

export type VehicleCapacityClass = 'semi' | 'road-train' | 'rigid' | 'van';

export interface VehicleCapacity {
  maxPallets: number;
  maxWeightKg: number;
}

/** Client-specified limits (PDS-928). */
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
  /** False when there is no cargo to assess. */
  show: boolean;
  maxPallets: number;
  maxWeightKg: number;
}

function isPalletUnit(unit?: string | null): boolean {
  const normalized = normalizeQtyUnit(unit).toLowerCase();
  return normalized.includes('pallet');
}

/**
 * Cargo inputs for fit assessment:
 * - pallets: sum of pickup qty only for pallet-like units
 * - weight: all pickup weight in kg
 */
export function computeFitCargoTotals(stops: ApiStop[]): {
  totalPallets: number;
  totalWeightKg: number;
} {
  let totalPallets = 0;
  let totalWeightKg = 0;

  stops.forEach((s) =>
    (s.lines || []).forEach((ln) => {
      if (ln.action !== 'pickup') return;
      const q = parseFloat(String(ln.qty ?? '')) || 0;
      totalWeightKg += weightToKg(ln.weight, ln.wtUnit);
      if (isPalletUnit(ln.unit)) {
        totalPallets += q;
      }
    })
  );

  return { totalPallets, totalWeightKg };
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
  totalPallets: number;
  totalWeightKg: number;
  maxPallets: number;
  maxWeightKg: number;
}): VehicleFitAssessment {
  const { totalPallets, totalWeightKg, maxPallets, maxWeightKg } = input;
  const show = totalPallets > 0 || totalWeightKg > 0;

  const pFit = maxPallets > 0 && totalPallets > 0 ? totalPallets / maxPallets : 0;
  const wFit = maxWeightKg > 0 && totalWeightKg > 0 ? totalWeightKg / maxWeightKg : 0;
  // When only weight (or only pallets) is present, assess on that axis alone.
  const util = Math.max(pFit, wFit);
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
  totalPallets: number,
  totalWeightKg: number
): VehicleFitAssessment {
  const capacity = resolveVehicleCapacity(vt);
  return assessVehicleFit({
    totalPallets,
    totalWeightKg,
    maxPallets: capacity.maxPallets,
    maxWeightKg: capacity.maxWeightKg,
  });
}
