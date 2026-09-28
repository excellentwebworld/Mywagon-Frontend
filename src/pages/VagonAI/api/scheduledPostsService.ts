/**
 * Scheduled bulk posting, against the gateway's `/scheduled-posts` surface.
 *
 * The sibling of `shipmentDraftService.ts` and built the same way: a payload the
 * shipper assembled off a form, posted straight to the gateway rather than sent
 * as a chat message. There is nothing here for the model to work out, so
 * spending a completion on it would only re-derive decisions already made — and
 * this has to work with the copilot switched off entirely.
 *
 * ## Where a batch is armed, and why it is not here
 *
 * At the end of the guided create-shipment chat flow, from the `ShipmentDraft`
 * it already holds. That draft's stops and lines are real record ids, so nothing
 * in this feature ever matches a name back to a record. A published shipment is
 * deliberately not a template, and neither is the `publish_shipment` confirmation
 * card: MYVAGON and that card both describe a load with display strings and no
 * ids, which is why the earliest version of this had to ask the shipper to
 * re-pick their own sites. See `VagonAI/ScheduleBulkDrawer.tsx`.
 *
 * ## What "scheduled" actually means here
 *
 * Not unattended. The gateway calls MYVAGON with the shipper's own bearer token
 * and holds no credential once a request ends, so a batch is posted from its
 * queue during one of this shipper's own authenticated requests — `runDue()`
 * while the drawer is open, and `listScheduledPosts()` drains opportunistically.
 * A batch armed for 06:00 goes out on their next visit after 06:00.
 *
 * That is a real limitation and the UI must say so rather than imply a cron.
 * `scheduledPost.ts` holds the copy helper for it.
 *
 * A refusal is a 200 with `ok: false`, exactly as the shipment-draft endpoint
 * answers, and for the same reason: the request was understood and it is the
 * batch that is not viable — and a non-2xx would be thrown by `gatewayFetch`
 * with `missing[]` discarded, which is the one field that can route the shipper
 * back to the control that caused it.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';
import type { ShipmentDraft } from '../createShipmentDraft';

/** A batch's lifecycle. Mirrors the gateway's `JOB_STATUSES`. */
export type ScheduledPostStatus =
  | 'scheduled'
  | 'running'
  | 'posted'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'expired';

/** One queued load's lifecycle. Mirrors the gateway's `ITEM_STATUSES`. */
export type ScheduledLoadStatus =
  | 'pending'
  | 'creating'
  | 'created'
  | 'publishing'
  | 'posted'
  | 'refused'
  | 'abandoned';

/** One unit's running total. An array, not a map, so the order is stable per render. */
export interface UnitTotal {
  unit: string;
  value: number;
}

/**
 * What was armed, projected into facts — the gateway's `summarizeBatch`.
 *
 * Present on the LIST rows, not just the detail, and that is the point: without
 * it a card can only say "2 loads, these dates", which is true of every batch
 * the shipper has ever armed. Every field is a projection of the frozen draft
 * and the measured route already on the row, so it costs no extra read and the
 * client never has to learn the draft shape to render a subtitle.
 *
 * No names in it, by design. A draft's stops and lines are record ids, so this
 * describes the SHAPE of the load — how far, how heavy, what it costs, where it
 * goes out — and never "Athens → Milan". Rendering those would mean the gateway
 * reading the Address Book once per row.
 */
export interface BatchSummary {
  stop_count: number;
  /** Pick lines only — a direct run mirrors every pick as a drop. */
  line_count: number;
  qty: UnitTotal[];
  weight: UnitTotal[];
  /** Measured by the browser at arm time. Null only for a batch that could never publish. */
  distance_km: number | null;
  drive_min: number | null;
  vehicle_type_count: number;
  /** 'public' | 'private' | 'fleet', as armed. */
  channels: string[];
  partner_count: number;
  currency: string;
  /** Per load, not per batch. Null on an always-negotiable load. */
  starting_price: number | null;
  negotiable: boolean;
  negotiable_floor: number | null;
  /** `starting_price x load_count`. */
  batch_total: number | null;
  customer_reference: string | null;
  /** The reference load 1 will really carry, already expanded from the pattern. */
  reference_sample: string | null;
  require_tracking: boolean;
  response_window: string;
}

export interface ScheduledPost {
  id: string;
  label: string | null;
  status: ScheduledPostStatus;
  template_kind: string;
  template_ref: string | null;
  load_count: number;
  posted_count: number;
  failed_count: number;
  /** ISO 8601 with an offset — a real instant. */
  fire_at: string;
  /**
   * Zone-less wall clock, `YYYY-MM-DDTHH:mm`, meant in `timezone`.
   *
   * Deliberately NOT an instant: MYVAGON materializes stop times against its
   * own zone at publish, so a value carrying an offset would be shifted twice.
   * Render these with `formatDisplayDateTime`, never through `parseUtcInstant`.
   */
  pickup_from: string;
  pickup_to: string | null;
  dropoff_from: string;
  dropoff_to: string | null;
  timezone: string;
  last_error: string | null;
  created_at: string;
  finished_at: string | null;
  summary: BatchSummary;
}

export interface ScheduledLoad {
  seq: number;
  status: ScheduledLoadStatus;
  draft_id: number | null;
  shipment_id: number | null;
  auto_id: string | null;
  reference: string | null;
  shipment_url: string | null;
  last_error: string | null;
}

export interface ScheduledPostDetail extends ScheduledPost {
  draft: ShipmentDraft;
  loads: ScheduledLoad[];
}

export interface ScheduleWindow {
  from: string;
  to?: string | null;
}

export interface ScheduleAccepted {
  ok: true;
  post: ScheduledPost;
  warnings: string[];
}

export interface ScheduleBlocked {
  ok: false;
  /** Draft/schedule field paths, earliest gap first. `missing[0]` is where to send them. */
  missing: string[];
  reason: string;
  warnings: string[];
}

export type ScheduleSubmitResponse = ScheduleAccepted | ScheduleBlocked;

export interface ScheduleRequestInput {
  conversationId?: string | null;
  label?: string | null;
  /**
   * The load to copy, fully resolved, from the wizard's own state.
   *
   * `sourceDraftId` is provenance only — the gateway records it so a batch can be
   * traced back to where it was built, and never reads it at posting time.
   * Publishing a Laravel draft consumes it, so each queued load creates its own.
   */
  template: { kind: 'wizard'; draft: ShipmentDraft; sourceDraftId?: string | null };
  loadCount: number;
  pickup: ScheduleWindow;
  dropoff: ScheduleWindow;
  /** ISO 8601 WITH an offset. Use `localPartsToUtcIso` — a bare wall clock is refused. */
  fireAt: string;
  referencePattern?: string | null;
  routeSummary?: { total_dist_km: number; total_drive_min?: number } | null;
}

export interface DrainSummary {
  jobs: number;
  posted: number;
  failed: number;
  /** Batches whose moment had passed too long ago to post honestly. */
  expired: number;
}

const json = { 'Content-Type': 'application/json' } as const;

export async function createScheduledPost(
  input: ScheduleRequestInput,
  locale?: string,
): Promise<ScheduleSubmitResponse> {
  const response = await gatewayFetch('/scheduled-posts', {
    method: 'POST',
    token: getStoredToken(),
    locale,
    headers: json,
    body: JSON.stringify(input),
  });
  return (await response.json()) as ScheduleSubmitResponse;
}

/**
 * Lists this shipper's batches.
 *
 * Also drains: any batch of theirs whose time has passed is posted during this
 * request, before the list comes back. That is how an armed batch goes out at
 * all — see the module note.
 */
export async function listScheduledPosts(
  params: { status?: ScheduledPostStatus[]; page?: number; perPage?: number } = {},
  locale?: string,
): Promise<{ items: ScheduledPost[]; total: number; page: number; per_page: number }> {
  const query = new URLSearchParams();
  for (const status of params.status ?? []) query.append('status', status);
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('per_page', String(params.perPage));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  const response = await gatewayFetch(`/scheduled-posts${suffix}`, {
    method: 'GET',
    token: getStoredToken(),
    locale,
  });
  return (await response.json()) as { items: ScheduledPost[]; total: number; page: number; per_page: number };
}

/** One batch with its per-load queue. This is where a `partial` batch is explained. */
export async function getScheduledPost(id: string, locale?: string): Promise<ScheduledPostDetail> {
  const response = await gatewayFetch(`/scheduled-posts/${encodeURIComponent(id)}`, {
    method: 'GET',
    token: getStoredToken(),
    locale,
  });
  return (await response.json()) as ScheduledPostDetail;
}

export async function updateScheduledPost(
  id: string,
  patch: {
    label?: string | null;
    loadCount?: number;
    fireAt?: string;
    pickup?: ScheduleWindow;
    dropoff?: ScheduleWindow;
    referencePattern?: string | null;
  },
  locale?: string,
): Promise<ScheduleSubmitResponse> {
  const response = await gatewayFetch(`/scheduled-posts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token: getStoredToken(),
    locale,
    headers: json,
    body: JSON.stringify(patch),
  });
  return (await response.json()) as ScheduleSubmitResponse;
}

export async function cancelScheduledPost(id: string, locale?: string): Promise<{ ok: true; status: 'cancelled' }> {
  const response = await gatewayFetch(`/scheduled-posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: getStoredToken(),
    locale,
  });
  return (await response.json()) as { ok: true; status: 'cancelled' };
}

/**
 * Posts whatever this shipper's schedules currently owe.
 *
 * Safe to call repeatedly and concurrently — the gateway claims queue items with
 * `FOR UPDATE SKIP LOCKED`, so a second call takes the next load rather than the
 * same one, and a batch with nothing due claims nothing.
 */
export async function runDueScheduledPosts(locale?: string): Promise<DrainSummary> {
  const response = await gatewayFetch('/scheduled-posts/run-due', {
    method: 'POST',
    token: getStoredToken(),
    locale,
  });
  return (await response.json()) as DrainSummary;
}

/* -------------------------------------------------------------------------- *
 * Recovering a template from a saved draft
 * -------------------------------------------------------------------------- */

export interface ScheduleTemplateAccepted {
  ok: true;
  /** The SID the shipper sees, for naming a batch after the load it copies. */
  auto_id: string;
  /** Real record ids throughout — read from MYVAGON's own draft state. */
  draft: ShipmentDraft;
  /** The road distance stored on the draft when it was created. */
  route_summary: { total_dist_km: number; total_drive_min?: number } | null;
}

export interface ScheduleTemplateBlocked {
  ok: false;
  missing: string[];
  reason: string;
}

export type ScheduleTemplateResponse = ScheduleTemplateAccepted | ScheduleTemplateBlocked;

/**
 * Reads one of the shipper's own drafts back as a batch template.
 *
 * This is what makes bulk scheduling reachable from the conversation rather than
 * only from the guided cards. The guided flow already holds a `ShipmentDraft`, so
 * its Review card hands one over directly; a load built by talking never
 * produced one, because the model proposes tool arguments and the shipper presses
 * Confirm.
 *
 * The obvious shortcut — reading the `publish_shipment` confirmation card — is
 * the one thing this feature must never do. That card is display-shaped by
 * design (`vehicle_type_names`, `partner_names`, `product_name`), and matching
 * those names back to records is how a batch posts real freight against the
 * wrong product. The gateway reads MYVAGON's own draft state instead, which
 * carries an id for every stop, line and carrier.
 *
 * Two outcomes are not errors. A draft that cannot be read back exactly answers
 * 200 with `ok: false` and a `reason` to show; a draft that has already been
 * published answers 404, because publishing consumes it — so capture the
 * template BEFORE publishing if the shipper may want copies afterwards.
 */
export async function fetchScheduleTemplate(
  draftId: number | string,
  locale?: string,
): Promise<ScheduleTemplateResponse> {
  const response = await gatewayFetch(`/scheduled-posts/template/${encodeURIComponent(String(draftId))}`, {
    token: getStoredToken(),
    locale,
  });
  return (await response.json()) as ScheduleTemplateResponse;
}
