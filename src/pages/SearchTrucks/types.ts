export type VisibilityFilter = 'all' | 'public' | 'private';

export type SortKey =
  | 'best_match'
  | 'soonest_start'
  | 'lowest_price'
  | 'highest_rating'
  | 'freshest';

export type ProviderType = 'Carrier' | 'Freelancer';

export type TripType = 'Multi-stop OK' | 'Direct only';

export type QuickFilterKey = 'today' | 'soon8h' | 'has_bids' | 'load_match';

export interface MapPickupBounds {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}

export interface SearchCriteria {
  pickupCity: string;
  pickupDate: string;
  dropoffCity: string;
  dropoffDate: string;
  /** @deprecated Prefer truckTypeIds from API vehicle types */
  vehicleType: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupRadius?: number;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffRadius?: number;
  truckTypeIds: number[];
  /** VehicleSelector-shaped cargo category selection: type formKey → category item ids */
  vehicleSpecs: Record<string, string[]>;
  /** Active map viewport search; when set, overrides pickup center+radius */
  mapBounds?: MapPickupBounds | null;
}

export interface AvailableTruck {
  id: string;
  vis: 'public' | 'private';
  label: string;
  startDt: string;
  startTm: string;
  endDt: string;
  endTm: string;
  /** ISO start for server-aligned filtering / display */
  startAt?: string | null;
  pickup: string;
  radius: number;
  dest: string;
  truckType: string;
  specs: string;
  capacity: string;
  capVal: number;
  capUnit: string;
  trip: TripType;
  carrier: string;
  initials: string;
  rating: number;
  type: ProviderType;
  preferred: boolean;
  price: number | null;
  priceBlurred?: boolean;
  currency: string;
  posted: string;
  recurring: boolean;
  occurrences: string[];
  recurrenceLabel: string;
  bidSent?: boolean;
  onTimePickup?: number;
  cancellationRate?: number;
  avgResponseMin?: number;
  pickupLat: number;
  pickupLng: number;
  destLat?: number | null;
  destLng?: number | null;
  hasBids?: boolean;
  bidsCount?: number | null;
  bestBid?: number | null;
  loadMatchScore?: number;
}

export interface PendingShipment {
  id?: number;
  sid: string;
  lane: string;
  pickup: string;
  weight: string;
  stops: number;
  exactMatch?: boolean;
}

export type DrawerMode = 'pending' | 'new';

export interface BookingDraft {
  offerPrice: string;
  notes: string;
  tripPref: TripType;
  occurrence: string;
  acceptStartingPrice: boolean;
  newPickup: string;
  newPickupDt: string;
  newDelivery: string;
  newDeliveryDt: string;
  newWeight: string;
  newNotes: string;
  saveAsDraft: boolean;
}

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Ioannina: { lat: 39.665, lng: 20.854 },
  Thessaloniki: { lat: 40.64, lng: 22.944 },
  Athens: { lat: 37.984, lng: 23.728 },
  Patras: { lat: 38.246, lng: 21.735 },
  Larissa: { lat: 39.637, lng: 22.421 },
  Heraklion: { lat: 35.34, lng: 25.134 },
  Volos: { lat: 39.361, lng: 22.943 },
  Trikala: { lat: 39.556, lng: 21.768 },
};
