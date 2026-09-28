import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESTINATIONS, destinationFor } from './destinations';

type Dict = Record<string, unknown>;

const load = (lang: 'en' | 'el'): Dict => JSON.parse(readFileSync(`src/locale/${lang}.json`, 'utf-8'));
const LOCALES: [string, Dict][] = [['en', load('en')], ['el', load('el')]];

const at = (dict: Dict, key: string): unknown => key
  .split('.')
  .reduce<unknown>((node, part) => (node && typeof node === 'object'
    ? (node as Dict)[part]
    : undefined), dict);

/**
 * The read tools the gateway maps to a record-card kind, from `SOURCES` in its
 * `chat/resultCards.ts`.
 *
 * A card set carries its own server-resolved `action`, so any of these
 * appearing in `DESTINATIONS` would put a second, client-invented button next to
 * the gateway's own — with no guarantee the two agree on where the record lives.
 */
const TOOLS_WITH_CARDS = [
  'find_shipment', 'get_shipment', 'find_location', 'find_product',
  'find_available_truck', 'get_available_truck', 'find_partner', 'get_partner',
];

/** The real routes in `src/router.tsx`, which is what these hrefs must resolve to. */
const APP_ROUTES = [
  '/subscription', '/billing', '/partners', '/erp-orders', '/address-book', '/products',
  '/shipments', '/search-trucks', '/dashboard',
];

describe('destinationFor', () => {
  it('routes a prose-only read to its page', () => {
    expect(destinationFor(['get_billing_summary'])?.href).toBe('/billing');
    expect(destinationFor(['get_subscription'])?.href).toBe('/subscription');
    expect(destinationFor(['find_order'])?.href).toBe('/erp-orders');
  });

  it('offers nothing for a turn that ran no read with a page', () => {
    expect(destinationFor([])).toBeNull();
    expect(destinationFor(['list_vehicle_types'])).toBeNull();
  });

  // The last read is what the answer is about. A turn that looks a partner up
  // and then reads the plan has answered a question about the plan, and sending
  // that shipper to /partners would be answering the question they asked two
  // sentences ago.
  it('follows the last read that has a page', () => {
    expect(destinationFor(['get_partner_summary', 'get_subscription'])?.href).toBe('/subscription');
    expect(destinationFor(['get_subscription', 'get_partner_summary'])?.href).toBe('/partners');
  });

  // A trailing read with no page must not blank the destination the turn earned.
  it('skips past reads that have no page', () => {
    expect(destinationFor(['get_billing_summary', 'list_vehicle_types'])?.href).toBe('/billing');
  });

  it('never offers more than one destination', () => {
    const hit = destinationFor(['get_subscription', 'get_billing_summary', 'find_order']);
    expect(hit).not.toBeNull();
    expect(hit?.href).toBe('/erp-orders');
  });
});

describe('the destination table', () => {
  // The invariant that keeps this from double-buttoning an answer. If a tool
  // gains a card kind on the gateway, it has to leave this table.
  it('never duplicates a tool that already sends a record card', () => {
    const overlap = TOOLS_WITH_CARDS.filter((tool) => tool in DESTINATIONS);
    expect(overlap).toEqual([]);
  });

  it('points only at routes the app actually has', () => {
    for (const [tool, dest] of Object.entries(DESTINATIONS)) {
      expect(APP_ROUTES, tool).toContain(dest.href);
    }
  });

  // An in-app path, so react-router handles it. An absolute URL would leave the
  // SPA and reload the whole panel, losing the conversation.
  it('uses in-app paths, never absolute URLs', () => {
    for (const [tool, dest] of Object.entries(DESTINATIONS)) {
      expect(dest.href.startsWith('/'), tool).toBe(true);
      expect(dest.href, tool).not.toMatch(/^https?:/);
    }
  });

  it.each(LOCALES)('%s labels every destination', (_lang, dict) => {
    for (const [tool, dest] of Object.entries(DESTINATIONS)) {
      const label = at(dict, `vagonai.destinations.${dest.labelKey}`);
      expect(typeof label === 'string' && label.length > 0, `${tool} → ${dest.labelKey}`).toBe(true);
    }
  });

  it('translates the same destination labels in both languages', () => {
    const [, en] = LOCALES[0];
    const [, el] = LOCALES[1];
    const keys = (dict: Dict) => Object.keys((at(dict, 'vagonai.destinations') ?? {}) as Dict).sort();
    expect(keys(el)).toEqual(keys(en));
  });
});
