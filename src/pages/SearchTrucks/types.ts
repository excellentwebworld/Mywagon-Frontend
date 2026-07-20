export type VisibilityFilter = 'all' | 'public' | 'private';

/** Laravel Search Available Trucks sort_filter values; '' = default (soonest availability). */
export type SortKey =
  | ''
  | 'truck_asc'
  | 'truck_desc'
  | 'availability_asc'
  | 'availability_desc'
  | 'earliest_posting_date'
  | 'latest_posting_date'
  | 'pickup_asc'
  | 'pickup_desc'
  | 'dropoff_asc'
  | 'dropoff_desc'
  | 'carrier_asc'
  | 'carrier_desc'
  | 'price_asc'
  | 'price_desc';

export type ProviderType = 'Carrier' | 'Freelancer';

export type TripType = 'Multi-stop OK' | 'Direct only';

export type QuickFilterKey = 'today' | 'soon8h' | 'has_bids' | 'load_match';

export type TripFilter = 'any' | 'multi_stop' | 'direct';

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
  /** Laravel-style trip preference filter (derived from stops checkboxes when applied) */
  tripType?: TripFilter;
  /** Filter modal — available-from date range on start_date_time */
  availableFromStart?: string;
  availableFromEnd?: string;
  /** Filter modal — stops checkboxes (Laravel default: multi on, direct off) */
  stopsMulti?: boolean;
  stopsDirect?: boolean;
  /** Filter modal — carrier/freelancer names from partner picker */
  providerNames?: string[];
  minPrice?: string;
  maxPrice?: string;
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
  /** City/short label for cards & compact UI */
  pickup: string;
  radius: number;
  dest: string;
  /** Full street address when available (detail panel / map) */
  pickupAddress?: string;
  destAddress?: string;
  truckType: string;
  specs: string;
  capacity: string;
  capVal: number;
  capUnit: string;
  trip: TripType;
  /** True when availability accepts multi-stop (from API trip_type) */
  multiStop: boolean;
  carrier: string;
  initials: string;
  rating: number;
  type: ProviderType;
  preferred: boolean;
  providerId?: number | null;
  /** partners.id when this provider is linked to the shipper */
  partnerId?: number | null;
  price: number | null;
  priceBlurred?: boolean;
  currency: string;
  posted: string;
  recurring: boolean;
  occurrences: string[];
  recurrenceLabel: string;
  bidSent?: boolean;
  /** On-time delivery % from provider history; null = unknown */
  onTimeDeliveryPct?: number | null;
  cancellationRate?: number | null;
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
