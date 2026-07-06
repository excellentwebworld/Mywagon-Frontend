export interface ApiCargoLine {
  id?: string;
  productId?: string;
  productName?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderRef?: string;
  action?: 'pickup' | 'dropoff';
  qty?: string | number;
  unit?: string;
  weight?: string | number;
  wtUnit?: string;
  mirrorOf?: string;
}

export interface ApiStop {
  id?: string;
  locationId?: string;
  locationName?: string;
  locationCompany?: string;
  locationCity?: string;
  locationCountry?: string;
  dateFrom?: string;
  timeFrom?: string;
  dateTo?: string;
  timeTo?: string;
  expanded?: boolean;
  lines?: ApiCargoLine[];
  noteCarrier?: string;
  noteInternal?: string;
  contactName?: string;
  contactPhone?: string;
  appointmentMode?: 'fixed' | 'self_scheduling';
  windowStart?: string;
  windowEnd?: string;
  allowedLoadingPoints?: string[];
}

export interface ApiWizardState {
  stops?: ApiStop[];
  custRef?: string;
  coOwners?: string[];
  loadId?: string;
  itineraryConfirmed?: boolean;
  itineraryConfirmSnapshot?: string;
  routeSummary?: {
    total_dist_km?: number;
    total_drive_min?: number;
  };
  vehicleSpecs?: Record<string, string[]>;
  vehicleSelectionConfirmed?: boolean;
  broadcastType?: 'private' | 'public';
  selectedCarriers?: string[];
  targetPrice?: string;
  trackingEmails?: Record<string, string[]>;
  driverNotes?: string;
  gpsRequired?: boolean;
}

export interface ApiDraftShipment {
  id: number;
  auto_id: string;
  wizard_step: number;
  customer_reference: string | null;
  wizard_state: ApiWizardState;
  status: string;
  updated_at?: string;
}

export interface SaveStepOnePayload {
  mode: 'partial' | 'complete';
  customer_reference?: string;
  co_owners?: string[];
  stops: ApiStop[];
  timezone?: string;
}

export type SaveStepOneMode = SaveStepOnePayload['mode'];

export interface SaveStepTwoPayload {
  mode: 'partial' | 'complete';
  itinerary_confirmed: boolean;
  route_summary?: {
    total_dist_km: number;
    total_drive_min: number;
  };
  vehicle_specs?: Record<string, string[]>;
  vehicle_selection_confirmed?: boolean;
  itinerary_confirm_snapshot?: string;
}

export interface ApiVehicleCategory {
  id: number;
  name_en: string;
  name_el: string;
}

export interface ApiVehicleFeature {
  id: number;
  name_en: string;
  name_el: string;
  categories: ApiVehicleCategory[];
}

export interface ApiVehicleType {
  id: number;
  name_en: string;
  name_el: string;
  image?: string | null;
  features: ApiVehicleFeature[];
}
