import type { ApiAvailabilityPrefill } from '../../../api/types/availabilities';
import type { LocationItem } from '../../../context/AppContext';
import { haversineKm } from '../../../components/CreateShipmentWizard/itinerary/scheduleWarnings';
import {
  allItemsForType,
  type WizardVehicleType,
} from '../../../components/CreateShipmentWizard/vehicleTypes';
/** Max distance to treat an AddressBook location as the same place (150 m). */
export const SAT_LOCATION_MATCH_KM = 0.15;

export type SatVehiclePrefillSource = Pick<ApiAvailabilityPrefill, 'truck_type'> & {
  truck_type_id?: number | null;
};

/** Minimal stop shape for AddressBook binding (wizard Stop or ApiStop). */
export type LocatableStop = {
  locationId?: string;
  locationName?: string;
  locationCompany?: string;
  locationCity?: string;
  locationCountry?: string;
  noteCarrier?: string;
  contactName?: string;
  contactPhone?: string;
};

export function findNearestLocation(
  locations: LocationItem[],
  lat: number | null | undefined,
  lng: number | null | undefined,
  maxKm: number = SAT_LOCATION_MATCH_KM
): LocationItem | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (!locations.length) return null;

  let best: LocationItem | null = null;
  let bestKm = Infinity;

  for (const loc of locations) {
    if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
    const km = haversineKm({ lat, lng }, { lat: loc.lat, lng: loc.lng });
    if (km <= maxKm && km < bestKm) {
      best = loc;
      bestKm = km;
    }
  }

  return best;
}

/** Mirror Step1 applyLocationToStop field mapping onto a stop-like object. */
export function applyLocationItemToStop<T extends LocatableStop>(stop: T, loc: LocationItem): T {
  const next: T = {
    ...stop,
    locationId: String(loc.id),
    locationName: loc.name,
    locationCompany: loc.company || '',
    locationCity: loc.city || stop.locationCity || '',
    locationCountry: loc.region || stop.locationCountry || '',
  };
  if (loc.noteCarrier && !stop.noteCarrier) {
    next.noteCarrier = loc.noteCarrier;
  }
  if (loc.contacts?.[0]) {
    if (!stop.contactName) next.contactName = loc.contacts[0].name;
    if (!stop.contactPhone) next.contactPhone = loc.contacts[0].phone;
  }
  return next;
}

export function resolveStopLocationFromCoords<T extends LocatableStop>(
  stop: T,
  locations: LocationItem[],
  lat: number | null | undefined,
  lng: number | null | undefined
): T {
  if (stop.locationId) return stop;
  const match = findNearestLocation(locations, lat, lng);
  return match ? applyLocationItemToStop(stop, match) : stop;
}

export function buildVehicleSpecsFromPrefill(
  prefill: SatVehiclePrefillSource,
  vehicleTypes: WizardVehicleType[]
): Record<string, string[]> | null {
  if (!vehicleTypes.length) return null;

  let vt: WizardVehicleType | undefined;

  if (prefill.truck_type_id != null && Number.isFinite(Number(prefill.truck_type_id))) {
    const key = String(prefill.truck_type_id);
    vt = vehicleTypes.find((x) => x.formKey === key);
  }

  if (!vt && prefill.truck_type) {
    const name = prefill.truck_type.trim().toLowerCase();
    if (name) {
      vt = vehicleTypes.find(
        (x) => x.name.toLowerCase() === name || x.nameEl.toLowerCase() === name
      );
    }
  }

  if (!vt) return null;

  const items = allItemsForType(vt);
  // VehicleSelector needs length > 0 to treat a type as selected.
  if (items.length === 0) return null;

  return { [vt.formKey]: items };
}
