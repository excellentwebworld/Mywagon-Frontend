import type { ApiStop } from '../../../api/types/createShipment';

export type WizardStop = ApiStop & { id: string; lines: CargoLine[] };
export type CargoLine = NonNullable<ApiStop['lines']>[number] & { id?: string };

export interface EnrichedStop extends WizardStop {
  resolvedName: string;
  resolvedCity: string;
  resolvedCompany: string;
  resolvedAddress: string;
  lat: number | null;
  lng: number | null;
  hasPickup: boolean;
  hasDropoff: boolean;
  customers: { name: string; orderId?: string; orderRef?: string }[];
}

export interface LoadBalance {
  pkU: number;
  doU: number;
  pkW: number;
  doW: number;
  pkBar: number;
  doBar: number;
  balanced: boolean;
  byP: Record<string, { pk: number; do: number; unit?: string }>;
}

export interface TripTotals {
  totalPallets: number;
  totalWeightKg: number;
  droppedWeightKg: number;
  uniqueCustomers: Set<string>;
  orderCount: number;
}

export interface CargoFlow {
  customer: string;
  product: string;
  pickup: number;
  dropoff: number;
  qty: number;
  weightKg: number;
  unit?: string;
}

export interface RouteLeg {
  from: number;
  to: number;
  distKm: number;
  durationMin: number;
  label: string;
}

export type DriveGapLevel = 'ok' | 'amber' | 'red';

export interface DriveGapWarning extends RouteLeg {
  level: DriveGapLevel;
  msg: string;
}

export interface MockWeather {
  icon: string;
  desc: string;
  tempC: number;
  wind: number;
  rain: number;
  alert: boolean;
}

export interface RouteSummary {
  totalDistKm: number;
  totalDriveMin: number;
}
