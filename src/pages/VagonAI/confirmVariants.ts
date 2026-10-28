/**
 * Which confirmation card a proposed write action gets.
 *
 * Each write tool lands in a different module — a draft shipment, an Address
 * Book location, a Product Master entry — so the card's title, fields and
 * button label all key off this. A proposed address announced as "Create this
 * draft shipment?" is not a cosmetic slip: it tells the shipper they are
 * approving something they are not.
 *
 * Kept beside the card rather than inside it so the copy each variant needs can
 * be checked without rendering React.
 */
export type ConfirmVariant =
  | 'shipment'
  | 'publish'
  | 'location'
  | 'product'
  | 'erpOrder'
  | 'markComplete'
  | 'markOrderComplete'
  | 'reopenOrder'
  | 'orderImport'
  | 'bid'
  | 'partner'
  | 'generic';

const VARIANT_BY_TOOL: Record<string, ConfirmVariant> = {
  create_shipment: 'shipment',
  // Deliberately its own variant rather than a mode of 'shipment'. The two
  // approve opposite things: one saves a private draft nobody else can see, the
  // other puts the load in front of other companies and cannot be undone from
  // the chat. A card that got those the wrong way round would be the single
  // worst mislabelling in the flow.
  publish_shipment: 'publish',
  create_location: 'location',
  create_product: 'product',
  // Named `erpOrder` rather than `order` because `vagonai.confirm.order` is
  // already taken: it is the cargo-line label the shipment card renders as
  // "Order PO-4821". A variant called `order` would resolve
  // `vagonai.confirm.order.title` against a plain string and render nothing.
  //
  // Its own variant for the same reason `publish` is: an order and a shipment
  // approve different things in different modules, and a card that announced a
  // filed order as a draft load would be exactly the confusion this whole flow
  // was added to remove.
  create_order: 'erpOrder',
  mark_shipment_complete: 'markComplete',
  // An ORDER closed as delivered outside MYVAGON - kept apart from the shipment
  // card above, which completes a load and says so.
  mark_order_complete: 'markOrderComplete',
  reopen_order: 'reopenOrder',
  // A whole file of orders, plus whatever companies, addresses and products it
  // needs - not one order, so not the erpOrder card. Its only argument is the
  // import id; the card says what will happen, the import card shows the counts.
  run_order_import: 'orderImport',
  // An offer to another company's truck (PTB-02). Its own card rather than the
  // generic list: the carrier sees it the moment it is confirmed, so the price,
  // its currency and the truck's subtype have to be on it, named.
  place_truck_bid: 'bid',
  // The ten Partners-page writes share one card whose title and rows follow the
  // action (partnerConfirm.ts). The generic list they used to get cut the route,
  // the rate and the discarded tags - the rows the shipper is approving.
  invite_partner: 'partner',
  accept_partner_request: 'partner',
  decline_partner_request: 'partner',
  remove_partner: 'partner',
  set_partner_suspended: 'partner',
  set_partner_preferred: 'partner',
  update_partner_notes: 'partner',
  update_partner_tags: 'partner',
  add_contract_lane: 'partner',
  delete_contract_lane: 'partner',
};

/**
 * A write tool this build does not know about renders generically — arguments
 * listed under a neutral title — never as one of the modules it is not.
 */
export const confirmVariant = (tool: string): ConfirmVariant => VARIANT_BY_TOOL[tool] ?? 'generic';

/** The Address Book's own facility types, named in the shipper's language. */
export const FACILITY_SUBTYPES = ['dc', 'warehouse', 'plant', 'store', 'port', 'other'];
