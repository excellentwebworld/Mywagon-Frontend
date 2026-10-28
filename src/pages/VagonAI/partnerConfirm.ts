/**
 * The confirmation card for the ten Partners-page writes.
 *
 * These used to fall through to the generic card, which lists raw arguments
 * under English labels and keeps the first ten. The gateway's validators spread
 * the tool's own arguments first and add the readable rows after, so the cap
 * cut exactly the rows the card exists for: the route and rate on a contract
 * lane, the tags a replace throws away. The shipper approved "partner_id 41,
 * mode replace" without seeing what would be lost, and the three one-way
 * actions (decline, remove, delete a rate) carried no warning at all.
 *
 * Kept pure, beside the card, for the same reason `confirmFields.ts` is: the
 * copy each action needs can be checked without rendering React.
 */
import type { Field, Translate } from './confirmFields';

export const PARTNER_WRITE_TOOLS = [
  'invite_partner',
  'accept_partner_request',
  'decline_partner_request',
  'remove_partner',
  'set_partner_suspended',
  'set_partner_preferred',
  'update_partner_notes',
  'update_partner_tags',
  'add_contract_lane',
  'delete_contract_lane',
] as const;

/**
 * What the card is approving. The two setters are split by direction: a card
 * titled "Change suspension?" for a reactivation is the inversion the gateway's
 * setter design exists to prevent.
 */
export type PartnerAction =
  | 'invite' | 'accept' | 'decline' | 'remove'
  | 'suspend' | 'reactivate' | 'prefer' | 'unprefer'
  | 'notes' | 'tags' | 'addLane' | 'deleteLane';

export const PARTNER_ACTIONS: PartnerAction[] = [
  'invite', 'accept', 'decline', 'remove', 'suspend', 'reactivate',
  'prefer', 'unprefer', 'notes', 'tags', 'addLane', 'deleteLane',
];

/** The actions that carry a warning line, and the copy key it reads. */
export const PARTNER_WARNINGS = ['decline', 'remove', 'deleteLane', 'suspend', 'notes', 'tagsReplace'] as const;

export const PARTNER_TYPES = ['carrier_company', 'freelancer_driver', 'supplier'];
export const PARTNER_STATUSES = ['active', 'inv_sent', 'inv_recv', 'suspended'];
const RELATIONSHIPS = ['preferred', 'standard'];
const TRIP_TYPES = ['direct', 'roundtrip'];
const UNITS = ['load', 'pallet'];

const P = 'vagonai.confirm.partner';

export function partnerAction(tool: string, args: Record<string, unknown>): PartnerAction | null {
  switch (tool) {
    case 'invite_partner': return 'invite';
    case 'accept_partner_request': return 'accept';
    case 'decline_partner_request': return 'decline';
    case 'remove_partner': return 'remove';
    case 'set_partner_suspended': return args.suspended === false ? 'reactivate' : 'suspend';
    case 'set_partner_preferred': return args.preferred === false ? 'unprefer' : 'prefer';
    case 'update_partner_notes': return 'notes';
    case 'update_partner_tags': return 'tags';
    case 'add_contract_lane': return 'addLane';
    case 'delete_contract_lane': return 'deleteLane';
    default: return null;
  }
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

/** A wire value named in the shipper's language, or left as it came when this build does not know it. */
function named(t: Translate, group: string, known: string[], value: unknown): string {
  const raw = text(value);
  return raw && known.includes(raw) ? t(`${P}.${group}.${raw}`) : raw;
}

/** Who the card is about: the partner's name, or for an invitation, whoever it goes to. */
export function partnerHeading(action: PartnerAction, args: Record<string, unknown>): string | null {
  if (action === 'invite') {
    const phone = text(args.phone) ? `${text(args.country_code)} ${text(args.phone)}`.trim() : '';
    return text(args.email) || text(args.unique_id) || phone || null;
  }
  return text(args.partner_name) || null;
}

/** Tag lists compared the way the gateway merges them: case-insensitively. */
function minus(from: string[], take: string[]): string[] {
  const drop = new Set(take.map((tag) => tag.toLowerCase()));
  return from.filter((tag) => !drop.has(tag.toLowerCase()));
}

export function partnerFields(action: PartnerAction, args: Record<string, unknown>, t: Translate): Field[] {
  const none = t(`${P}.none`);
  const list = (tags: string[]) => (tags.length > 0 ? tags.join(', ') : none);
  const field = (key: string, value: string): Field => ({ label: t(`${P}.fields.${key}`), value });

  if (action === 'invite') {
    return [
      field('type', named(t, 'types', PARTNER_TYPES, args.partner_type)),
      field('relationship', named(t, 'relationships', RELATIONSHIPS, args.relationship ?? 'standard')),
    ].filter((f) => f.value);
  }

  const rows: Field[] = [
    field('type', named(t, 'types', PARTNER_TYPES, args.partner_type)),
    field('status', named(t, 'statuses', PARTNER_STATUSES, args.partner_status)),
    field('region', text(args.partner_region)),
  ];

  if (action === 'notes') {
    const next = text(args.notes);
    rows.push(field('newNote', next || none));
    if (text(args.replaces_existing_note)) rows.push(field('previousNote', text(args.replaces_existing_note)));
  }

  if (action === 'tags') {
    const current = strings(args.current_tags);
    const resulting = strings(args.resulting_tags);
    const added = minus(resulting, current);
    const removed = minus(current, resulting);
    rows.push(field('tagsNow', list(current)));
    if (added.length > 0) rows.push(field('tagsAdded', list(added)));
    if (removed.length > 0) rows.push(field('tagsRemoved', list(removed)));
    rows.push(field('tagsResulting', list(resulting)));
  }

  if (action === 'addLane') {
    const from = text(args.origin_city);
    const to = text(args.destination_city);
    rows.push(field('route', from && to ? t('vagonai.confirm.route', { from, to }) : from || to));
    const price = text(args.price);
    if (price) rows.push(field('rate', `${price} EUR ${named(t, 'units', UNITS, args.unit)}`.trim()));
    rows.push(field('tripType', named(t, 'tripTypes', TRIP_TYPES, args.trip_type ?? 'direct')));
    const fromDate = text(args.effective_from);
    const toDate = text(args.effective_to);
    if (fromDate || toDate) rows.push(field('effective', [fromDate, toDate].filter(Boolean).join(' – ')));
  }

  if (action === 'deleteLane') {
    // The validator resolved the lane to its route and rate; only those strings
    // reach the card, so they are shown as sent with the arrow made readable.
    rows.push(field('route', text(args.route).replace(/\s*->\s*/g, ' → ')));
    rows.push(field('rate', text(args.rate_summary)));
  }

  if (action === 'remove') {
    const lanes = Number(args.contract_lanes_lost);
    const tags = Number(args.tags_lost);
    if (lanes > 0) rows.push(field('lanesLost', String(lanes)));
    if (tags > 0) rows.push(field('tagsLost', String(tags)));
    if (args.note_lost === true) rows.push(field('noteLost', t('yes')));
  }

  return rows.filter((f) => f.value);
}

/** The line under the title, for the actions whose effect is easy to understate. */
export function partnerWarning(action: PartnerAction, args: Record<string, unknown>, t: Translate): string | null {
  if (action === 'decline' || action === 'remove' || action === 'deleteLane' || action === 'suspend') {
    return t(`${P}.warnings.${action}`);
  }
  if (action === 'notes' && text(args.replaces_existing_note)) return t(`${P}.warnings.notes`);
  if (action === 'tags' && args.mode === 'replace' && strings(args.current_tags).length > 0) {
    return t(`${P}.warnings.tagsReplace`);
  }
  return null;
}
