/**
 * Everything Vagon AI can actually do, grouped the way the shipper's own panel
 * is grouped.
 *
 * The problem this solves is discoverability, not capability. The gateway
 * exposes 45 tools; the welcome screen offers six actions and six questions,
 * and those twelve are the right twelve to lead with — but they left the whole
 * Partners module, Search Available Trucks and anything to do with the plan or
 * the bill with no entry point at all. A shipper looking at a composer has no
 * way to know that "suspend Kappa Logistics" or "who has a reefer free next
 * week" are things they can type.
 *
 * So this is a catalogue, and deliberately NOT a second flat grid of prompts.
 * The hero's two tiers stay the common path; this sits under them, collapsed,
 * as the answer to "what else?".
 *
 * ## `tools` is the point of this file
 *
 * Every entry names the MCP tools its prompt is written to reach. That is both
 * documentation and the ground truth `capabilities.test.ts` checks against the
 * gateway's own whitelist: a tool nobody can get to from here fails the build.
 * It is the only mechanical guard that the catalogue keeps up with the gateway,
 * because nothing else in the frontend knows how many tools exist.
 *
 * A prompt is not a promise that one tool runs. The model still chooses, and a
 * question about a load may well take `find_shipment` and then `get_shipment`.
 * `tools` says which capability the prompt is aimed at, so an entry listing a
 * tool it could never plausibly trigger is a mislabelled entry, not a clever one.
 */
import type { ComponentType } from 'react';
import {
  Package, Truck, Users, MapPin, Boxes, ClipboardList, BarChart3, CreditCard,
} from 'lucide-react';

export interface Capability {
  /**
   * The i18n leaf under `vagonai.capabilities.items`, carrying `title` (what the
   * chip says) and `prompt` (what is sent as the shipper's own message).
   */
  key: string;
  /** The MCP tools this prompt is aimed at. See the note above — it is checked. */
  tools: string[];
}

export interface CapabilityModule {
  /** The i18n leaf under `vagonai.capabilities.modules`, carrying `title`. */
  key: string;
  icon: ComponentType<{ size?: number }>;
  items: Capability[];
}

/**
 * Ordered the way a shipper's week runs rather than the way the tools are
 * registered: the load first, then where it came from, then who moves it, then
 * the reference data behind all of it, and the account last.
 */
export const CAPABILITY_MODULES: CapabilityModule[] = [
  {
    key: 'shipments',
    icon: Package,
    items: [
      { key: 'findShipments', tools: ['find_shipment'] },
      { key: 'trackShipment', tools: ['find_shipment', 'get_shipment'] },
      { key: 'shipmentBids', tools: ['find_shipment', 'get_shipment'] },
      { key: 'newShipment', tools: ['prepare_shipment', 'create_shipment'] },
      { key: 'truckTypes', tools: ['list_vehicle_types'] },
      { key: 'priceAdvice', tools: ['suggest_shipment_price'] },
      { key: 'publishDraft', tools: ['publish_shipment'] },
      // MS3-333 - N selected same-lane orders become N private drafts in one go.
      { key: 'batchDrafts', tools: ['create_homogeneous_batch_drafts'] },
    ],
  },
  {
    key: 'orders',
    icon: ClipboardList,
    items: [
      { key: 'findOrders', tools: ['find_order'] },
      { key: 'newOrder', tools: ['get_create_order_context', 'create_order'] },
      { key: 'shipAnOrder', tools: ['find_order', 'prepare_shipment'] },
      // The batch planner. Its own entry rather than folded into `shipAnOrder`
      // because the two are different questions: one ships a named order, this
      // asks what is left and how it groups.
      { key: 'unplannedOrders', tools: ['get_unplanned_order_groups'] },
    ],
  },
  {
    key: 'trucks',
    icon: Truck,
    items: [
      { key: 'findTruck', tools: ['find_available_truck'] },
      { key: 'truckDetail', tools: ['find_available_truck', 'get_available_truck'] },
      { key: 'truckMatches', tools: ['list_truck_matches'] },
      { key: 'offerLoad', tools: ['list_truck_matches', 'place_truck_bid'] },
    ],
  },
  {
    key: 'partners',
    icon: Users,
    items: [
      { key: 'partnerOverview', tools: ['get_partner_summary'] },
      { key: 'findPartner', tools: ['find_partner'] },
      { key: 'partnerDetail', tools: ['find_partner', 'get_partner'] },
      { key: 'partnersByTruck', tools: ['list_partner_truck_categories', 'find_partner'] },
      { key: 'invitePartner', tools: ['invite_partner'] },
      // Accepting and declining are one entry because they are one decision made
      // in one place: the shipper asks what is waiting on them, and the answer
      // carries both actions. Two chips would imply two places to look.
      { key: 'partnerRequests', tools: ['find_partner', 'accept_partner_request', 'decline_partner_request'] },
      { key: 'suspendPartner', tools: ['set_partner_suspended'] },
      { key: 'preferPartner', tools: ['set_partner_preferred'] },
      { key: 'partnerNote', tools: ['update_partner_notes'] },
      { key: 'partnerTags', tools: ['update_partner_tags'] },
      { key: 'agreedRates', tools: ['get_partner', 'add_contract_lane'] },
      { key: 'dropRate', tools: ['get_partner', 'delete_contract_lane'] },
      { key: 'removePartner', tools: ['remove_partner'] },
    ],
  },
  {
    key: 'addressBook',
    icon: MapPin,
    items: [
      { key: 'findLocation', tools: ['find_location'] },
      { key: 'findCompany', tools: ['find_company'] },
      { key: 'newLocation', tools: ['get_create_location_context', 'create_location'] },
    ],
  },
  {
    key: 'products',
    icon: Boxes,
    items: [
      { key: 'findProduct', tools: ['find_product'] },
      { key: 'productCategories', tools: ['list_product_categories'] },
      { key: 'newProduct', tools: ['get_create_product_context', 'create_product'] },
    ],
  },
  {
    key: 'account',
    icon: CreditCard,
    items: [
      { key: 'myPlan', tools: ['get_subscription'] },
      { key: 'myAddons', tools: ['list_subscription_addons'] },
      { key: 'whatIOwe', tools: ['get_billing_summary'] },
    ],
  },
  {
    key: 'dashboard',
    icon: BarChart3,
    items: [
      { key: 'howAmIDoing', tools: ['get_dashboard_analytics'] },
    ],
  },
];

/**
 * Tools the assistant reaches on its own mid-conversation, and which therefore
 * get no chip.
 *
 * Not an oversight and not a gap — each of these answers a question the shipper
 * is already being asked inside a flow, and a chip for it would open a picker
 * with nothing to pick for. Listed explicitly so `capabilities.test.ts` can
 * tell "deliberately not offered" apart from "forgotten", which is the whole
 * failure mode that test exists to catch.
 */
export const MID_FLOW_TOOLS: Record<string, string> = {
  create_oneshot_draft_from_order: 'Sticky / oneshot draft create from a selected order, not a welcome chip.',
  // MS3-350 — offered from shipment result-card follow-up / chat intent, not a welcome chip.
  mark_shipment_complete: 'Reached from an in-progress shipment card follow-up or an explicit Mark as Complete request, not an opening catalogue chip.',
  // The carrier picker behind a publish. `find_partner` is the entry point for
  // looking partners up; this one exists to fill that one step.
  list_partners: 'The carrier picker inside publish_shipment, not a way to browse partners.',
  // Keyed to an ERP order, so it can only be offered once a load built from one
  // is being published.
  list_tracking_recipients: 'Offered only for a load built from an order, after the price and before publishing.',
  // MS3-336 - reached by editing a draft that is already on screen, never as an
  // opening request, so it is not something to advertise in the catalogue.
  update_ai_draft: 'Applies an edit to an AI draft already under review, not a way to start one.',
};

/** Every tool the catalogue claims to reach, flattened. */
export const coveredTools = (): Set<string> => new Set(
  CAPABILITY_MODULES.flatMap((module) => module.items.flatMap((item) => item.tools)),
);

/** Every prompt in the catalogue, in render order. */
export const allCapabilities = (): Capability[] => CAPABILITY_MODULES.flatMap((module) => module.items);
