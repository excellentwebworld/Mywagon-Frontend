/**
 * The coverage guard.
 *
 * The gateway decides what tools exist; this file is the only place the frontend
 * asserts it can get to all of them. Without it "every MCP tool is covered" is
 * a claim nobody re-checks, and the failure is silent in the worst way — a
 * capability ships on the gateway, no chip ever mentions it, and the shipper's
 * only route to it is guessing the sentence that triggers it.
 *
 * `GATEWAY_TOOLS` is a literal copy of `MCP_TOOL_POLICIES` in
 * `src/mcp/toolWhitelist.ts`. It is duplicated rather than imported because the
 * two repositories ship separately and the frontend cannot reach into the
 * gateway's source at build time. That makes this list a manual mirror, which is
 * exactly why the test below also checks its own size: a tool added on the
 * gateway has to be added here, and the moment it is, it must be reachable or
 * routed through `MID_FLOW_TOOLS` with a reason.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_MODULES, MID_FLOW_TOOLS, allCapabilities, coveredTools,
} from './capabilities';

type Dict = Record<string, unknown>;

const load = (lang: 'en' | 'el'): Dict => JSON.parse(readFileSync(`src/locale/${lang}.json`, 'utf-8'));
const LOCALES: [string, Dict][] = [['en', load('en')], ['el', load('el')]];

const at = (dict: Dict, key: string): unknown => key
  .split('.')
  .reduce<unknown>((node, part) => (node && typeof node === 'object'
    ? (node as Dict)[part]
    : undefined), dict);

/** Mirror of the gateway's curated tool policy, in its own order. */
const GATEWAY_TOOLS = [
  'find_shipment', 'get_shipment', 'find_location', 'find_company', 'find_product',
  'list_product_categories', 'list_vehicle_types', 'create_location', 'create_product',
  'create_shipment', 'find_available_truck', 'get_available_truck', 'list_truck_matches',
  'place_truck_bid', 'list_partners', 'suggest_shipment_price',
  'publish_shipment', 'mark_shipment_complete', 'find_order', 'list_tracking_recipients', 'prepare_shipment',
  'get_create_product_context', 'get_create_location_context', 'create_order',
  'get_create_order_context', 'get_subscription',
  'list_subscription_addons', 'get_billing_summary', 'get_partner_summary', 'find_partner',
  'get_partner', 'list_partner_truck_categories', 'invite_partner', 'accept_partner_request',
  'decline_partner_request', 'remove_partner', 'set_partner_suspended', 'set_partner_preferred',
  'update_partner_notes', 'update_partner_tags', 'add_contract_lane', 'delete_contract_lane',
  'get_dashboard_analytics', 'get_unplanned_order_groups',
  // MS3-336 / MS3-333.
  'update_ai_draft', 'create_homogeneous_batch_drafts', 'create_oneshot_draft_from_order',
];

describe('MCP tool coverage', () => {
  // If this number moves, the mirror above was edited — which is the intended
  // way to add a tool. It fails first so the diff says "the gateway grew" rather
  // than "nine prompts are missing".
  it('mirrors all 47 gateway tools', () => {
    expect(GATEWAY_TOOLS).toHaveLength(47);
    expect(new Set(GATEWAY_TOOLS).size).toBe(GATEWAY_TOOLS.length);
  });

  // The whole point of the file. Every tool is either something the shipper can
  // start from a chip, or something the assistant reaches mid-flow with a
  // written reason. There is no third category.
  it('reaches every gateway tool from a chip or documents why not', () => {
    const covered = coveredTools();
    const unreachable = GATEWAY_TOOLS
      .filter((tool) => !covered.has(tool))
      .filter((tool) => !(tool in MID_FLOW_TOOLS));

    expect(unreachable).toEqual([]);
  });

  // A tool in both places is a contradiction: it claims to be offered up front
  // and to be unofferable. One of the two entries is wrong and this says which
  // file to look in.
  it('never both offers a tool and calls it mid-flow only', () => {
    const covered = coveredTools();
    const both = Object.keys(MID_FLOW_TOOLS).filter((tool) => covered.has(tool));
    expect(both).toEqual([]);
  });

  // Guards against the catalogue drifting ahead of the gateway — a chip aimed at
  // a tool that no longer exists sends a prompt the model cannot satisfy, and
  // the shipper gets an apology instead of an answer.
  it('never claims a tool the gateway does not expose', () => {
    const known = new Set(GATEWAY_TOOLS);
    const invented = [...coveredTools()].filter((tool) => !known.has(tool));
    expect(invented).toEqual([]);
  });

  it('gives every mid-flow exemption a reason', () => {
    for (const [tool, reason] of Object.entries(MID_FLOW_TOOLS)) {
      expect(reason.length, tool).toBeGreaterThan(20);
    }
  });
});

describe('capability catalogue', () => {
  it('has no duplicate keys', () => {
    const keys = allCapabilities().map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);

    const modules = CAPABILITY_MODULES.map((module) => module.key);
    expect(new Set(modules).size).toBe(modules.length);
  });

  it('gives every entry at least one tool', () => {
    for (const item of allCapabilities()) {
      expect(item.tools.length, item.key).toBeGreaterThan(0);
    }
  });

  it('has no empty module', () => {
    for (const module of CAPABILITY_MODULES) {
      expect(module.items.length, module.key).toBeGreaterThan(0);
    }
  });

  // A chip whose prompt is missing renders the raw i18n key and, when tapped,
  // sends that key to the gateway as the shipper's message. Both languages, so
  // a Greek shipper is never the one who finds out.
  it.each(LOCALES)('%s has a title and a prompt for every entry', (_lang, dict) => {
    for (const item of allCapabilities()) {
      for (const leaf of ['title', 'prompt']) {
        const value = at(dict, `vagonai.capabilities.items.${item.key}.${leaf}`);
        expect(typeof value === 'string' && value.length > 0, `${item.key}.${leaf}`).toBe(true);
      }
    }
  });

  it.each(LOCALES)('%s names every module', (_lang, dict) => {
    for (const module of CAPABILITY_MODULES) {
      const value = at(dict, `vagonai.capabilities.modules.${module.key}`);
      expect(typeof value === 'string' && value.length > 0, module.key).toBe(true);
    }
  });

  it.each(LOCALES)('%s carries the catalogue’s own chrome', (_lang, dict) => {
    for (const key of ['heading', 'hint', 'show', 'hide']) {
      expect(at(dict, `vagonai.capabilities.${key}`), key).toBeTruthy();
    }
  });

  // Same rule the confirmation copy is held to: the two languages must offer the
  // same catalogue, or a Greek shipper is shown fewer capabilities than an
  // English one for no reason anybody chose.
  it('translates the whole catalogue in both languages', () => {
    const [, en] = LOCALES[0];
    const [, el] = LOCALES[1];
    const flatten = (node: unknown, prefix = ''): string[] => (node && typeof node === 'object'
      ? Object.entries(node as Dict).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
      : [prefix]);

    expect(flatten(at(el, 'vagonai.capabilities')).sort())
      .toEqual(flatten(at(en, 'vagonai.capabilities')).sort());
  });

  // A prompt is sent verbatim as the shipper's own message, so it has to read
  // like something they said. A prompt that is merely the chip's label back
  // again ("Partners") is not a question and gets a clarifying question in reply
  // — which is the turn the chip existed to save.
  it('writes prompts as sentences, not labels', () => {
    const [, en] = LOCALES[0];
    for (const item of allCapabilities()) {
      const prompt = at(en, `vagonai.capabilities.items.${item.key}.prompt`) as string;
      const title = at(en, `vagonai.capabilities.items.${item.key}.title`) as string;
      expect(prompt, item.key).not.toBe(title);
      expect(prompt.length, item.key).toBeGreaterThan(12);
    }
  });
});
