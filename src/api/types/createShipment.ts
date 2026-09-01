export interface ApiCargoLine {
  id?: string;
  productId?: string;
  productName?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderRef?: string;
  orderLineId?: string | number;
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
  /** Browser IANA timezone used when materializing stop datetimes to UTC */
  timezone?: string;
  /** Set when draft started from Search Available Trucks */
  availability_id?: number;
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
  notesList?: Array<{ id: string | number; text: string; visibility: 'internal' | 'carrier'; date: string }>;
  documentsList?: Array<{ id: string | number; name: string; fileName?: string; fileSize?: number; fileType?: string; url?: string; description?: string }>;
  gpsRequired?: boolean;
  negotiable?: boolean;
  orderValue?: string;
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
  availability_id?: number;
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

export interface SaveStepThreePayload {
  mode: 'partial' | 'complete';
  broadcast_type?: 'private' | 'public';
  selected_carriers?: number[];
  target_price?: number;
  negotiable?: boolean;
  tracking_emails?: Record<string, string[]>;
  driver_notes?: string;
  gps_required?: boolean;
  bulk_mode?: 'single';
  order_value?: number;
  vehicle_specs?: Record<string, string[]>;
  vehicle_selection_confirmed?: boolean;
}

export interface PublishShipmentResponse {
  id: number;
  auto_id: string;
  status: string;
  type: string;
  total: string;
  order_value?: string | null;
}

export interface AiSuggestedPriceResult {
  market_price: number;
  attractive_price: number;
  conservative_price: number;
  recommended_price: number;
  formatted?: {
    market_price?: string;
    attractive_price?: string;
    conservative_price?: string;
    recommended_price?: string;
  };
  currency?: string;
  summary?: Record<string, unknown>;
}

export interface PublicLoadQuotaResponse {
  status: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  message?: string;
  actions?: {
    upgrade_url?: string;
  };
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
