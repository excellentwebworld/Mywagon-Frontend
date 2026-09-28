/**
 * Where an answer can send the shipper, for the reads that produce no card.
 *
 * ## The gap this fills
 *
 * Most lookups come back as a `records` event, and a record card set carries its
 * own `action` — an in-app route the gateway resolved server-side, so the client
 * never builds one. Those answers already end in a button and none of them needs
 * anything here.
 *
 * But `SOURCES` in the gateway's `resultCards.ts` only maps seven read tools to
 * a card kind: shipments, locations, products, available trucks and partners.
 * Every other read answers in prose alone. Ask "do I owe anything?" and you get
 * a correct, well-written paragraph about your outstanding invoices and no way
 * to act on it — the shipper has to go and find Billing in the navigation
 * themselves, having just been told there is something there worth seeing.
 *
 * So this is the client's half of that: a route per tool that has a page but no
 * card. It is keyed off the `tool_call` event, which arrives for reads as well
 * as writes and carries the tool name.
 *
 * ## Why this is a frontend table and not a gateway change
 *
 * The honest fix for several of these is a card kind on the gateway — a
 * subscription card with the tier, the renewal date and the quota bars would say
 * far more than a link. That is a larger change in a published client contract,
 * and `tool_result` on `/chat` deliberately omits the payload ("large, unused
 * here"), so the client has nothing to build a card FROM today. A route is what
 * can be offered honestly right now: it needs no payload, only the tool's name.
 *
 * ## The rule
 *
 * A tool belongs here only if BOTH hold:
 *   1. It produces no `records` set — otherwise this would be a second,
 *      competing button next to the gateway's own.
 *   2. It has a real page a shipper would want after reading the answer.
 *
 * That second condition is why the mid-flow lookups are absent. Sending someone
 * to /partners in the middle of choosing carriers for a load abandons the load.
 */

/** A read tool's destination: the route, and the i18n leaf naming the button. */
export interface Destination {
  href: string;
  /** Under `vagonai.destinations`. Written as the button's label, e.g. "Open Billing". */
  labelKey: string;
}

export const DESTINATIONS: Record<string, Destination> = {
  // ── Plan and billing ──────────────────────────────────────────────
  // The clearest case of the gap. All three answer with figures the shipper
  // will want to act on, and none of the three has a card.
  get_subscription: { href: '/subscription', labelKey: 'subscription' },
  list_subscription_addons: { href: '/subscription', labelKey: 'subscription' },
  get_billing_summary: { href: '/billing', labelKey: 'billing' },

  // ── Partners ──────────────────────────────────────────────────────
  // `find_partner` and `get_partner` are absent on purpose: both DO produce
  // cards, and each card already carries a route to that partner's own panel.
  // These two are the module-level reads that do not.
  get_partner_summary: { href: '/partners', labelKey: 'partners' },
  list_partner_truck_categories: { href: '/partners', labelKey: 'partners' },

  // ── Orders ────────────────────────────────────────────────────────
  // `find_order` answers in prose although it is the busiest read in the ERP
  // module, and the batch planner ends in a decision about a work queue that
  // lives on one page.
  find_order: { href: '/erp-orders', labelKey: 'orders' },
  get_unplanned_order_groups: { href: '/erp-orders', labelKey: 'orders' },

  // ── Reference data ────────────────────────────────────────────────
  // A company lookup is an Address Book question whose answer is a name and a
  // VAT number, with no card and no per-record page.
  find_company: { href: '/address-book', labelKey: 'addressBook' },
  list_product_categories: { href: '/products', labelKey: 'products' },

  // `list_vehicle_types` is deliberately absent. It is a vocabulary lookup —
  // turning "reefer" into an id — and there is no page of vehicle types to
  // send anyone to; the types only exist inside a load being built.
};

/**
 * The destination for a turn, given the read tools it ran.
 *
 * Last match wins, because the last read is the one the answer is actually
 * about: a turn that looks a partner up and then reads the plan is answering a
 * question about the plan. At most one button — a row of three competing
 * destinations is the same problem as none.
 */
export function destinationFor(tools: readonly string[]): Destination | null {
  for (let i = tools.length - 1; i >= 0; i -= 1) {
    const hit = DESTINATIONS[tools[i]];
    if (hit) return hit;
  }
  return null;
}
