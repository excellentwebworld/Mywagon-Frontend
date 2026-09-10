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
  /** Live shipment_location id when editing a published load */
  shipmentLocationId?: number;
  locationStatus?: string;
  driverId?: number | null;
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
  selectedCarriers?: string[] | number[];
  targetPrice?: string | number;
  trackingEmails?: Record<string, string[]>;
  driverNotes?: string;
  notesList?: Array<{
    id: string | number;
    text: string;
    visibility: 'internal' | 'carrier' | string;
    date?: string | null;
    author?: string;
  }>;
  documentsList?: Array<{ id: string | number; name: string; fileName?: string; fileSize?: number; fileType?: string; url?: string; description?: string }>;
  gpsRequired?: boolean;
  negotiable?: boolean;
  orderValue?: string;
  /** Present when wizard_state was seeded for published edit */
  editMode?: boolean;
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

export interface ApiEditShipment extends ApiDraftShipment {
  locked_stop_ids: number[];
  edit_blocked: boolean;
  edit_blocked_reason: string | null;
  is_being_edited: boolean;
  has_pending_update: boolean;
}

export interface ApplyEditShipmentResponse {
  id: number;
  auto_id: string;
  status: string;
  is_being_edited: boolean;
  has_updated_itinerary: boolean;
}

/** Flat itinerary row used by edit preview-diff (live vs wizard). */
export interface ApiComparableItineraryRow {
  shipment_location_id?: number | null;
  order_id?: string;
  product_id?: string;
  address_id?: string;
  qty?: string;
  weight?: string;
  date?: string;
  time?: string;
  date_to?: string;
  time_to?: string;
  type?: string;
}

export interface ApiItineraryDiffField {
  old?: string | number | null;
  new?: string | number | null;
}

export interface ApiEditPreviewDiff {
  has_changes: boolean;
  difference: Record<string, Record<string, ApiItineraryDiffField>>;
  old_itinerary: ApiComparableItineraryRow[];
  updated_itinerary: ApiComparableItineraryRow[];
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
  order_value?: number | string;
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
