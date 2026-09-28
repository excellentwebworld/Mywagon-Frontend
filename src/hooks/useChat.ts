/**
 * useChat — talks to the Vagon AI chat gateway's POST /chat SSE-over-fetch
 * endpoint. Request: { message?, selection?, conversationId } — `message` may
 * only be omitted when `selection` answers a card list; neither is a 400.
 * Response is a stream of
 * `event: …` frames separated by a blank line, each frame's `data:` line
 * holding JSON:
 *
 *   conversation  { conversationId }                     — always sent first
 *   status        { stage, label }                       — progress line, pre-localized
 *   token         { text }                               — append to the answer
 *   tool_call     { id?, tool, arguments, requiresConfirmation }
 *   tool_result   { tool, status, summary, data? }
 *   options       { id, kind, title, hint?, slot?, query, multiple?, options[] }
 *   records       { id, kind, title, query, truncated?, action?, cards[] }
 *   flow_context  { id, flow, bundle }                   — opens a guided flow (shipment cards, the add-product/add-address form, or the create-order form)
 *   usage         { promptTokens, completionTokens, totalTokens }
 *   done          { message, awaitingConfirmation?, finishing? } — authoritative final text
 *
 * Shipment actions arrive as tool_call/tool_result. Read actions (searching
 * shipments, loading one) execute on their own and only need a progress
 * affordance. A write action — creating or publishing a shipment — is NOT
 * executed by /chat: the stream ends with `requiresConfirmation: true`, and
 * nothing has happened until `confirmAction` is called.
 *
 * Creating a load takes two confirmations, not one. The first saves a DRAFT that
 * no carrier can see. If the shipper pressed *Create shipment now* rather than
 * *Save draft*, `done.finishing` comes back true and the page sends one more
 * turn; the assistant then collects the channel, the truck type, the carriers and
 * the price as card lists, and proposes `publish_shipment` — a second
 * confirmation, and the one that actually puts the load in front of carriers.
 */
import { useCallback, useRef, useState } from 'react';
import { getStoredToken } from '../api/client';
import { GatewayError, gatewayFetch } from '../api/chatGatewayUrl';
import { useTranslation } from './useTranslation';

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** A write action the assistant has proposed. Nothing runs until the shipper confirms. */
export interface PendingAction {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
}

/**
 * Payload of a successful create_shipment, delivered on the confirm stream's
 * `tool_result`. The shipment is a DRAFT — it is not published and no carrier
 * can see it until the shipper publishes it themselves from `review_url`.
 */
export interface DraftCreated {
  draft_id: number;
  auto_id: string;
  published: false;
  /** A PATH, not an absolute URL — route with react-router's navigate(). */
  review_url: string;
  stops_count: number;
  total_pickup_qty: number;
  total_pickup_weight: number;
  /**
   * True when the client's measured route reached the draft, so the itinerary is
   * confirmed and the load can be finished here rather than in the wizard.
   * False for a draft whose stops had no map position between them.
   */
  itinerary_confirmed: boolean;
  warnings?: string[];
  field_errors?: Record<string, string[]>;
}

/**
 * Payload of a successful publish_shipment. The load is LIVE from this moment —
 * carriers can see it and respond.
 *
 * Not a booking: no carrier has accepted it, none is assigned, and none may ever
 * respond. The copy around this must never say the load is covered or taken.
 */
export interface ShipmentPublished {
  shipment_id: number;
  auto_id: string;
  status: string;
  published: true;
  channel: 'private' | 'public';
  /** A PATH — route with navigate(), same as `review_url`. */
  shipment_url: string;
  target_price: number;
  partner_count: number;
}

/**
 * What the client adds when it confirms.
 *
 * `routeSummary` is the road distance this page measured (see `measureRoute.ts`);
 * MYVAGON refuses to publish a load without one and no server-side endpoint can
 * compute it. `intent: 'publish'` is the *Create shipment now* button rather than
 * *Save draft* — it publishes nothing by itself, it only tells the gateway the
 * shipper wants to carry on and settle the channel, truck, carriers and price.
 */
export interface ConfirmOptions {
  locale?: string;
  routeSummary?: { total_dist_km: number; total_drive_min?: number };
  intent?: 'draft' | 'publish';
}

/**
 * What a confirmation left behind.
 *
 * `finishing` means the draft was saved and the shipper asked to carry on to
 * publishing, so the caller should send one more turn — the assistant then asks
 * for the channel, the truck type, the carriers and the price. Nothing has been
 * published; that is a second confirmation of its own.
 */
export interface ConfirmOutcome {
  finishing: boolean;
  /**
   * The draft a confirmed `create_shipment` produced.
   *
   * Reported back rather than only set as state because the guided flow's
   * Publish needs the new `draft_id` in ordinary control flow: publishing is a
   * second call that cannot be made until the first has returned one, and
   * reading it off state immediately after `await` would read the value from
   * before the render. Same reasoning as `finishing` above.
   */
  draft: DraftCreated | null;
}

/**
 * One card in a selection list. Either a record the core API actually returned
 * during the turn (`kind: 'record'`) or the offer to create a new one
 * (`kind: 'action'`) — so a card can never name something the shipper does not
 * have. Every string arrives already written in the shipper's language.
 */
export interface SelectionOption {
  /**
   * "location:1841" | "product:97" | "truck_match:5512:8841" |
   * "channel:private" | "vehicle_type:3" | "partner:3312" | "price:market:780" |
   * "order:1042" | "tracking:1042" |
   * "new_location" | "new_product" | "own_price"
   */
  id: string;
  kind: 'record' | 'action';
  title: string;
  subtitle?: string;
  /** One or two short lines — address, city, "Case / 2 kg". */
  lines?: string[];
  /**
   * The heading this option belongs under, on a two-level list.
   *
   * Only the truck picker sends this today: a truck type ("Semi-trailer") and
   * each of its subtypes ("Reefer", "Curtainsider") are separate, tickable
   * options, and `group` is what says a subtype belongs under its type. Options
   * sharing a group arrive together and in order, so they can be rendered under
   * one heading without sorting. Already localized, and never sent back — it is
   * a label, not an id.
   */
  group?: string;
  badges?: { label: string; tone: 'neutral' | 'info' | 'warning' }[];
  /** Archived location / deactivated product: shown, but never pickable. */
  disabled?: boolean;
  /**
   * Seed values for the list's `capture` form, read off this record — a
   * product's own packaging and its weight per unit. Per-option because two
   * products in one list ship in different units.
   */
  captureDefaults?: {
    /** Already mapped into the `capture.units` vocabulary. */
    qty_unit?: string;
    weight_per_unit?: number;
    weight_unit?: string;
  };
}

/** A cargo line as filled in on the picker, sent back with the chosen product. */
export interface CargoCapture {
  qty: number;
  unit: string;
  weight: number;
  weight_unit: string;
}

/**
 * A short form the gateway attaches to a card list, answered in the same tap.
 *
 * Only the product list carries one today, and only because the tap genuinely
 * leaves a fixed pair of questions behind it: a product without a quantity and a
 * weight is not a cargo line. Every label here is already in the shipper's
 * language; `value` is MYVAGON's own enum and is never displayed.
 */
export interface SelectionCapture {
  kind: 'cargo';
  labels: {
    qty: string;
    unit: string;
    weight: string;
    weightUnit: string;
    submit: string;
    hint: string;
  };
  units: { value: string; label: string }[];
  weightUnits: { value: string; label: string }[];
}

/**
 * A disambiguation the gateway is offering as cards instead of a question.
 *
 * Sent only when the answer is genuinely open — several records matched, or none
 * did. An unambiguous lookup emits no `options` event at all, which is the point
 * of the design: a fully specified request runs to the confirmation card without
 * a single tap.
 */
export interface SelectionRequest {
  /** "sel_…" — sent back as `selection.requestId`. */
  id: string;
  /**
   * `truck_match` is the shipper's own pending loads, offered as bid candidates
   * for one available truck. Its option ids carry a pair —
   * `truck_match:<availabilityId>:<shipmentId>` — because a bid is about both,
   * and it sends no `slot`: a bid candidate fills no leg of a load.
   */
  kind:
    | 'location'
    | 'product'
    | 'truck_match'
    // The four decisions between a saved draft and a load that is on the market.
    | 'shipment_channel'
    | 'vehicle_type'
    | 'partner'
    | 'price_option'
    // The shipper's own ERP orders, and who gets told the load is moving.
    | 'erp_order'
    | 'tracking_recipient';
  /** Short heading, e.g. "Pick the pickup site". Pre-localized — render as-is. */
  title: string;
  hint?: string;
  slot?:
    | 'pickup'
    | 'delivery'
    | 'cargo'
    | 'channel'
    | 'vehicle'
    | 'partner'
    | 'price'
    | 'order'
    | 'tracking';
  /** What was searched for; null when the turn had nothing to search with. */
  query: string | null;
  /**
   * Several options may be chosen at once — render checkboxes and a confirm
   * button rather than tap-to-answer, and send every chosen id in one call.
   *
   * Set for truck types and carriers, which are genuinely multi-valued: a load
   * can accept two trailer types and go to five hauliers, and answering that one
   * card per turn would be the interrogation the picker exists to remove.
   */
  multiple?: boolean;
  /** Details to collect with the choice, submitted together. Absent on every list but products. */
  capture?: SelectionCapture;
  options: SelectionOption[];
}

/** Semantic tone — the gateway says what a value *means*, the card picks the colour. */
export type ResultTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** One labelled detail row. Both sides arrive already localized. */
export interface ResultField {
  label: string;
  value: string;
}

/** A stop on a shipment whose full itinerary was fetched. */
export interface ResultStop {
  role: 'pickup' | 'delivery';
  label: string;
  place: string | null;
  when: string | null;
  cargo: string | null;
  /**
   * How far the stop has actually got and whether its POD landed — e.g.
   * "Completed - POD uploaded". Already localized; null when nothing has been
   * recorded against the stop yet.
   */
  state: string | null;
}

/**
 * Where a card — or a whole list — sends the shipper.
 *
 * `href` is a PATH, resolved server-side against the real router. Route it with
 * navigate(); never treat it as an external URL.
 */
export interface ResultAction {
  href: string;
  label: string;
}

/** One record the gateway found, projected for display. */
export interface ResultCard {
  id: string;
  title: string;
  subtitle?: string;
  /** A shipment's route, read before the detail rows. */
  headline?: string;
  /**
   * Lifecycle status. `code` is the wire value — prefer the app's own label for
   * it (the same one the shipments list shows) and fall back to `label`, which is
   * only there for a status this build has no key for.
   */
  status?: { code: string; label: string; tone: ResultTone };
  fields: ResultField[];
  badges?: { label: string; tone: ResultTone }[];
  stops?: ResultStop[];
  /** Set only for kinds with a page of their own — shipments, and available trucks. */
  action?: ResultAction;
  /**
   * A button that continues the conversation instead of leaving it.
   *
   * `action` is an anchor and only an anchor, so a card's one possible next move
   * was to navigate away. That is right for "open this shipment" and wrong for a
   * card whose useful next step is another question — an available truck can
   * either seed a new load (a page) or be offered one the shipper already has (a
   * lookup). Tapping it sends `prompt` as the shipper's own next message; it
   * carries no ids and no privileges, so it is worth exactly as much as typing
   * the same sentence.
   */
  followUp?: { label: string; prompt: string };
  /** Archived location / deactivated product: shown, but visibly not usable. */
  muted?: boolean;
}

/**
 * The records a lookup found — the *answer* to a question, not a question.
 *
 * The counterpart to SelectionRequest, and deliberately not the same thing:
 * nothing here is tappable, nothing is pending, and nothing is sent back on the
 * next turn. The only action is to go and open the record. The gateway withholds
 * it whenever a picker or a Confirm button is live, so it never competes with a
 * decision the shipper owes.
 */
export interface ResultCardSet {
  /** "res_…" — used to key the card in the transcript, never sent back. */
  id: string;
  /**
   * `analytics` is the odd one out and is rendered differently: it is not a list
   * of records to open but the dashboard's counters, grouped into three cards of
   * metric tiles. Every other kind is N things with a route.
   */
  kind: 'shipment' | 'location' | 'product' | 'truck' | 'partner' | 'analytics';
  /** Heading, e.g. "3 shipments". Pre-localized — render as-is. */
  title: string;
  query: string | null;
  truncated?: { shown: number; total: number; note: string };
  /**
   * The route shared by every card in the list. Set for locations and products,
   * which have one master page each; unset for shipments, whose route is on the
   * card. Never both.
   */
  action?: ResultAction;
  cards: ResultCard[];
}

/* ------------------------------------------------------------------ *
 * The guided create-shipment flow
 * ------------------------------------------------------------------ */

export interface FlowLocation {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  /** Which legs this site can serve. A delivery-only site is not offerable on a pickup. */
  role: 'pickup' | 'delivery' | 'both' | null;
  /**
   * The site's coordinates, or null if it was never geocoded.
   *
   * The browser is the only thing that can measure a road distance, and MYVAGON
   * refuses to publish a load without one — so these are what stand between a
   * finished itinerary and a load that can actually go out.
   */
  lat: number | null;
  lng: number | null;
}

export interface FlowProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  type: string | null;
  /** Read off the product, so the line-item row opens filled in rather than blank. */
  defaults?: { unit?: string; weightPerUnit?: number; weightUnit?: string };
}

export interface FlowPartner {
  id: string;
  name: string;
  /**
   * MYVAGON's own `MVC…` code, when the partner row carries one.
   *
   * Shown beside the name on the Audience card for the same reason the Partners
   * page shows it: two carriers can share a trading name and this is the only
   * thing that tells them apart. It is also what the gateway matches when the
   * shipper names a carrier in words rather than tapping one.
   */
  uniqueId?: string | null;
  /** 'carrier_company' | 'freelancer_driver' — the two facets that can carry a load. */
  type: string | null;
  rating: number | null;
  /** Shipper preferred / favorite flag — ranking signal (MS3-348). */
  preferred?: boolean;
  /** Completed loads with this shipper — lane-history ranking signal (MS3-348). */
  trips?: number;
  vehicleTypes: string[];
  /** An agreed rate on this route settles the price and outranks any suggestion. */
  contractLanes: unknown[];
}

export interface FlowVehicleType {
  id: string;
  label: string;
  subtypes: string[];
  categoryIds: number[];
  /** Same subtypes with ids — two-level trailer picker (MS3-347). */
  subtypeOptions?: { id: string; label: string }[];
}

export interface FlowDriver {
  id: string;
  name: string;
  vehicle: string | null;
  status: string | null;
}

export interface FlowDefaults {
  responseWindow: string;
  settlement: string;
  /** The shipper's last answer — seed the tracking toggle from this, not a constant. */
  requireTracking: boolean;
  negotiable: boolean;
  currency: string;
  bulkMode: string;
}

/**
 * The acceptance criteria, shipped once with the bundle.
 *
 * Deliberately loose here: the gateway owns this shape, the cards read a handful
 * of fields off it, and the server re-checks every rule at publish time anyway.
 * Typing it exactly would mean maintaining a second copy of a contract that is
 * already authoritative on the other side.
 */
export type FlowRules = Record<string, unknown>;

/* -------------------------------------------------------------------------- *
 * The load the gateway assembled
 * -------------------------------------------------------------------------- */

/**
 * One cargo line on the assembled load.
 *
 * `productId` can be blank and `qty` and `weight` can be zero, and that is the
 * point: an order line whose product was never matched to the Product Master has
 * no id, and an imported line can arrive with no quantity at all. The gateway
 * reports each as a gap rather than inventing a plausible value nobody chose, so
 * the card asks about exactly those and nothing else.
 *
 * `productName` and `sourceUnit` are DISPLAY ONLY - what the ERP called the
 * product, and what it called the units before they were mapped into the draft's
 * two. They are read beside the row and never posted back.
 */
export interface FlowDraftLine {
  productId: string;
  productName: string | null;
  action: 'pick' | 'drop';
  qty: number;
  unit: 'EUR_PALLET' | 'UNIT';
  weight: number;
  wUnit: 'KG' | 'T';
  sourceUnit: string | null;
  orderId: string | null;
  orderLineId: string | null;
  customerId: string | null;
}

/** One stop, with the cargo handled AT that stop nested inside it. */
export interface FlowDraftStop {
  /** Blank when the order recorded its site as free text only. A gap. */
  locationId: string;
  /** The order's own text, or the saved site's name. What the gap picker searches with. */
  locationName: string | null;
  /** `YYYY-MM-DDTHH:mm`, or blank when the order carried no date. A gap. */
  from: string;
  to: string | null;
  lines: FlowDraftLine[];
}

/**
 * The load, assembled server-side and ready to read.
 *
 * This is the whole redesign in one field. The bundle used to carry lists and
 * the shipper built a draft out of them across eleven cards; it carries the
 * finished draft now, and the card shows it. Everything in it was derived from
 * the shipper's own order, their own records and their own words - see
 * `shipmentFlow/autoDraft.ts` on the gateway for what came from where.
 */
export interface FlowDraftSeed {
  customerReference: string | null;
  stops: FlowDraftStop[];
  vehicleTypeIds: string[];
  vehicleCategoryIds: string[];
  broadcast: { channels: string[]; carrierPartnerIds: string[]; driverId: string | null };
  pricing: {
    negotiable: boolean;
    startingPrice: number | null;
    negotiableFloor: number | null;
    currency: string;
  };
  requireTracking: boolean;
  responseWindow: string;
  settlement: string;
  bulk: { mode: string };
  trackingOrderIds: string[];
}

/**
 * One thing the assembly could not work out.
 *
 * `blocks_save` is the whole reason this carries a severity rather than being a
 * flat list: an order whose site is free text leaves a load that cannot be saved
 * at all, while a missing price leaves one that saves perfectly and simply
 * cannot be sent yet. Greying out Save for the second would lose the work the
 * button exists to keep.
 */
export interface FlowGap {
  /** A draft field path - `stops[0].locationId`, `pricing.startingPrice`. */
  field: string;
  severity: 'blocks_save' | 'blocks_send';
  /** One short sentence, already written for the shipper. */
  question: string;
  /** Free text to open the picker pre-searched with: the order's own words. */
  hint?: string;
}

/** Why the card shows the truck and the carrier it does. */
export interface FlowSuggestions {
  vehicle: {
    vehicleTypeId: string;
    label: string;
    capacityClass: string;
    capacity: { maxPallets: number; maxWeightKg: number };
    /** The higher of the weight and pallet utilisations - the constraint that binds. */
    utilizationPct: number;
    fit: 'FITS' | 'TIGHT' | 'OVERSIZED' | 'TOO_SMALL';
    /** One sentence naming the figure the choice was made on. Shown beside the row. */
    rationale: string;
  } | null;
  partner: {
    partnerId: string;
    name: string;
    /** Names the evidence - an agreed rate, a preferred flag, loads already given. */
    reason: string;
    /** True when the shipper named them; false when the flow suggested them. */
    named: boolean;
  } | null;
  /** The next best carriers, for the "or choose another" row. */
  partnerAlternatives: { partnerId: string; name: string; reason: string }[];
}

/**
 * An order this load was built from.
 *
 * `trackingEmail` is the address MYVAGON holds for the customer, shown for the
 * same reason the web wizard's step 3 shows it: the shipper is deciding whether
 * to send their itinerary there and has to see which address. It reaches this
 * screen only - the gateway keeps it out of the model's digest entirely.
 */
export interface FlowOrder {
  orderId: string;
  reference: string;
  customerName: string;
  customerId: string | null;
  deliveryDate: string;
  trackingEmail: string | null;
}

export interface FlowBundle {
  /**
   * The assembled load. The review card renders THIS and posts it back to
   * `POST /chat/shipment-draft` when the shipper saves it.
   */
  draft: FlowDraftSeed;
  /** Everything the assembly could not work out, in the order the card reads them. */
  gaps: FlowGap[];
  /** Why the truck and the carrier on the card are the ones they are. */
  suggestions: FlowSuggestions;
  /** The orders this load was built from, when it was built from any. */
  orders: FlowOrder[];
  /**
   * The lists a gap picker is filled from.
   *
   * Still the full page, because a gap has to be closeable without a round trip:
   * a site the order recorded as text is fixed by picking from the Address Book,
   * and that picker has to open instantly. The gateway guarantees every id the
   * draft points at is in here, even one outside the capped page, so a row never
   * renders blank where the shipper's own warehouse should be.
   */
  locations: FlowLocation[];
  products: FlowProduct[];
  partners: FlowPartner[];
  vehicleTypes: FlowVehicleType[];
  defaults: FlowDefaults;
  rules: FlowRules;
  /** Truncation, unit relabelling and unavailability notes, in the shipper's language. */
  notes: string[];
  /** Set when a list was capped - offer a search rather than implying it is complete. */
  truncated: { locations?: number; products?: number; partners?: number };
}

/* -------------------------------------------------------------------------- *
 * The add-product flow's bundle
 * -------------------------------------------------------------------------- */

export interface ProductFlowType {
  id: string;
  name: string;
}

export interface ProductFlowCategory {
  id: string;
  name: string;
  /** A category with no types CANNOT be chosen — a product needs a type to be filed. */
  types: ProductFlowType[];
}

/**
 * A product the shipper already has.
 *
 * Carried for the duplicate check only — NOT a picker. Two products cannot share
 * a name under the same type, and catching that in the name field turns a failed
 * write into a corrected keystroke.
 */
export interface ProductFlowProduct {
  id: string;
  name: string;
  sku: string | null;
  /** Null for an unmapped SKU, whose type is missing or inconsistent. */
  typeId: string | null;
  /** A deactivated product still owns its name, so it still collides — with a different fix. */
  active: boolean;
}

export interface ProductFlowDefaults {
  /** The unit the weight input opens on. */
  weightUnit: string;
}

export interface ProductFlowBundle {
  categories: ProductFlowCategory[];
  products: ProductFlowProduct[];
  defaults: ProductFlowDefaults;
  rules: FlowRules;
  notes: string[];
  /** Set when the duplicate check saw only a first page — warn on a hit, stay silent on a miss. */
  truncated: { products?: number };
}

/* -------------------------------------------------------------------------- *
 * The add-address flow's bundle
 * -------------------------------------------------------------------------- */

/**
 * A company already in the shipper's Address Book.
 *
 * `vat` null is not the same as the company being absent: a company they have
 * saved an address for whose VAT never got recorded still needs one typed, so the
 * form has to tell "known, VAT ready" from "known, VAT missing".
 */
export interface LocationFlowCompany {
  name: string;
  vat: string | null;
}

/** A site the shipper already has. Carried for the duplicate check only. */
export interface LocationFlowSite {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
}

export interface LocationFlowDefaults {
  siteType: string;
  dockType: string;
  maxTruckLength: string;
  maxWeight: string;
  loadTimeMinutes: number;
}

export interface LocationFlowBundle {
  companies: LocationFlowCompany[];
  locations: LocationFlowSite[];
  defaults: LocationFlowDefaults;
  rules: FlowRules;
  notes: string[];
  truncated: { companies?: number; locations?: number };
}

/* -------------------------------------------------------------------------- *
 * The create-order flow's bundle
 * -------------------------------------------------------------------------- */

/**
 * A customer the order can be filed against.
 *
 * `id` is a `company_entity_id` — not a partner id, even for a customer who is
 * also a partner. Picking one settles the NAME as well as the id: sending an id
 * with somebody else's name in the field is the one way this form can file an
 * order against the wrong company and still look right.
 *
 * `email` is the address a tracking link would go to once a load is built from
 * this order. Shown so the shipper knows whether that will be possible, and
 * never editable here — it is their own customer record.
 */
export interface OrderFlowCustomer {
  id: string;
  name: string;
  vat: string | null;
  email: string | null;
  isPartner: boolean;
}

/** An Address Book site the order can ship from or to. Both are OPTIONAL on an order. */
export interface OrderFlowLocation {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
  role: 'pickup' | 'delivery' | 'both' | null;
}

/**
 * A product an order line can name.
 *
 * `id` is what makes the line more than text: it becomes the cargo `product_id`
 * of any load built from this order. A line may still be filed with a typed name
 * and no id, for a product the shipper does not have yet.
 */
export interface OrderFlowProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  defaults?: { unit?: string; weightPerUnit?: number; weightUnit?: string };
}

export interface OrderFlowDefaults {
  /** A reference that misses every one the bundle could see. A suggestion, not a value. */
  orderReference: string;
  qtyUnit: string;
  weightUnit: string;
  highPriority: boolean;
}

export interface OrderFlowBundle {
  customers: OrderFlowCustomer[];
  locations: OrderFlowLocation[];
  products: OrderFlowProduct[];
  /**
   * Carried for the duplicate check on the order-ID field only — never a picker.
   *
   * MYVAGON refuses a reference the shipper has already used, and it refuses it
   * after they have filled in a customer, two dates and a line per product. This
   * is what turns that refusal into a warning under the field they are typing in.
   */
  existingReferences: string[];
  defaults: OrderFlowDefaults;
  rules: FlowRules;
  notes: string[];
  truncated: { customers?: number; locations?: number; products?: number; references?: number };
}

/**
 * The `flow_context` event: everything a guided flow renders from, delivered once.
 *
 * This is the whole reason the flows are cheap. The bundle goes to the screen and
 * never to the model, and the cards run off it locally — so between step 1 and
 * the preview there is no /chat call at all. Calling the gateway between cards
 * rebuilds the conversational flow at the same cost and defeats the point.
 *
 * A DISCRIMINATED UNION, and it has to stay one. `flow` decides what shape
 * `bundle` is, so every consumer must narrow on it before touching a field: a
 * product bundle has no `locations`, and handing one to the shipment wizard is a
 * crash rather than a blank card. Anything that cannot narrow should ignore the
 * event — the reply text still tells the shipper what happened.
 */
export type FlowContextEvent =
  | { id: string; flow: 'create_shipment'; bundle: FlowBundle }
  | { id: string; flow: 'create_product'; bundle: ProductFlowBundle }
  | { id: string; flow: 'create_location'; bundle: LocationFlowBundle }
  /**
   * An ORDER in the Orders Master, not a load. No stops, no truck type, no
   * channel and no price — see `CreateOrderForm`.
   */
  | { id: string; flow: 'create_order'; bundle: OrderFlowBundle };

/** The flows this build can actually render. Anything else is ignored on arrival. */
const RENDERABLE_FLOWS = ['create_shipment', 'create_product', 'create_location', 'create_order'] as const;

function asFlowContext(data: unknown): FlowContextEvent | null {
  const candidate = data as Partial<FlowContextEvent> | null;
  if (!candidate || typeof candidate !== 'object') return null;
  if (!(RENDERABLE_FLOWS as readonly string[]).includes(candidate.flow as string)) return null;
  if (!candidate.bundle || typeof candidate.bundle !== 'object') return null;
  return candidate as FlowContextEvent;
}

interface SendMessageOptions {
  conversationId?: string;
  /** MS3-333: batch draft runs use agent run_kind=batch. */
  run_kind?: 'one_shot' | 'batch';
  /** Shipper's selected UI language ('en' | 'el') — the gateway always replies in this language. */
  locale?: string;
  forceTool?: { name: string; arguments?: Record<string, unknown> };
}

/**
 * Outcome of the gateway's `/me` probe. The gateway is a separate service, so
 * a valid Laravel session does not by itself guarantee the gateway accepts the
 * token — and 'unauthorized' (token rejected, session over) must stay distinct
 * from 'unavailable' (gateway's auth backend down, token probably fine).
 */
/** MS3-349 — background batch draft job ack from sticky multi Create drafts. */
export type BatchJobStarted = {
  job_id: string;
  async?: boolean;
  status?: string;
  requested?: number;
  drafts_path?: string;
};

export type GatewayAuthStatus = 'ready' | 'unauthorized' | 'unavailable';

/**
 * Probes GET /me so the chat screen can fail up front rather than mid-stream.
 * 200 answers `{ userId }`; anything else maps to a status the caller acts on.
 */
export async function checkGatewayAuth(locale?: string): Promise<GatewayAuthStatus> {
  try {
    await gatewayFetch('/me', { token: getStoredToken(), locale });
    return 'ready';
  } catch (err) {
    // Only an explicit 401 ends the session. A 503 — or a network/CORS failure,
    // which arrives as a non-GatewayError — leaves the token untouched.
    if (err instanceof GatewayError && err.isUnauthorized) return 'unauthorized';
    return 'unavailable';
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type SseHandler = (event: string, data: any) => void;

/**
 * Reads an SSE-over-fetch body and dispatches each complete frame.
 *
 * Shared by /chat and the confirm endpoint — both use identical framing, so the
 * confirmation round trip reuses this rather than duplicating the parser.
 */
async function readFrames(
  response: Response,
  onEvent: SseHandler,
  signal?: AbortSignal,
  emptyBodyMessage = 'The gateway returned an empty response.',
): Promise<void> {
  if (!response.body) throw new Error(emptyBodyMessage);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) break;
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? ''; // last piece may be incomplete

    for (const frame of frames) {
      const lines = frame.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event:'));
      const dataLine = lines.find((l) => l.startsWith('data:'));
      if (!eventLine || !dataLine) continue;
      onEvent(eventLine.slice('event:'.length).trim(), JSON.parse(dataLine.slice('data:'.length).trim()));
    }
  }
}

export function useChat() {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  // The gateway always sends `conversation` first — for a brand-new chat
  // (no conversationId passed in) it carries the server-generated id that
  // was actually persisted, which callers must adopt for their next message;
  // otherwise every message would keep referencing an id the server never
  // wrote a row for, and the gateway would silently start a fresh
  // conversation every single turn (see chat.ts's unrecognized-id fallback).
  const [conversationId, setConversationId] = useState<string | null>(null);
  /** Set when the turn paused awaiting confirmation. Nothing has executed yet. */
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  /**
   * A disambiguation the gateway is offering as cards. An offer, never a gate —
   * the shipper can ignore it and type instead, so the composer stays live.
   */
  const [selection, setSelection] = useState<SelectionRequest | null>(null);
  /**
   * The records a lookup found. An answer, not a question - nothing is pending
   * on it and nothing is sent back, so unlike a picker it is never "spent".
   */
  const [records, setRecords] = useState<ResultCardSet | null>(null);
  /** Name of a read tool currently running, for a progress affordance. */
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  /**
   * The gateway's own progress line for the turn in flight. Already written in
   * the shipper's language, and re-sent every couple of seconds while a stage
   * runs long — so it covers the stretches no tool name describes (embedding
   * the question, verifying a proposal, writing the reply).
   */
  const [activityLabel, setActivityLabel] = useState<string | null>(null);
  /** MS3-349: background homogeneous batch draft job (poll for progress). */
  const [batchJob, setBatchJob] = useState<BatchJobStarted | null>(null);
  /**
   * The gateway's own account of an action that failed — a validation refusal,
   * a permission, a plan that does not cover the feature (which arrives here as
   * an upgrade prompt). Localized and meant to be shown as-is, so it is passed
   * through verbatim like `activityLabel`.
   */
  const [actionError, setActionError] = useState<string | null>(null);
  /**
   * The proposed action is no longer confirmable: the gateway answered 404
   * because it restarted, tools were switched off, or the card outlived the
   * session that received it. Nothing ran and nothing can — the shipper has to
   * ask for it again.
   */
  const [actionExpired, setActionExpired] = useState(false);
  /** Set once a confirmed create_shipment has produced a draft. */
  const [draft, setDraft] = useState<DraftCreated | null>(null);
  /** Set once a confirmed publish_shipment has put the load on the market. */
  const [published, setPublished] = useState<ShipmentPublished | null>(null);

  /**
   * The guided create-shipment bundle, when a turn opened the flow.
   *
   * Unlike a picker or a confirmation card this competes with nothing: it asks
   * no question and answers none, it is material the cards run off. So it is
   * never suppressed and never retires anything.
   */
  const [flow, setFlow] = useState<FlowContextEvent | null>(null);
  /**
   * Whether the flow above arrived on THIS turn.
   *
   * `flow` is deliberately never cleared between turns (see `sendMessage`), and
   * on its own that is right - the open shipment card must survive a text-only
   * reply. What it is not is a licence to stamp the surviving bundle onto the
   * next answer, which is exactly what the page did with it: every settled
   * message took whatever `flow` still held, so an add-product form the shipper
   * had abandoned re-attached itself to the newest reply, turn after turn.
   * Reported as "tried adding a product, didn't add it, then asked it another
   * question, and then the widget with to add new product would always show
   * there below every answer".
   *
   * So the bundle persists and this flag says whether it is NEWS. Cleared when a
   * turn opens, set by the `flow_context` event, and read by the page to decide
   * whether this answer is the one the card belongs to.
   */
  const [flowFromThisTurn, setFlowFromThisTurn] = useState(false);
  /**
   * The draft was saved and the shipper asked to carry on rather than stop.
   *
   * The gateway sets this on `done` when the confirm carried `intent: 'publish'`.
   * A ref rather than state because nothing renders it: it is read once, by
   * `confirmAction`, which reports it back so the caller can send the next turn
   * in ordinary control flow rather than in an effect watching a flag change.
   */
  const finishingRef = useRef(false);
  /** The draft a confirm just created, for the same read-it-once reason as above. */
  const createdDraftRef = useRef<DraftCreated | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback<SseHandler>((event, data) => {
    switch (event) {
      case 'conversation':
        setConversationId(data.conversationId);
        break;

      case 'token':
        setAnswer((prev) => prev + data.text);
        break;

      case 'status':
        // Display verbatim: the gateway localizes `label` itself, so mapping it
        // to a key here would only be able to make it worse. `stage` stays
        // available on the payload if a per-stage icon is ever wanted.
        setActivityLabel(data.label ?? null);
        break;

      case 'options':
        // Keyed by id like the confirmation card: replace, never stack, so one
        // list is on screen at a time.
        setSelection(data as SelectionRequest);
        // A picker and a Confirm button are two competing next actions for the
        // same decision, so they are never both live. The gateway will not send
        // them together; this only covers a proposal left over from the start of
        // this same turn.
        setPendingAction(null);
        break;

      case 'records':
        // An answer, not an offer. Keyed by id and replaced rather than stacked,
        // the same as the other two cards — but nothing retires it, because
        // there is no decision on it to spend.
        setRecords(data as ResultCardSet);
        break;

      case 'flow_context': {
        // Keyed by id and replaced, like the other cards — one guided sequence
        // is on screen at a time, and a second bundle would supersede the first
        // rather than opening a competing wizard beside it.
        //
        // Validated rather than cast. The gateway can open a flow this build has
        // no component for, and the old unconditional cast handed whatever
        // arrived to the shipment wizard - which read `bundle.locations` off a
        // bundle that has none and took the whole page down with it. An
        // unrenderable flow is dropped here: the reply text still says what
        // happened, which is a missing card rather than a broken screen.
        //
        // A refreshed create_shipment bundle (cargo answered in chat) KEEPS the
        // open card's id so ShipmentReviewCard can merge the new seed instead of
        // remounting and wiping in-progress edits.
        const flowEvent = asFlowContext(data);
        if (flowEvent) {
          setFlowFromThisTurn(true);
          setFlow((prev) => {
            if (prev?.flow === 'create_shipment' && flowEvent.flow === 'create_shipment') {
              return { ...flowEvent, id: prev.id };
            }
            return flowEvent;
          });
        }
        break;
      }

      case 'tool_call':
        if (data.requiresConfirmation) {
          // A write action. The gateway has executed nothing — it recorded the
          // proposal and stopped. The card decides whether it ever runs.
          //
          // An unresolved action is re-sent on every subsequent turn with the
          // same id, so this is a replace-by-id, never an accumulation: one
          // pending action exists at a time, whichever proposal is newest.
          setPendingAction({ id: data.id, tool: data.tool, arguments: data.arguments ?? {} });
          setSelection(null); // see 'options' — never both
        } else {
          setToolActivity(data.tool);
        }
        break;

      case 'tool_result':
        setToolActivity(null);
        if (data.status === 'success' && data.data?.job_id && data.data?.async) {
          setBatchJob({
            job_id: String(data.data.job_id),
            async: true,
            status: typeof data.data.status === 'string' ? data.data.status : undefined,
            requested: typeof data.data.requested === 'number' ? data.data.requested : undefined,
            drafts_path: typeof data.data.drafts_path === 'string' ? data.data.drafts_path : '/shipments?status=drafts',
          });
        }
        if (data.status === 'error') {
          // `summary` is a readable line already in the shipper's language. The
          // reply explains the failure too, but this is the gateway's own
          // statement of what happened — and where a plan limit arrives, it is
          // the summary that carries the upgrade prompt.
          setActionError(typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : null);
        } else if (data.status === 'success' && data.data?.published === true) {
          // The load is on the market. Distinguished by `published` rather than
          // by tool name because the two payloads are different things: one
          // links to a draft to finish, the other to a live shipment to watch.
          setPublished(data.data as ShipmentPublished);
        } else if (data.status === 'success' && data.data?.review_url) {
          // Only the confirm stream carries `data` — that is where review_url
          // lives. Read results on /chat deliberately omit it (large, unused here).
          setDraft(data.data as DraftCreated);
          createdDraftRef.current = data.data as DraftCreated;
        }
        break;

      case 'usage':
        setUsage(data);
        break;

      case 'done':
        setToolActivity(null);
        setActivityLabel(null);
        // Empty when the turn is paused on a confirmation card — the model
        // writes no prose before proposing. Assigning it would blank the bubble.
        if (data.message) setAnswer(data.message);
        // The draft was saved and the shipper asked to keep going. Only the
        // confirm stream ever sets this.
        if (data.finishing === true) finishingRef.current = true;
        break;
    }
  }, []);

  /**
   * Runs one /chat turn and streams it into state.
   *
   * A typed message and a tapped card differ only in the request body — same
   * endpoint, same framing, same reset — so both go through here rather than
   * keeping two copies of the plumbing in step.
   */
  const sendTurn = useCallback(async ({ body, locale }: { body: Record<string, unknown>; locale?: string }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnswer('');
    setError(null);
    setUsage(null);
    setPendingAction(null);
    setSelection(null);
    setRecords(null);
    setFlowFromThisTurn(false);
    setDraft(null);
    setActionError(null);
    setActionExpired(false);
    setPublished(null);
    // Deliberately leave `flow` alone. Clearing it on every turn unmounted the
    // open shipment card's live overlay and left the transcript copy stuck on
    // the incomplete initial prefill when the gateway replied text-only. A new
    // `flow_context` still replaces it via handleEvent; starting a brand-new
    // chat resets conversation state separately.
    //
    // `flowFromThisTurn` above is what keeps that from meaning the card follows
    // the conversation down the page: the bundle survives, the claim on the
    // newest answer does not.
    finishingRef.current = false;
    createdDraftRef.current = null;
    setBatchJob(null);
    setToolActivity(null);
    setActivityLabel(null);
    setIsStreaming(true);

    try {
      // Streamed with fetch + a reader, never EventSource: EventSource cannot
      // set request headers, so it could not carry the bearer token at all.
      const response = await gatewayFetch('/chat', {
        method: 'POST',
        token: getStoredToken(),
        locale,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      await readFrames(response, handleEvent, controller.signal, t('vagonai.errors.emptyGatewayResponse', 'The gateway returned an empty response.'));
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      // An aborted or failed stream never delivers `done`, so retire the
      // activity line here too rather than leaving a stale one on screen.
      setToolActivity(null);
      setActivityLabel(null);
    }
  }, [handleEvent]);

  const sendMessage = useCallback((
    message: string,
    { conversationId: turnConversationId, locale, run_kind, forceTool }: SendMessageOptions = {},
  ) =>
    sendTurn({
      body: {
        message,
        conversationId: turnConversationId,
        ...(run_kind ? { run_kind } : {}),
        ...(forceTool ? { forceTool } : {}),
      },
      locale,
    }),
  [sendTurn]);

  /**
   * Answers a card list by tapping one of its options.
   *
   * Identical stream to a typed message, so it reuses sendTurn's plumbing — the
   * only difference is the body, which carries `selection` and no `message` at
   * all. That is the one case the endpoint allows a message-less turn; sending
   * neither is a 400.
   */
  const chooseOption = useCallback((
    request: SelectionRequest,
    optionIds: string | string[],
    { conversationId: turnConversationId, locale, cargo }: SendMessageOptions & { cargo?: CargoCapture } = {}
  ) => sendTurn({
    body: {
      conversationId: turnConversationId ?? conversationId ?? undefined,
      selection: {
        requestId: request.id,
        // A single tap and a multi-select confirm are the same request with a
        // different number of ids, so both go through one path rather than
        // growing a second copy of the body.
        optionIds: Array.isArray(optionIds) ? optionIds : [optionIds],
        // `slot` tells the gateway which lookup this answers — a shipment turn
        // can have a pickup and a delivery picker open across turns.
        ...(request.slot ? { slot: request.slot } : {}),
        // The capture form, when the shipper filled it in. Omitted entirely
        // otherwise: a partial cargo line is a different fact from a complete
        // one, and the gateway falls back to asking, exactly as it did before.
        ...(cargo ? { cargo } : {}),
      },
    },
    locale,
  }), [conversationId, sendTurn]);

  /**
   * Executes a proposed write action and streams the outcome.
   *
   * Safe to call more than once: the gateway claims the action atomically, so
   * concurrent or repeated confirmations resolve to exactly one execution and
   * the loser gets a 409. That is an expected outcome, not an error to surface.
   */
  const confirmAction = useCallback(async (id: string, options: ConfirmOptions = {}): Promise<ConfirmOutcome> => {
    const { locale, routeSummary, intent } = options;
    const controller = new AbortController();
    abortRef.current = controller;

    setAnswer('');
    setError(null);
    setUsage(null);
    setPendingAction(null); // the card is spent either way
    setSelection(null);
    setRecords(null);
    setFlowFromThisTurn(false);
    setActionError(null);
    setActionExpired(false);
    setPublished(null);
    finishingRef.current = false;
    createdDraftRef.current = null;
    setToolActivity(null);
    setActivityLabel(null);
    setIsStreaming(true);

    try {
      const response = await gatewayFetch(`/chat/tool-calls/${id}/confirm`, {
        method: 'POST',
        token: getStoredToken(),
        locale,
        headers: { 'Content-Type': 'application/json' },
        // Always a body, even an empty one: the route the browser measured is
        // the only way a load built here can ever be published, and `intent`
        // is the only way the gateway can tell the card's two buttons apart.
        body: JSON.stringify({
          ...(routeSummary ? { route_summary: routeSummary } : {}),
          ...(intent ? { intent } : {}),
        }),
        signal: controller.signal,
      });

      await readFrames(response, handleEvent, controller.signal, t('vagonai.errors.emptyGatewayResponse', 'The gateway returned an empty response.'));
    } catch (err) {
      if (err instanceof GatewayError && err.status === 409) return { finishing: false, draft: null }; // already resolved
      // 404 = the gateway no longer holds this proposal. Nothing ran, so this is
      // not a failure to report as one — the card is simply gone and the
      // shipper has to ask again.
      if (err instanceof GatewayError && err.status === 404) {
        setActionExpired(true);
        return { finishing: false, draft: null };
      }
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
    } finally {
      setIsStreaming(false);
      // An aborted or failed stream never delivers `done`, so retire the
      // activity line here too rather than leaving a stale one on screen.
      setToolActivity(null);
      setActivityLabel(null);
    }

    return { finishing: finishingRef.current, draft: createdDraftRef.current };
  }, [handleEvent]);

  /** Discards a proposed action without executing it. Returns plain JSON, not a stream. */
  const cancelAction = useCallback(async (id: string, locale?: string) => {
    setPendingAction(null);
    try {
      await gatewayFetch(`/chat/tool-calls/${id}/cancel`, {
        method: 'POST',
        token: getStoredToken(),
        locale,
      });
    } catch (err) {
      // 409 = already confirmed or cancelled; 404 = the gateway no longer holds
      // it (restart, or tools switched off). Neither is worth alarming the
      // shipper about — in both cases the action is definitively not running.
      if (err instanceof GatewayError && (err.status === 409 || err.status === 404)) return;
      if (err instanceof Error) setError(err.message);
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return {
    answer, isStreaming, error, usage, conversationId,
    pendingAction, selection, records, toolActivity, activityLabel,
    batchJob, draft, published, flow, flowFromThisTurn,
    actionError, actionExpired,
    sendMessage, chooseOption, confirmAction, cancelAction, cancel,
  };
}

