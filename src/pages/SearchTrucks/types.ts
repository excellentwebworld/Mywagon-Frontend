export type VisibilityTab = 'all' | 'public' | 'private';

export type KpiFilter = 'all' | 'private' | 'today' | 'soon' | 'price' | null;

export type SortKey =
  | 'best_match'
  | 'soonest_start'
  | 'lowest_price'
  | 'highest_rating'
  | 'freshest';

export type ProviderType = 'Carrier' | 'Freelancer';

export type TripType = 'Multi-stop OK' | 'Direct only';

export type FilterPillKey =
  | 'start'
  | 'pickup'
  | 'dest'
  | 'equipment'
  | 'trip'
  | 'rating';

export interface AvailableTruck {
  id: string;
  vis: 'public' | 'private';
  label: string;
  startDt: string;
  startTm: string;
  endDt: string;
  endTm: string;
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
  currency: string;
  posted: string;
  recurring: boolean;
  occurrences: string[];
  recurrenceLabel: string;
  bidSent?: boolean;
  onTimePickup?: number;
  cancellationRate?: number;
  avgResponseMin?: number;
}

export interface PendingShipment {
  sid: string;
  lane: string;
  pickup: string;
  weight: string;
  stops: number;
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
