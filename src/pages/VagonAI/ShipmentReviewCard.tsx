/**
 * ShipmentReviewCard — the finished load, ready to read.
 *
 * ## What this replaces
 *
 * `CreateShipmentFlow` put twelve cards on screen and walked the shipper through
 * them: pickup, delivery, stops, products, load, route, send-to, truck, price,
 * terms, tracking, review. Every one of those asked for something that was
 * already knowable — the route and the cargo were on the order, the channel is
 * private by definition, the truck follows from the weight, and the carrier
 * follows from the shipper's own partner record.
 *
 * The gateway assembles all of it now (`shipmentFlow/autoDraft.ts`) and sends a
 * finished draft. This card shows it. The shipper reads a load rather than
 * building one, and the only things it asks about are the gaps the assembly
 * genuinely could not fill.
 *
 * ## Sections, not steps
 *
 * Every row carries its own answer in the header — "Athens DC → Milan DC",
 * "Rigid truck · 67% full" — so the whole load reads down the closed card
 * without opening anything. A row opens in place to correct it. Nothing pages,
 * and there is no separate Review stage, because the card IS the review.
 *
 * One row open at a time. Two is the tall scrolling card this was built to get
 * rid of.
 *
 * ## The card explains itself
 *
 * A truck and a carrier were CHOSEN for the shipper, so each says why — "Rigid
 * truck chosen for 8 t, about 67% of what it holds", "Ρούσσος Α.Ε. — you have an
 * agreed rate with them on this route". A card that made decisions without
 * showing its reasoning would be asking to be trusted rather than checked, and
 * checking is the entire point of a review card.
 *
 * ## Two buttons, two bars
 *
 * Save as draft is primary and is gated on `saveIssues` — the itinerary and the
 * cargo, nothing else. Send to the carrier is secondary and gated on
 * `sendIssues` as well. A missing price must never grey out the button whose
 * whole job is to keep an unfinished load.
 *
 * Deliberately one file, like the flow it replaces: the sections share the
 * draft, the theme and the open-row state, and splitting them would mean
 * threading all three through six modules to save nothing.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState } from 'react'; import {   MapPin,
  Package,
  Truck,
  Users,
  Tag,
  Sliders,
  ChevronDown,
  AlertTriangle,
  Trash2,
  Save,
  Send,
  CircleCheck,
  ExternalLink,
  CalendarClock,
  Loader2,
  X,
  } from 'lucide-react'; import type { FlowContextEvent,
  FlowLocation,
  FlowPartner,
  FlowVehicleType } from '../../hooks/useChat'; import { canMeasureRoute,
  measureRoute,
  type RoutePoint } from './measureRoute'; import type { ThemeTokens } from '../../utils/themes'; import {   addStopAt,
  allLines,
  deliveryStop,
  draftFromSeed,
  draftWarnings,
  gapHints,
  loadTotals,
  mergeSeedIntoDraft,
  openingProductPicker,
  openingSection,
  pickupStop,
  removeStopAt,
  saveIssues,
  sectionForField,
  sectionIssues,
  sendIssues,
  setStopAt,
  stopRole,
  toggleCarrier,
  toggleVehicleType,
  toggleVehicleCategory,
  setBroadcastChannel,
  toggleTrackingOrder,
  trackingCandidates,
  setTrackingEmailsForOrder,
  syncTrackingEmailFromOrder,
  SECTIONS,
  type DraftLine,
  type SectionId,
  type ShipmentDraft,
  describeSaveBlockers,
} from './createShipmentDraft'
import { pickContractPrice, rankCarriers, type RankingChip } from './carrierRanking';
import { suggestTransportPriceFromRanking } from './suggestedTransportPrice';
import { useApp } from '../../context/AppContext';
import { ensureStopSchedules } from './applyLocationChoiceToDraft';
import { AddNewRow, Button, Field, Notes, PickRow, Shell } from './flowPrimitives';
import PickerDropdown from './PickerDropdown';
import type { PickerOption } from './pickerModel';
import CreateProductForm, { type ProductSubmitResult } from './CreateProductForm';
import CreateAddressForm, { type AddressSubmitResult, type SavedAddress } from './CreateAddressForm';
import { fetchFlowContext, type SubFlowBundle } from './api/flowContextService';
import { postDraftFieldEdits } from './api/learningEventsService';
import { ensureDraftRunId } from './api/shipmentDraftService';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductDraft } from './createProductDraft';
import { inputStyle } from './flowHelpers';
import { useTranslation } from '../../hooks/useTranslation';
import { useTr, type Tr } from './i18n';

export interface FlowSubmitResult {
  ok: boolean;
  missing?: string[];
  reason?: string;
  unsupported?: string[];
  /**
   * BL-17 — the publish timed out and the gateway could not confirm the result.
   * The server's sentence (check Manage Shipments before retrying). Neither a
   * success nor a refusal: the card shows it and locks, so there is no one-click
   * republish of a load that may already be live.
   */
  unknown?: string;
  /** Set when the load was actually written. Drives the success card. */
  done?: {
    outcome: 'draft' | 'published';
    autoId: string;
    /** An in-app path — the success card opens it in a new tab. */
    url: string;
  };
}

interface Props {
  /**
   * Narrowed to this flow's own event, not the whole union.
   *
   * `flow_context` carries a different bundle shape per flow, so accepting the
   * union here would let a product bundle — which has no `draft` — reach the
   * renderer and take the page down.
   */
  event: Extract<FlowContextEvent, { flow: 'create_shipment' }>;
  T: ThemeTokens;
  /**
   * Sends the load. `save_draft` ends with a draft; `publish` runs the full gate
   * and sends it to the carrier. Resolves to the gateway's verdict so a refusal
   * can open the row that owns the missing value. `runId` (BL-04) is this card's
   * one id, the same on every retry and on save-then-publish.
   */
  onSubmit: (
    draft: ShipmentDraft,
    intent: 'save_draft' | 'publish',
    routeSummary?: { total_dist_km: number; total_drive_min?: number },
    runId?: string,
  ) => Promise<FlowSubmitResult>;
  onSubmitProduct: (draft: ProductDraft, runId?: string) => Promise<ProductSubmitResult>;
  onSubmitAddress: (draft: Record<string, unknown>, runId?: string) => Promise<AddressSubmitResult>;
  /** Arms a bulk batch from this load instead of sending it once. */
  onSchedule?: (
    draft: ShipmentDraft,
    routeSummary?: { total_dist_km: number; total_drive_min?: number },
  ) => void;
  /** True while a turn is streaming — the card stays readable, just not tappable. */
  disabled?: boolean;
  /** Active chat id for MS3-339 field_edit learning events. */
  conversationId?: string | null;
}

/* -------------------------------------------------------------------------- *
 * Small shared pieces
 * -------------------------------------------------------------------------- */

const SECTION_META: Record<SectionId, { title: string; icon: typeof MapPin }> = {
  route: { title: 'Route', icon: MapPin },
  cargo: { title: 'Cargo', icon: Package },
  truck: { title: 'Truck', icon: Truck },
  carrier: { title: 'Carrier', icon: Users },
  price: { title: 'Price', icon: Tag },
  extras: { title: 'Options', icon: Sliders },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** `2026-09-14T08:00` as `14 Sep 08:00`. The card reads dates, it does not parse them. */
function displayDate(value: string | null, tr: Tr): string {
  if (!value) return '';
  const [date, time] = value.split('T');
  const parts = (date ?? '').split('-');
  if (parts.length !== 3) return value;
  const en = MONTHS[Number(parts[1]) - 1];
  const month = en ? tr(`vagonai.review.months.${en.toLowerCase()}`, en) : undefined;
  return `${Number(parts[2])} ${month ?? parts[1]}${time ? ` ${time}` : ''}`;
}

/** `2 pallets`, in the shipper's language; an unknown unit falls back to its code. */
function qtyLabel(unit: string, value: number, tr: Tr): string {
  if (unit === 'EUR_PALLET') return tr('vagonai.review.qty.pallets', '{{count}} pallets', { count: value });
  if (unit === 'UNIT') return tr('vagonai.review.qty.units', '{{count}} units', { count: value });
  return `${value} ${unit.toLowerCase()}`;
}

/** A weight a human reads: 8000 kg is "8 t". */
function displayWeight(kg: number): string {
  if (kg <= 0) return '—';
  return kg >= 1000 ? `${Math.round((kg / 1000) * 10) / 10} t` : `${Math.round(kg)} kg`;
}

/**
 * A truck type's subtypes, with the ids the gateway expects.
 *
 * Read off `subtypeOptions` when the gateway sends it; older bundles carry only
 * the parallel `subtypes` / `categoryIds` arrays, which are zipped instead.
 */
function subtypeOptionsOf(type: FlowVehicleType): { id: string; label: string }[] {
  if (type.subtypeOptions?.length) return type.subtypeOptions;
  return type.subtypes
    .map((label, i) => ({ id: String(type.categoryIds[i] ?? ''), label }))
    .filter((o) => o.id);
}

function totalKg(draft: ShipmentDraft): number {
  return allLines(draft)
    .filter((line) => line.action === 'pick')
    .reduce((sum, line) => sum + (line.wUnit === 'T' ? line.weight * 1000 : line.weight), 0);
}

/**
 * One row of the card.
 *
 * Inline-styled like everything in `flowPrimitives`, rather than reaching for the
 * `vai-ship-*` classes: those belong to a stylesheet this panel does not ship, so
 * a card built on them would render as unstyled markup in the one place a
 * shipper is approving real freight.
 */
function SectionRow({
  T, title, icon, summary, tone, toneLabel, open, disabled, onToggle, children,
}: {
  T: ThemeTokens;
  title: string;
  icon: React.ReactNode;
  summary: string;
  tone: 'done' | 'gap' | 'todo';
  toneLabel: string;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const toneColor = tone === 'gap' ? '#B45309' : tone === 'todo' ? T.t3 : T.ac;
  return (
    <div style={{ borderTop: `1px solid ${T.bd}` }}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        className="flex items-center w-full text-left"
        style={{ gap: 9, padding: '10px 2px', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span style={{ color: T.ac, display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block" style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{title}</span>
          <span className="block" style={{ fontSize: 13, color: T.t1, fontWeight: 600, wordBreak: 'break-word' }}>
            {summary}
          </span>
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 700, color: toneColor, flexShrink: 0,
            border: `1px solid ${tone === 'gap' ? '#B45309' : T.bd}`, borderRadius: 5, padding: '1px 6px',
          }}
        >
          {toneLabel}
        </span>
        <ChevronDown
          size={16}
          style={{ color: T.t3, flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
        />
      </button>
      {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </div>
  );
}

/**
 * The column every picker list sits in.
 *
 * Not a scroll box any more: a fixed-height list inside the card inside the
 * chat was three nested scrollbars (QA 2026-10-08). Long lists are cut to a
 * preview with a "Show all" toggle instead - see `PICK_PREVIEW`.
 */
function PickList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 5 }}>
      {children}
    </div>
  );
}

/** How many rows a picker list shows before "Show all". Chosen rows are always shown. */
const PICK_PREVIEW = 5;

function ShowAllToggle({
  T, expanded, total, disabled, onToggle, showAllLabel, showFewerLabel,
}: {
  T: ThemeTokens;
  expanded: boolean;
  total: number;
  disabled?: boolean;
  onToggle: () => void;
  showAllLabel: string;
  showFewerLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-expanded={expanded}
      className="inline-flex items-center self-start"
      style={{ gap: 4, fontSize: 11, fontWeight: 700, color: T.ac, padding: '2px 0', background: 'transparent' }}
      data-total={total}
    >
      <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
      {expanded ? showFewerLabel : showAllLabel}
    </button>
  );
}

/**
 * Gateway notes about carriers, which stop being true once the load is posted
 * publicly ("You have no active carriers... saved as a draft"). The notes are
 * free text from the gateway, so they are matched on the word in both
 * languages the gateway writes them in.
 */
const CARRIER_NOTE = /carrier|μεταφορ[έε]/iu;

/* -------------------------------------------------------------------------- *
 * The card
 * -------------------------------------------------------------------------- */

export default function ShipmentReviewCard({
  event, T, onSubmit, onSubmitProduct, onSubmitAddress, onSchedule, disabled,
  conversationId,
}: Props) {
  const bundle = event.bundle;
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const tr = useTr();
  const { locations: addressBook } = useApp();

  const seeded = useMemo(() => draftFromSeed(bundle), [bundle]);
  const [draft, setDraft] = useState<ShipmentDraft>(() => ensureStopSchedules(seeded));
  // Opens on the first row with something missing, or closed when the load is
  // ready - which is the ordinary case, and the one the card is designed around.
  // MS3-409: a private load opens on its Carrier row, so who receives it is on screen without a tap - unless
  // something that blocks Save comes first.
  const [open, setOpen] = useState<SectionId | null>(
    () => openingSection(seeded) ?? (seeded.broadcast.channels.includes('public') ? null : 'carrier'),
  );
  // And when that row is Cargo for want of a product, its picker opens too.
  const [autoProduct] = useState(() => openingProductPicker(seeded));

  /**
   * Chat answers to outstanding gaps re-emit `flow_context` with an updated
   * seed while this card is still mounted (same flow id). Merge rather than
   * replace so Save can enable from answered qty/weight without wiping edits
   * already typed on the card.
   */
  const seedFingerprint = useMemo(() => JSON.stringify(bundle.draft), [bundle.draft]);
  const lastSeedFingerprint = useRef(seedFingerprint);
  // The seed the card last merged. A field the new seed moved away from it is
  // an edit the shipper made in chat ("set price 500"), and it wins over the
  // card's current value; see `mergeSeedIntoDraft`.
  const lastSeeded = useRef(seeded);
  useEffect(() => {
    if (seedFingerprint === lastSeedFingerprint.current) return;
    lastSeedFingerprint.current = seedFingerprint;
    const previousSeed = lastSeeded.current;
    lastSeeded.current = seeded;
    setDraft((prev) => ensureStopSchedules(mergeSeedIntoDraft(prev, seeded, previousSeed)));
    setOpen((prev) => {
      const nextOpen = openingSection(seeded);
      // Prefer keeping the row they were editing; only force-open when nothing
      // was open and the new seed still has a gap.
      return prev ?? nextOpen;
    });
  }, [seedFingerprint, seeded]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState<string[]>([]);
  const [done, setDone] = useState<FlowSubmitResult['done'] | null>(null);
  /** BL-17: the gateway could not confirm the publish - its sentence, and the card stays locked. */
  const [unresolved, setUnresolved] = useState<string | null>(null);
  /** BL-04: minted on the first submit, reused for every retry of this card. */
  const runIdRef = useRef<string | null>(null);
  /** Which button is working, so that one shows a spinner rather than every button just greying out. */
  const [pending, setPending] = useState<'save_draft' | 'publish' | 'schedule' | null>(null);
  /**
   * The price field only turns red once the shipper has been in it or tried to
   * send - a card that opens with an error on a field nobody has touched reads
   * as a mistake they already made (QA 2026-10-08).
   */
  const [priceTouched, setPriceTouched] = useState(false);
  const [showAllTrucks, setShowAllTrucks] = useState(false);
  const [showAllSubtypes, setShowAllSubtypes] = useState(false);
  /** The posted load's summary under the success message, collapsed by default. */
  const [showPosted, setShowPosted] = useState(false);

  /**
   * The sub-form a gap can open: a product or a site the shipper does not have.
   *
   * Its bundle is FETCHED rather than assembled here, because the add-product
   * form needs a category catalog and the add-address form needs a company list,
   * and the shipment payload carries neither. Deliberately not a chat message:
   * that would spend a completion on a list lookup and drop a stray turn into
   * the transcript underneath a card the shipper is still using.
   */
  const [subForm, setSubForm] = useState<SubFlowBundle | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  /** Which row the sub-form was opened from, so its result lands back on that row. */
  const [bindTo, setBindTo] = useState<{ kind: 'product'; stop: number; line: number } | { kind: 'location'; stop: number } | null>(null);

  /**
   * Sites the shipper added from inside this card.
   *
   * Appended locally rather than re-fetched: the payload arrived with the turn
   * and there is no second delivery of it, so a site saved here would otherwise
   * be invisible to the very picker that opened the form.
   */
  const [addedLocations, setAddedLocations] = useState<FlowLocation[]>([]);


  const locked = Boolean(disabled) || busy || done !== null || unresolved !== null;

  const hints = useMemo(() => gapHints(bundle), [bundle]);
  const blocking = useMemo(() => saveIssues(draft, undefined, tr), [draft, tr]);
  const saveBlockers = useMemo(() => describeSaveBlockers(draft, undefined, tr), [draft, tr]);
  useEffect(() => {
    if (saveBlockers.length === 0) return;
    const fields = saveBlockers.map((b) => b.field);
    // QA instrumentation, dev-only: useful when a Save gate refuses and nobody
    // can see why, but it should not narrate a shipper's blockers into their
    // production console.
    if (import.meta.env.DEV) console.info('[MS3-334] save blockers', fields, saveBlockers);
    try {
      (window as unknown as { __MS334_SAVE_BLOCKERS__?: typeof saveBlockers }).__MS334_SAVE_BLOCKERS__ =
        saveBlockers;
    } catch {
      /* ignore */
    }
  }, [saveBlockers]);
  const outstanding = useMemo(() => sendIssues(draft, tr), [draft, tr]);
  const warnings = useMemo(() => draftWarnings(draft, tr), [draft, tr]);

  const locations = useMemo(() => {
    const bookById = new Map((addressBook ?? []).map((l) => [String(l.id), l]));
    const enrich = (loc: FlowLocation): FlowLocation => {
      const book = bookById.get(String(loc.id));
      if (!book) return loc;
      return {
        ...loc,
        group: loc.group ?? book.group ?? null,
        company: loc.company ?? book.company ?? null,
      };
    };
    return [...bundle.locations.map(enrich), ...addedLocations.map(enrich)];
  }, [bundle.locations, addedLocations, addressBook]);
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const productById = useMemo(
    () => new Map(bundle.products.map((p) => [p.id, p])),
    [bundle.products],
  );
  const partnerById = useMemo(
    () => new Map(bundle.partners.map((p) => [p.id, p])),
    [bundle.partners],
  );
  const productOptions = useMemo(
    (): PickerOption[] =>
      bundle.products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: [p.sku, p.category].filter(Boolean).join(' · ') || null,
        keywords: [p.type],
      })),
    [bundle.products],
  );

  const patch = (next: ShipmentDraft) => {
    postDraftFieldEdits({
      prev: draft,
      next,
      conversationId,
      source: 'guided_flow',
    });
    setDraft(next);
    setError(null);
  };

  async function openSubForm(kind: 'product' | 'location', bind: typeof bindTo) {
    setSubError(null);
    setBindTo(bind);
    try {
      setSubForm(await fetchFlowContext(kind));
    } catch (err) {
      setBindTo(null);
      setSubError(err instanceof Error ? err.message : t('vagonai.review.subFormFailed', 'That form could not be opened.'));
    }
  }

  /* --- summaries, which are what the closed card reads as ----------------- */

  const nameOf = (id: string) => locationById.get(id)?.name ?? '';

  const routeSummary = (() => {
    const from = pickupStop(draft);
    const to = deliveryStop(draft);
    const middle = draft.stops.length - 2;
    const ends = `${from?.locationId ? nameOf(from.locationId) : t('vagonai.review.summary.pickupNeeded', 'Pickup needed')} → ${
      to?.locationId ? nameOf(to.locationId) : t('vagonai.review.summary.deliveryNeeded', 'Delivery needed')
    }`;
    // Both ends' dates, not just the pickup's (QA 2026-10-08).
    const pickupWhen = from?.from ? displayDate(from.from, tr) : '';
    const deliveryWhen = to?.from ? displayDate(to.from, tr) : '';
    const dates = pickupWhen && deliveryWhen
      ? `${pickupWhen} → ${deliveryWhen}`
      : pickupWhen || (deliveryWhen ? `→ ${deliveryWhen}` : '');
    const when = dates ? ` · ${dates}` : '';
    const extra = middle > 0 ? ` · ${t('vagonai.review.summary.extraStops', '+{{count}} stops', { count: middle })}` : '';
    return `${ends}${extra}${when}`;
  })();

  const cargoSummary = (() => {
    const totals = loadTotals(draft);
    if (totals.lineCount === 0) return t('vagonai.review.summary.cargoEmpty', 'Nothing on the load yet');
    const qty = Object.entries(totals.qtyByUnit)
      .map(([unit, value]) => qtyLabel(unit, value, tr))
      .join(' · ');
    const lines = t('vagonai.review.summary.lines', '{{count}} lines', { count: totals.lineCount });
    return `${lines} · ${qty} · ${displayWeight(totalKg(draft))}`;
  })();

  const truckSummary = (() => {
    const chosen = draft.vehicleTypeIds[0];
    if (!chosen) return t('vagonai.review.summary.truckNotChosen', 'Not chosen');
    const label = bundle.vehicleTypes.find((v) => v.id === chosen)?.label ?? t('vagonai.review.summary.truckFallback', 'Truck');
    const suggested = bundle.suggestions.vehicle;
    return suggested && suggested.vehicleTypeId === chosen
      ? t('vagonai.review.summary.truckFull', '{{label}} · {{pct}}% full', { label, pct: suggested.utilizationPct })
      : label;
  })();

  const isPublic = draft.broadcast.channels.includes('public');

  const carrierSummary = (() => {
    if (isPublic) return t('vagonai.review.carrier.publicSummary');
    const ids = draft.broadcast.carrierPartnerIds;
    if (ids.length === 0) return t('vagonai.review.carrier.notSet');
    return ids.map((id) => partnerById.get(id)?.name ?? id).join(', ');
  })();

  /**
   * What the publish button says.
   *
   * One carrier is named, because that is the fact the shipper wants confirmed
   * before a load goes out. Several are counted rather than listed - four
   * company names do not fit on a button, and the section above already shows
   * exactly who is ticked.
   */
  const sendLabel = (() => {
    if (isPublic) return t('vagonai.review.send.public');
    const ids = draft.broadcast.carrierPartnerIds;
    const one = ids.length === 1 ? partnerById.get(ids[0]!)?.name : undefined;
    if (one) return t('vagonai.review.send.one', { name: one });
    if (ids.length > 1) return t('vagonai.review.send.many', { n: ids.length });
    return t('vagonai.review.send.none');
  })();

  const priceSummary = (() => {
    const { startingPrice, negotiable, currency } = draft.pricing;
    if (startingPrice === null) {
      return negotiable
        ? t('vagonai.review.summary.priceOpenNoFigure', 'Open to offers, no figure yet')
        : t('vagonai.review.summary.priceNotSet', 'Not set');
    }
    return negotiable
      ? t('vagonai.review.summary.priceNegotiable', '{{price}} {{currency}} · open to offers', { price: startingPrice, currency })
      : t('vagonai.review.summary.priceFixed', '{{price}} {{currency}} · fixed', { price: startingPrice, currency });
  })();

  const extrasSummary = [
    draft.requireTracking
      ? t('vagonai.review.summary.trackingRequired', 'Tracking required')
      : t('vagonai.review.summary.trackingOptional', 'Tracking optional'),
    draft.trackingOrderIds.length > 0
      ? t('vagonai.review.summary.customerLinks', '{{count}} customer links', { count: draft.trackingOrderIds.length })
      : null,
    draft.customerReference
      ? t('vagonai.review.summary.reference', 'Ref {{ref}}', { ref: draft.customerReference })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const summaries: Record<SectionId, string> = {
    route: routeSummary,
    cargo: cargoSummary,
    truck: truckSummary,
    carrier: carrierSummary,
    price: priceSummary,
    extras: extrasSummary,
  };

  /* --- submitting --------------------------------------------------------- */

  /**
   * The road distance, measured in the browser.
   *
   * Only for sending. MYVAGON refuses to publish a load with no distance and
   * nothing server-side computes one — but a DRAFT needs none, which is why
   * Save as draft never waits on this.
   */
  async function routeSummaryFor(): Promise<{ total_dist_km: number; total_drive_min?: number } | undefined> {
    const points: (RoutePoint | null)[] = draft.stops.map((stop) => {
      const site = locationById.get(stop.locationId);
      return site && site.lat !== null && site.lng !== null ? { lat: site.lat, lng: site.lng } : null;
    });
    // A site that was never geocoded has no coordinate, so the route cannot be
    // measured - and the load simply stays a draft, which is the honest outcome
    // rather than a publish that fails at the core API.
    if (!canMeasureRoute(points)) return undefined;
    try {
      const measured = await measureRoute(points);
      return { total_dist_km: measured.totalDistKm, total_drive_min: measured.totalDriveMin };
    } catch {
      return undefined;
    }
  }

  async function submit(intent: 'save_draft' | 'publish') {
    // The clicked button stays enabled to show its spinner, so a second click
    // has to be refused here instead.
    if (busy || pending || unresolved !== null) return;
    setBusy(true);
    setPending(intent);
    if (intent === 'publish') setPriceTouched(true);
    setError(null);
    try {
      const measured = intent === 'publish' ? await routeSummaryFor() : undefined;
      const result = await onSubmit(draft, intent, measured, ensureDraftRunId(runIdRef));
      setUnsupported(result.unsupported ?? []);

      if (result.unknown !== undefined) {
        setUnresolved(result.unknown);
        return;
      }

      if (!result.ok) {
        setError(result.reason ?? t('vagonai.review.saveFailed', 'That could not be saved.'));
        // Land the shipper on the row that owns the first refused field. An
        // error with no way back to the control that caused it is the failure
        // this mapping exists to prevent.
        const first = result.missing?.[0];
        if (first) setOpen(sectionForField(first));
        if (result.missing?.includes('pricing.startingPrice')) setPriceTouched(true);
        return;
      }
      if (result.done) {
        setDone(result.done);
      }
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function schedule() {
    if (!onSchedule || busy || pending) return;
    setBusy(true);
    setPending('schedule');
    setPriceTouched(true);
    try {
      onSchedule(draft, await routeSummaryFor());
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  /* --- the success card --------------------------------------------------- */

  if (done) {
    return (
      <Shell T={T}>
        <div className="flex items-start" style={{ gap: 9 }}>
          <CircleCheck size={18} style={{ color: T.ac, flexShrink: 0, marginTop: 1 }} />
          <div className="min-w-0">
            <p style={{ fontSize: 14, fontWeight: 650, color: T.t1 }}>
              {done.outcome !== 'published'
                ? t('vagonai.review.done.draftTitle', '{{id}} saved as a draft', { id: done.autoId })
                : isPublic
                  ? t('vagonai.review.done.publicTitle', '{{id}} posted to the marketplace', { id: done.autoId })
                  : t('vagonai.review.done.publishedTitle', '{{id}} sent to your carrier', { id: done.autoId })}
            </p>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 3 }}>
              {done.outcome !== 'published'
                ? t('vagonai.review.done.draftHint', 'Nobody can see it yet. Open it to send it out, or ask me to.')
                : isPublic
                  ? t('vagonai.review.done.publicHint', 'Carriers can now see it and bid. Nothing is booked until you accept a bid.')
                  : t('vagonai.review.done.publishedHint', 'It has not been booked — the carrier still has to accept it.')}
            </p>
            <a
              href={done.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
              style={{ gap: 5, marginTop: 8, fontSize: 12, fontWeight: 600, color: T.ac }}
            >
              {t('vagonai.review.done.open', 'Open the shipment')} <ExternalLink size={12} />
            </a>
            {/* What went out, so the transcript still says what was posted
                once the review is gone (QA 2026-10-08). Collapsed: the success
                line is the news, this is the receipt. */}
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowPosted((v) => !v)}
                aria-expanded={showPosted}
                className="inline-flex items-center"
                data-testid="review-done-summary-toggle"
                style={{ gap: 4, fontSize: 11, fontWeight: 700, color: T.t3, background: 'transparent', padding: 0 }}
              >
                <ChevronDown
                  size={12}
                  style={{ transform: showPosted ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
                />
                {showPosted
                  ? t('vagonai.review.done.hideSummary', 'Hide details')
                  : t('vagonai.review.done.showSummary', 'Show details')}
              </button>
              {showPosted && (
                <dl
                  data-testid="review-done-summary"
                  style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 3, marginTop: 6, fontSize: 12 }}
                >
                  {([
                    [t('vagonai.review.sections.route', 'Route'), routeSummary],
                    [t('vagonai.review.sections.cargo', 'Cargo'), cargoSummary],
                    [t('vagonai.review.sections.truck', 'Truck'), truckSummary],
                    [
                      isPublic ? t('vagonai.review.visibility.label', 'Visibility') : t('vagonai.review.sections.carrier', 'Carrier'),
                      carrierSummary,
                    ],
                    [t('vagonai.review.sections.price', 'Price'), priceSummary],
                  ] as const).map(([label, value]) => (
                    <div key={label} style={{ display: 'contents' }}>
                      <dt style={{ color: T.t3, fontWeight: 600 }}>{label}</dt>
                      <dd style={{ color: T.t1, margin: 0, wordBreak: 'break-word' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
        <Notes T={T} notes={unsupported} tone="warn" />
      </Shell>
    );
  }

  /* --- the sub-forms ------------------------------------------------------ */

  if (subForm?.flow === 'create_product' && bindTo?.kind === 'product') {
    // Rendered INSTEAD of the card, never underneath it: the picker that opened
    // this asks the same question the form answers, and leaving both on screen
    // is two interfaces competing for one value. The card is untouched behind
    // it, so cancelling returns to exactly where they were.
    return (
      <CreateProductForm
        event={{ id: `${event.id}-product`, flow: 'create_product', bundle: subForm.bundle }}
        T={T}
        onSubmit={onSubmitProduct}
        onSaved={(productId) => {
          patch(setLine(draft, bindTo.stop, bindTo.line, { productId }));
          setSubForm(null);
          setBindTo(null);
        }}
        disabled={disabled}
      />
    );
  }

  if (subForm?.flow === 'create_location' && bindTo?.kind === 'location') {
    return (
      <CreateAddressForm
        event={{ id: `${event.id}-location`, flow: 'create_location', bundle: subForm.bundle }}
        T={T}
        onSubmit={onSubmitAddress}
        onSaved={(site: SavedAddress) => {
          // `lat`/`lng` come off the form rather than the save response, which
          // does not carry them - and without them this load could be assembled
          // and then refuse to send, because only the browser can measure the
          // route and it needs a coordinate per stop.
          setAddedLocations((current) => [
            ...current,
            { id: site.id, name: site.name, city: site.city, country: site.region, role: site.role, group: 'my', company: site.name, lat: site.lat, lng: site.lng },
          ]);
          patch(setStopAt(draft, bindTo.stop, { locationId: site.id }));
          setSubForm(null);
          setBindTo(null);
        }}
        onCancel={() => {
          setSubForm(null);
          setBindTo(null);
        }}
        disabled={disabled}
      />
    );
  }

  /* --- section bodies ----------------------------------------------------- */

  const toneFor = (section: SectionId): { tone: 'done' | 'gap' | 'todo'; label: string } => {
    const issues = sectionIssues(draft, section, undefined, tr);
    if (issues.length === 0) return { tone: 'done', label: t('vagonai.review.tone.ok', 'OK') };
    const blocksSave = issues.some((issue) => blocking.some((b) => b.field === issue.field));
    return blocksSave
      ? { tone: 'gap', label: t('vagonai.review.tone.needed', 'NEEDED') }
      : { tone: 'todo', label: t('vagonai.review.tone.toSend', 'TO SEND') };
  };

  function renderRoute() {
    return (
      <div className="flex flex-col" style={{ gap: 10 }}>
        {draft.stops.map((stop, index) => {
          const leg = stopRole(stop);
          const legLabel =
            index === 0
              ? t('vagonai.review.route.pickup', 'Pickup')
              : index === draft.stops.length - 1
                ? t('vagonai.review.route.dropoff', 'Drop-off (Delivery)')
                : t('vagonai.review.route.stopN', 'Stop {{n}}', { n: index + 1 });
          const chosen = stop.locationId ? locationById.get(stop.locationId) : null;
          const hint = hints[`stops[${index}].locationId`];

          return (
            <div key={index} className="rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: 9 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>
                  {legLabel}
                  {leg === 'both' ? ` · ${t('vagonai.review.route.dropsAndCollects', 'drops & collects')}` : ''}
                </span>
                {draft.stops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => patch(removeStopAt(draft, index))}
                    disabled={locked}
                    style={{ color: '#DC2626', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Trash2 size={12} /> {t('vagonai.review.route.remove', 'Remove')}
                  </button>
                )}
              </div>

              {hint && !chosen && (
                <p style={{ fontSize: 11, color: '#B45309', marginBottom: 6 }}>
                  {t('vagonai.review.route.orderSays', 'The order says "{{hint}}" — pick the matching saved site.', { hint })}
                </p>
              )}
              <PickerDropdown
                T={T}
                testId={`ms354-location-picker-${index}`}
                options={locationOptions(
                  locations,
                  index === 0 ? 'pickup' : index === draft.stops.length - 1 ? 'delivery' : null,
                  t('vagonai.picker.otherGroup', 'Other'),
                )}
                selectedIds={stop.locationId ? [stop.locationId] : []}
                selectedLabel={
                  chosen
                    ? { title: chosen.name, subtitle: [chosen.city, chosen.country].filter(Boolean).join(', ') || null }
                    : null
                }
                onSelect={(id) => patch(setStopAt(draft, index, { locationId: id }))}
                placeholder={
                  index === 0
                    ? t('vagonai.review.route.choosePickup', 'Choose the pickup site')
                    : index === draft.stops.length - 1
                      ? t('vagonai.review.route.chooseDelivery', 'Choose the delivery site')
                      : t('vagonai.review.route.chooseStop', 'Choose a site for this stop')
                }
                searchPlaceholder={t('vagonai.review.route.searchSites', 'Search locations')}
                initialQuery={hint}
                tabs={[
                  { id: 'my', label: t('vagonai.review.route.myLocations', 'My locations'), testId: 'ms354-location-tab-my' },
                  { id: 'customer', label: t('vagonai.review.route.customerLocations', 'Customer locations'), testId: 'ms354-location-tab-customer' },
                ]}
                emptyLabel={t('vagonai.review.route.noLocationsInTab', 'No locations in this list')}
                invalid={blocking.some((issue) => issue.field === `stops[${index}].locationId`)}
                disabled={locked}
                footer={(
                  <AddNewRow
                    T={T}
                    label={t('vagonai.review.route.addSite', 'Add a new site')}
                    hint={t('vagonai.review.route.addSiteHint', 'It is saved to your Address Book')}
                    disabled={locked}
                    onClick={() => void openSubForm('location', { kind: 'location', stop: index })}
                  />
                )}
              />

              <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                <Field T={T} label={t('vagonai.review.route.opens', 'Opens')}>
                  <input
                    type="datetime-local"
                    value={stop.from}
                    onChange={(e) => patch(setStopAt(draft, index, { from: e.target.value }))}
                    disabled={locked}
                    style={inputStyle(T)}
                  />
                </Field>
                <Field T={T} label={t('vagonai.review.route.closes', 'Closes (optional)')}>
                  <input
                    type="datetime-local"
                    value={stop.to ?? ''}
                    onChange={(e) => patch(setStopAt(draft, index, { to: e.target.value || null }))}
                    disabled={locked}
                    style={inputStyle(T)}
                  />
                </Field>
              </div>
            </div>
          );
        })}

        <AddNewRow
          T={T}
          label={t('vagonai.review.route.addStop', 'Add a stop in between')}
          hint={t('vagonai.review.route.addStopHint', 'For a load that collects or delivers on the way')}
          disabled={locked}
          onClick={() => patch(addStopAt(draft, Math.max(1, draft.stops.length - 1)))}
        />
      </div>
    );
  }

  function renderCargo() {
    return (
      <div className="flex flex-col" style={{ gap: 10 }}>
        {draft.stops.map((stop, stopIndex) =>
          stop.lines.map((line, lineIndex) => {
            const product = line.productId ? productById.get(line.productId) : null;
            const hint = hints[`stops[${stopIndex}].lines[${lineIndex}].productId`];
            const where =
              stopIndex === 0
                ? t('vagonai.review.cargo.collectedAt', 'Pickup at stop {{n}}', { n: stopIndex + 1 })
                : t('vagonai.review.cargo.deliveredAt', 'Drop-off at stop {{n}}', { n: stopIndex + 1 });

            return (
              <div key={`${stopIndex}-${lineIndex}`} className="rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: 9 }}>
                <span className="block" style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 6 }}>
                  {where}
                </span>

                {hint && !product && (
                  <p style={{ fontSize: 11, color: '#B45309', marginBottom: 6 }}>
                    {t(
                      'vagonai.review.cargo.notInProductMaster',
                      '“{{hint}}” is not in your Product Master yet — pick it or add it.',
                      { hint },
                    )}
                  </p>
                )}
                <PickerDropdown
                  T={T}
                  testId={`ms354-product-picker-${stopIndex}-${lineIndex}`}
                  options={productOptions}
                  selectedIds={line.productId ? [line.productId] : []}
                  onSelect={(id) => patch(setLine(draft, stopIndex, lineIndex, { productId: id }))}
                  placeholder={t('vagonai.review.cargo.chooseProduct', 'Choose a product')}
                  searchPlaceholder={t('vagonai.review.cargo.searchProducts', 'Search your products')}
                  initialQuery={hint}
                  invalid={Boolean(hint) && !product}
                  autoOpen={autoProduct?.stop === stopIndex && autoProduct.line === lineIndex}
                  disabled={locked}
                  footer={(
                    <AddNewRow
                      T={T}
                      label={t('vagonai.review.cargo.addProduct', 'Add a new product')}
                      hint={t('vagonai.review.cargo.addProductHint', 'It is saved to your Product Master')}
                      disabled={locked}
                      onClick={() => void openSubForm('product', { kind: 'product', stop: stopIndex, line: lineIndex })}
                    />
                  )}
                />

                <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                  <Field T={T} label={t('vagonai.review.cargo.quantity', 'Quantity')}>
                    <input
                      type="number"
                      min={0}
                      value={line.qty || ''}
                      onChange={(e) => patch(setLine(draft, stopIndex, lineIndex, { qty: Number(e.target.value) }))}
                      disabled={locked}
                      style={inputStyle(T)}
                    />
                  </Field>
                  <Field T={T} label={t('vagonai.review.cargo.unit', 'Unit')}>
                    <select
                      value={line.unit}
                      onChange={(e) => patch(setLine(draft, stopIndex, lineIndex, { unit: e.target.value as DraftLine['unit'] }))}
                      disabled={locked}
                      style={inputStyle(T)}
                    >
                      <option value="EUR_PALLET">{t('vagonai.review.cargo.unitPallets', 'EUR pallets')}</option>
                      <option value="UNIT">{t('vagonai.review.cargo.unitUnits', 'Units')}</option>
                    </select>
                  </Field>
                  <Field T={T} label={t('vagonai.review.cargo.weight', 'Weight')}>
                    <input
                      type="number"
                      min={0}
                      value={line.weight || ''}
                      onChange={(e) => patch(setLine(draft, stopIndex, lineIndex, { weight: Number(e.target.value) }))}
                      disabled={locked}
                      style={inputStyle(T)}
                    />
                  </Field>
                  <Field T={T} label={t('vagonai.review.cargo.weightUnit', 'Weight unit')}>
                    <select
                      value={line.wUnit}
                      onChange={(e) => patch(setLine(draft, stopIndex, lineIndex, { wUnit: e.target.value as DraftLine['wUnit'] }))}
                      disabled={locked}
                      style={inputStyle(T)}
                    >
                      <option value="KG">{t('vagonai.review.cargo.unitKg', 'Kg')}</option>
                      <option value="T">{t('vagonai.review.cargo.unitTonnes', 'Tonnes')}</option>
                    </select>
                  </Field>
                </div>

              </div>
            );
          }),
        )}
      </div>
    );
  }

  function renderTruck() {
    const weightKg = totalKg(draft);
    const suggested = bundle.suggestions.vehicle;
    // A preview rather than a scroll box; the chosen and the suggested type are
    // never hidden behind "Show all".
    const previewTypes = bundle.vehicleTypes.filter(
      (type, i) => i < PICK_PREVIEW || draft.vehicleTypeIds.includes(type.id) || suggested?.vehicleTypeId === type.id,
    );
    const shownTypes = showAllTrucks ? bundle.vehicleTypes : previewTypes;
    const subtypeRows = bundle.vehicleTypes.flatMap((type) =>
      draft.vehicleTypeIds.includes(type.id) ? subtypeOptionsOf(type).map((opt) => ({ type, opt })) : [],
    );
    const previewSubtypes = subtypeRows.filter(
      ({ opt }, i) => i < PICK_PREVIEW || draft.vehicleCategoryIds.includes(opt.id),
    );
    const shownSubtypes = showAllSubtypes ? subtypeRows : previewSubtypes;
    const showAllLabel = (count: number) => t('vagonai.review.showAll', 'Show all ({{count}})', { count });
    const showFewerLabel = t('vagonai.review.showFewer', 'Show fewer');

    return (
      <div className="flex flex-col" style={{ gap: 8 }}>
        {suggested ? (
          <p style={{ fontSize: 12, color: T.t3 }}>{suggested.rationale}</p>
        ) : (
          <p style={{ fontSize: 12, color: '#B45309' }}>
            The truck could not be worked out from this load — pick one.
          </p>
        )}
        <PickList>
          {shownTypes.map((type) => {
            const chosen = draft.vehicleTypeIds.includes(type.id);
            const isSuggested = suggested?.vehicleTypeId === type.id;
            return (
              <PickRow
                key={type.id}
                T={T}
                title={type.label}
                subtitle={
                  isSuggested && weightKg > 0
                    ? `${suggested.utilizationPct}% full at ${displayWeight(weightKg)}`
                    : type.subtypes.slice(0, 3).join(', ') || null
                }
                badge={isSuggested ? t('vagonai.review.badge.suggested') : undefined}
                selected={chosen}
                disabled={locked}
                // MS3-347: multi-select trailer types (e.g. Semi + Truckload).
                // Its subtypes go with it when it is switched off.
                onClick={() =>
                  patch(toggleVehicleType(draft, type.id, subtypeOptionsOf(type).map((o) => o.id)))
                }
              />
            );
          })}
        </PickList>
        {previewTypes.length < bundle.vehicleTypes.length && (
          <ShowAllToggle
            T={T}
            expanded={showAllTrucks}
            total={bundle.vehicleTypes.length}
            onToggle={() => setShowAllTrucks((v) => !v)}
            showAllLabel={showAllLabel(bundle.vehicleTypes.length)}
            showFewerLabel={showFewerLabel}
          />
        )}
        {subtypeRows.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <span className="block" style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 6 }}>
              {t('vagonai.review.truck.subtypesHeading')}
            </span>
            <PickList>
              {shownSubtypes.map(({ type, opt }) => {
                const chosen = draft.vehicleCategoryIds.includes(opt.id);
                return (
                  <PickRow
                    key={`${type.id}-${opt.id}`}
                    T={T}
                    title={opt.label}
                    subtitle={type.label}
                    selected={chosen}
                    disabled={locked}
                    onClick={() => patch(toggleVehicleCategory(draft, opt.id))}
                  />
                );
              })}
            </PickList>
            {previewSubtypes.length < subtypeRows.length && (
              <div style={{ marginTop: 5 }}>
                <ShowAllToggle
                  T={T}
                  expanded={showAllSubtypes}
                  total={subtypeRows.length}
                  onToggle={() => setShowAllSubtypes((v) => !v)}
                  showAllLabel={showAllLabel(subtypeRows.length)}
                  showFewerLabel={showFewerLabel}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderCarrier() {
    const originLoc = bundle.locations.find((l) => l.id === draft.stops[0]?.locationId);
    const destLoc = bundle.locations.find(
      (l) => l.id === draft.stops[draft.stops.length - 1]?.locationId,
    );
    const originCity = originLoc?.city ?? null;
    const destinationCity = destLoc?.city ?? null;

    const ranked = rankCarriers(
      bundle.partners.map((p) => ({
        id: p.id,
        name: p.name,
        preferred: p.preferred,
        trips: p.trips,
        rating: p.rating,
        contractLanes: p.contractLanes,
      })),
      originCity,
      destinationCity,
    );
    const rankedById = new Map(ranked.map((r) => [r.partner.id, r]));
    const suggestion = bundle.suggestions.partner;

    const ordered = ranked
      .map((r) => bundle.partners.find((p) => p.id === r.partner.id))
      .filter((p): p is FlowPartner => Boolean(p));

    const selectedIds = draft.broadcast.carrierPartnerIds;

    const selectCarrier = (partnerId: string) => {
      const next = toggleCarrier(draft, partnerId);
      const nowOn = next.broadcast.carrierPartnerIds.includes(partnerId);
      if (!nowOn) {
        patch(next);
        return;
      }
      // MS3-348: auto-fill asking price from a matching contract / price-list lane.
      // Never overwrite a figure the shipper already typed.
      if (draft.pricing.startingPrice != null && draft.pricing.startingPrice > 0) {
        patch(next);
        return;
      }
      const partner = bundle.partners.find((p) => p.id === partnerId);
      if (!partner) {
        patch(next);
        return;
      }
      const price = pickContractPrice(
        {
          id: partner.id,
          name: partner.name,
          preferred: partner.preferred,
          trips: partner.trips,
          rating: partner.rating,
          contractLanes: partner.contractLanes,
        },
        originCity,
        destinationCity,
      );
      if (price == null) {
        patch(next);
        return;
      }
      patch({
        ...next,
        pricing: { ...next.pricing, startingPrice: price },
      });
    };

    // "Lane history" is scored from the partner's loads with this shipper as a
    // whole - the partner list carries no per-lane count - so it is shown as the
    // count it really is rather than as a claim about this route.
    const chipLabel = (chip: RankingChip, trips: number | undefined) =>
      chip === 'Contract price'
        ? t('vagonai.review.carrier.chipContract')
        : chip === 'Favorite'
          ? t('vagonai.review.carrier.chipFavorite')
          : t('vagonai.review.carrier.chipHistory', { count: trips ?? 0 });
    const chipText = (chips: RankingChip[], trips: number | undefined) =>
      chips.length > 0 ? chips.map((chip) => chipLabel(chip, trips)).join(' · ') : null;

    return (
      <div className="flex flex-col" style={{ gap: 8 }} data-testid="ms348-carrier-section">
        <p style={{ fontSize: 12, color: T.t3 }}>{t('vagonai.review.carrier.ownCarriersHint')}</p>
        {originCity && destinationCity ? (
          <p style={{ fontSize: 11.5, color: T.t3 }} data-testid="ms348-rank-hint">
            {t('vagonai.review.carrier.rankHint', { origin: originCity, destination: destinationCity })}
          </p>
        ) : null}
        {selectedIds.length > 0 && (
          <span data-testid="ms3-carrier-count" style={{ fontSize: 11.5, color: T.t3 }}>
            {t('vagonai.review.carrier.selectedCount', { count: selectedIds.length })}
          </span>
        )}
        {bundle.partners.length === 0 ? (
          <p style={{ fontSize: 12, color: "#B45309" }}>{t('vagonai.review.carrier.noCarriers')}</p>
        ) : (
          <PickerDropdown
            T={T}
            testId="ms348-carrier-picker"
            multiple
            options={ordered.map((partner: FlowPartner, index: number): PickerOption => {
              const rankedRow = rankedById.get(partner.id);
              const chips = rankedRow?.chips ?? [];
              // The gateway's own reason, when it picked this carrier. The
              // ranker's `reason` is not used here: it restates the name and
              // would crowd out the id and rating a shipper scans for.
              const reason = suggestion?.partnerId === partner.id ? suggestion.reason : null;
              const isTop = index === 0 && (rankedRow?.score ?? 0) > 0;
              return {
                id: partner.id,
                title: partner.name,
                subtitle:
                  chipText(chips, partner.trips) ??
                  reason ??
                  ([partner.uniqueId, partner.rating ? `★ ${partner.rating}` : null]
                    .filter(Boolean)
                    .join(' · ') || null),
                badge:
                  suggestion?.partnerId === partner.id
                    ? suggestion.named
                      ? t('vagonai.review.badge.youAskedFor')
                      : t('vagonai.review.badge.suggested')
                    : isTop
                      ? t('vagonai.review.badge.topMatch')
                      : undefined,
                keywords: [partner.uniqueId],
              };
            })}
            selectedIds={selectedIds}
            onSelect={selectCarrier}
            onClear={() => patch({ ...draft, broadcast: { ...draft.broadcast, carrierPartnerIds: [] } })}
            placeholder={t('vagonai.review.carrier.choose', 'Choose carriers to send it to')}
            searchPlaceholder={t('vagonai.review.carrier.searchPlaceholder')}
            invalid={outstanding.some((issue) => issue.field === 'broadcast.carrierPartnerIds')}
            disabled={locked}
          />
        )}
        {/* MS3-409: who receives the load, listed under the picker - each one removable, no need to open it. */}
        {selectedIds.length > 0 && (
          <ul className="flex flex-wrap" style={{ gap: 6, listStyle: 'none', margin: 0, padding: 0 }} data-testid="ms409-carrier-chips">
            {selectedIds.map((id) => {
              const partner = bundle.partners.find((p) => p.id === id);
              const name = partner?.name ?? id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={locked}
                    data-testid={`ms409-carrier-chip-${id}`}
                    aria-label={t('vagonai.review.carrier.remove', 'Remove {{name}}', { name })}
                    onClick={() => selectCarrier(id)}
                    className="inline-flex items-center"
                    style={{
                      gap: 4, minHeight: 32, padding: '4px 10px', fontSize: 12, borderRadius: 999,
                      border: `1px solid ${T.bd}`, background: T.al, color: T.t1, cursor: locked ? 'default' : 'pointer',
                    }}
                  >
                    <span>{name}</span>
                    {!locked && <X size={12} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  function renderPrice() {
    const priceMissing = !(draft.pricing.startingPrice && draft.pricing.startingPrice > 0);
    const priceRequiredForSend = outstanding.some((i) => i.field === 'pricing.startingPrice');
    const needsPrice = priceMissing && (priceRequiredForSend || !draft.pricing.negotiable);
    // Red only once the shipper has been in the field or tried to send.
    const showRequired = needsPrice && priceTouched;

    const originLoc = locations.find((l) => l.id === draft.stops[0]?.locationId);
    const destLoc = locations.find((l) => l.id === draft.stops[draft.stops.length - 1]?.locationId);
    const rankedForPrice = rankCarriers(
      bundle.partners.map((p) => ({
        id: p.id,
        name: p.name,
        preferred: p.preferred,
        trips: p.trips,
        rating: p.rating,
        contractLanes: p.contractLanes,
      })),
      originLoc?.city ?? null,
      destLoc?.city ?? null,
    );
    const suggestion = suggestTransportPriceFromRanking(rankedForPrice.map((r) => r.lanePrice));
    const orderValueSum = (bundle.orders ?? []).reduce((acc, o) => {
      const v = (o as { orderValue?: number | null }).orderValue;
      return acc + (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    }, 0);

    const applySuggested = (price: number | null) => {
      if (price == null || locked) return;
      patch({
        ...draft,
        pricing: { ...draft.pricing, startingPrice: price },
      });
    };

    return (
      <div className="flex flex-col" style={{ gap: 8 }} data-testid="ms347-price-section">
        <div
          className="rounded-lg"
          data-testid="ms354-ai-transport-price"
          style={{ border: `1px solid ${T.bd}`, padding: 9, background: 'rgba(14,165,233,0.06)' }}
        >
          <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.t1 }}>
              {t('vagonai.review.price.suggestedTitle', 'AI suggested transport price')}
            </span>
            <span
              data-testid="ms354-not-order-value"
              style={{ fontSize: 9, fontWeight: 700, color: '#0369A1', letterSpacing: 0.3 }}
            >
              {t('vagonai.review.price.suggestedNotOrderValue', 'Not order value')}
            </span>
          </div>
          <p style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>
            {t(
              'vagonai.review.price.suggestedHint',
              'Suggested ask for the haul — not the order value. Built from your price lists and lane history on this route.',
            )}
          </p>
          {suggestion.sampleSize === 0 ? (
            <p style={{ fontSize: 11, color: T.t3 }}>
              {t(
                'vagonai.review.price.noSuggestion',
                'No lane prices yet for this route — type an ask or pick a contracted carrier.',
              )}
            </p>
          ) : (
            <div className="flex flex-wrap" style={{ gap: 6 }} data-testid="ms354-ai-price-chips">
              {(
                [
                  { key: 'attractive', label: t('vagonai.review.price.applyAttractive', 'Attractive'), price: suggestion.attractive },
                  { key: 'market', label: t('vagonai.review.price.applyMarket', 'Market'), price: suggestion.market },
                  { key: 'conservative', label: t('vagonai.review.price.applyConservative', 'Conservative'), price: suggestion.conservative },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={locked || opt.price == null}
                  data-testid={`ms354-ai-price-${opt.key}`}
                  onClick={() => applySuggested(opt.price)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 6,
                    border: `1px solid ${T.bd}`, background: T.sf, color: T.t1,
                    cursor: locked ? 'default' : 'pointer',
                  }}
                >
                  {opt.label}: {opt.price} {draft.pricing.currency}
                </button>
              ))}
            </div>
          )}
          <p style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>{suggestion.sourceLabel}</p>
          {orderValueSum > 0 && (
            <p style={{ fontSize: 10, color: T.t3, marginTop: 4 }} data-testid="ms354-order-value-note">
              {t('vagonai.review.price.orderValueNote', 'Order value (records only)')}: {orderValueSum} {draft.pricing.currency}
            </p>
          )}
        </div>

        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <Field
            T={T}
            label={t('vagonai.review.price.asking', { currency: draft.pricing.currency })}
            required={needsPrice}
            invalid={showRequired}
          >
            <input
              type="number"
              min={0}
              value={draft.pricing.startingPrice ?? ''}
              onChange={(e) => {
                setPriceTouched(true);
                patch({
                  ...draft,
                  pricing: { ...draft.pricing, startingPrice: e.target.value === '' ? null : Number(e.target.value) },
                });
              }}
              onBlur={() => setPriceTouched(true)}
              disabled={locked}
              aria-invalid={showRequired}
              data-testid="ms347-price-input"
              style={inputStyle(T, { invalid: showRequired })}
            />
          </Field>
        </div>
        <label className="flex items-center" style={{ gap: 7, fontSize: 12, color: T.t2 }}>
          <input
            type="checkbox"
            checked={draft.pricing.negotiable}
            onChange={(e) => patch({ ...draft, pricing: { ...draft.pricing, negotiable: e.target.checked } })}
            disabled={locked}
          />
          {t('vagonai.review.price.negotiable')}
        </label>
        <p style={{ fontSize: 11, color: showRequired ? '#DC2626' : T.t3 }}>
          {needsPrice ? t('vagonai.review.price.required') : t('vagonai.review.price.optional')}
        </p>
      </div>
    );
  }

  function renderExtras() {
    const candidates = trackingCandidates(draft, bundle);
    return (
      <div className="flex flex-col" style={{ gap: 10 }} data-testid="ms354-tracking-section">
        <div
          className="rounded-lg"
          data-testid="ms354-live-nav"
          style={{ border: `1px solid ${T.bd}`, padding: 9 }}
        >
          <label className="flex items-start" style={{ gap: 7, fontSize: 12, color: T.t2 }}>
            <input
              type="checkbox"
              checked={draft.requireTracking}
              onChange={(e) => patch({ ...draft, requireTracking: e.target.checked })}
              disabled={locked}
              style={{ marginTop: 2 }}
              data-testid="ms354-live-nav-toggle"
            />
            <span>
              {t('vagonai.review.extras.liveNav', 'Live navigation required')}
              <span className="block" style={{ fontSize: 11, color: T.t3 }}>
                {t(
                  'vagonai.review.extras.liveNavHint',
                  'Require live GPS navigation for this shipment. The carrier must execute the trip in the app.',
                )}
              </span>
            </span>
          </label>
        </div>

        <div
          className="rounded-lg"
          data-testid="ms354-receiver-tracking"
          style={{ border: `1px solid ${T.bd}`, padding: 9 }}
        >
          <span className="block" style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 4 }}>
            {t('vagonai.review.extras.receiverLinks', 'Receiver tracking link(s)')}
          </span>
          <p style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>
            {t(
              'vagonai.review.extras.receiverLinksHint',
              'Send a tracking link to the receiver. Sync from drop-off / order, or add more emails.',
            )}
          </p>
          {candidates.length === 0 ? (
            <p style={{ fontSize: 11, color: T.t3 }}>
              {t('vagonai.review.extras.noReceivers', 'Link cargo to an order to configure receiver tracking links.')}
            </p>
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {candidates.map((candidate) => {
                const emails = draft.trackingEmails[candidate.orderId] ?? (candidate.email ? [candidate.email] : ['']);
                return (
                  <div key={candidate.orderId} style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 8 }}>
                    <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 6 }}>
                      <span className="min-w-0">
                        <span className="block" style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                          {candidate.customerName}
                        </span>
                        <span className="block" style={{ fontSize: 10, color: T.t3 }}>{candidate.reference}</span>
                      </span>
                      <button
                        type="button"
                        disabled={locked || !candidate.email}
                        data-testid={`ms354-sync-dropoff-${candidate.orderId}`}
                        onClick={() => patch(syncTrackingEmailFromOrder(draft, bundle, candidate.orderId))}
                        style={{ fontSize: 10, fontWeight: 700, color: T.ac, flexShrink: 0 }}
                      >
                        {t('vagonai.review.extras.syncFromDropoff', 'Sync from drop-off')}
                      </button>
                    </div>
                    <div className="flex flex-col" style={{ gap: 6 }}>
                      {emails.map((em, emIdx) => (
                        <div key={emIdx} className="flex" style={{ gap: 6 }}>
                          <input
                            type="email"
                            value={em}
                            disabled={locked}
                            placeholder="email@example.com"
                            data-testid={`ms354-tracking-email-${candidate.orderId}-${emIdx}`}
                            onChange={(e) => {
                              const next = [...emails];
                              next[emIdx] = e.target.value;
                              patch(setTrackingEmailsForOrder(draft, candidate.orderId, next));
                            }}
                            style={{ ...inputStyle(T), flex: 1 }}
                          />
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => {
                              const next = emails.filter((_, i) => i !== emIdx);
                              patch(setTrackingEmailsForOrder(draft, candidate.orderId, next.length ? next : ['']));
                            }}
                            style={{ fontSize: 12, color: '#DC2626', padding: '0 6px' }}
                            aria-label="Remove email"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={locked}
                      data-testid={`ms354-add-email-${candidate.orderId}`}
                      onClick={() =>
                        patch(setTrackingEmailsForOrder(draft, candidate.orderId, [...emails, '']))
                      }
                      style={{
                        marginTop: 6, width: '100%', fontSize: 10, fontWeight: 700, color: T.ac,
                        border: `1px dashed ${T.bd}`, borderRadius: 6, padding: '6px 0', background: 'transparent',
                      }}
                    >
                      {t('vagonai.review.extras.addEmail', '+ Add email')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const BODY: Record<SectionId, () => React.ReactNode> = {
    route: renderRoute,
    cargo: renderCargo,
    truck: renderTruck,
    carrier: renderCarrier,
    price: renderPrice,
    extras: renderExtras,
  };

  /* --- the card ----------------------------------------------------------- */

  const fromOrders = bundle.orders.length > 0;
  const headline =
    blocking.length === 0
      ? t('vagonai.review.readyToSave', 'Ready to save')
      : t('vagonai.review.thingsNeeded', '{{count}} thing still needed', {
          count: blocking.length,
        });
  return (
    <Shell T={T}>
      <div className="flex items-start justify-between" style={{ gap: 10, marginBottom: 8 }}>
        <div className="min-w-0">
          <p style={{ fontSize: 14, fontWeight: 650, color: T.t1 }}>
            {fromOrders
              ? t('vagonai.review.fromOrders', 'Shipment from order {{refs}}', {
                  count: bundle.orders.length,
                  refs: bundle.orders.map((o) => o.reference).join(', '),
                })
              : t('vagonai.review.readyTitle', 'Shipment ready to review')}
          </p>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
            {fromOrders ? `${bundle.orders[0]?.customerName ?? ''} · ${headline}` : headline}
          </p>
        </div>
        <div
          role="group"
          aria-label={t('vagonai.review.visibility.label')}
          data-testid="ms347-visibility-toggle"
          style={{ display: 'inline-flex', flexShrink: 0, border: `1px solid ${T.bd}`, borderRadius: 6, overflow: 'hidden' }}
        >
          {(['private', 'public'] as const).map((ch) => {
            const on = draft.broadcast.channels[0] === ch || (ch === 'private' && !draft.broadcast.channels.includes('public'));
            return (
              <button
                key={ch}
                type="button"
                disabled={locked}
                aria-pressed={on}
                data-testid={`ms347-visibility-${ch}`}
                onClick={() => {
                  patch(setBroadcastChannel(draft, ch));
                  if (ch === 'private') setOpen('carrier');
                }}
                style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', border: 0, cursor: locked ? 'default' : 'pointer',
                  background: on ? (ch === 'public' ? 'rgba(14,165,233,0.18)' : 'rgba(34,197,94,0.18)') : 'transparent',
                  color: on ? T.t1 : T.t3,
                }}
              >
                {t(`vagonai.review.visibility.${ch}`)}
              </button>
            );
          })}
        </div>
      </div>

      {SECTIONS.filter((section) => !(section === 'carrier' && isPublic)).map((section) => {
        const meta = SECTION_META[section];
        const Icon = meta.icon;
        const tone = toneFor(section);
        return (
          <SectionRow
            key={section}
            T={T}
            title={t(`vagonai.review.sections.${section}`, meta.title)}
            icon={<Icon size={15} />}
            summary={summaries[section]}
            tone={tone.tone}
            toneLabel={tone.label}
            open={open === section}
            disabled={locked}
            onToggle={() => setOpen(open === section ? null : section)}
          >
            {BODY[section]()}
          </SectionRow>
        );
      })}

      {/* A public post goes to no carrier of theirs, so notes about their
          carriers ("no active carriers... saved as a draft") are hidden with
          the Carrier row (QA 2026-10-08). */}
      <Notes T={T} notes={isPublic ? bundle.notes.filter((note) => !CARRIER_NOTE.test(note)) : bundle.notes} />
      <Notes T={T} notes={warnings} tone="warn" />
      {subError && <Notes T={T} notes={[subError]} tone="warn" />}
      {error && (
        <p className="flex items-start" style={{ gap: 5, fontSize: 12, color: '#B45309', marginTop: 8 }}>
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </p>
      )}
      {unresolved !== null && (
        <p
          role="status"
          data-testid="review-outcome-unknown"
          className="flex items-start"
          style={{ gap: 5, fontSize: 12, color: '#B45309', marginTop: 8 }}
        >
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{unresolved}</span>
        </p>
      )}

      
      {saveBlockers.length > 0 && (
        <ul
          data-testid="ms332-save-blockers"
          style={{ fontSize: 11, color: '#B45309', marginTop: 8, paddingLeft: 16 }}
        >
          {/* The message alone, in the shipper's language - it already names the
              stop and line. The validator path ("stops[0].locationId") meant
              nothing to a shipper (QA 2026-10-10); it is still the key and the
              data-field for tests and the console. */}
          {saveBlockers.map((b) => (
            <li key={b.field} data-field={b.field}>
              {b.message}
            </li>
          ))}
        </ul>
      )}
<div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 12 }}>
        {/* The working button keeps its colour and shows a spinner; the others
            grey out. `submit` refuses a second click while one is pending. */}
        <Button
          T={T}
          onClick={() => submit('save_draft')}
          disabled={pending !== 'save_draft' && (locked || blocking.length > 0)}
          aria-busy={pending === 'save_draft'}
          data-save-blockers={saveBlockers.map((b) => b.field).join(',')}
          data-testid="ms332-save-draft"
          icon={pending === 'save_draft' ? <Loader2 size={13} className="vai-spin" /> : <Save size={13} />}
        >
          {pending === 'save_draft' ? t('vagonai.review.saving', 'Saving…') : t('vagonai.review.saveAsDraft', 'Save draft')}
        </Button>
        <Button
          T={T}
          variant="ghost"
          onClick={() => submit('publish')}
          disabled={pending !== 'publish' && (locked || blocking.length > 0 || outstanding.length > 0)}
          aria-busy={pending === 'publish'}
          icon={pending === 'publish' ? <Loader2 size={13} className="vai-spin" /> : <Send size={13} />}
        >
          {pending === 'publish'
            ? isPublic
              ? t('vagonai.review.posting', 'Posting…')
              : t('vagonai.review.sending', 'Sending…')
            : sendLabel}
        </Button>
        {onSchedule && (
          <Button
            T={T}
            variant="ghost"
            onClick={schedule}
            // A batch posts from the queue to named carriers only - the gateway
            // refuses copies of a public load, so the button says so up front.
            disabled={pending !== 'schedule' && (locked || blocking.length > 0 || outstanding.length > 0 || isPublic)}
            aria-busy={pending === 'schedule'}
            title={isPublic ? t('vagonai.review.schedulePublicBlocked') : undefined}
            icon={pending === 'schedule' ? <Loader2 size={13} className="vai-spin" /> : <CalendarClock size={13} />}
          >
            {t('vagonai.review.scheduleCopies')}
          </Button>
        )}
      </div>

      {blocking.length === 0 && outstanding.length > 0 && (
        <p style={{ fontSize: 11, color: T.t3, marginTop: 8 }}>
          {t('vagonai.review.savingWorks', 'Saving works now. To send it you still need: {{needs}}', {
            needs: outstanding.map((issue) => issue.message).join(' '),
          })}
        </p>
      )}
      {onSchedule && isPublic && blocking.length === 0 && outstanding.length === 0 && (
        <p style={{ fontSize: 11, color: T.t3, marginTop: 8 }}>{t('vagonai.review.schedulePublicBlocked')}</p>
      )}
    </Shell>
  );
}

/* -------------------------------------------------------------------------- *
 * Helpers
 * -------------------------------------------------------------------------- */

/** Writes one cargo line, keeping everything else on the load exactly as it is. */
function setLine(
  draft: ShipmentDraft,
  stopIndex: number,
  lineIndex: number,
  patchLine: Partial<DraftLine>,
): ShipmentDraft {
  return {
    ...draft,
    stops: draft.stops.map((stop, i) =>
      i === stopIndex
        ? { ...stop, lines: stop.lines.map((line, j) => (j === lineIndex ? { ...line, ...patchLine } : line)) }
        : stop,
    ),
  };
}

/**
 * The sites a stop's picker offers, as dropdown rows.
 *
 * Grouped under their company and split across the My / Customer tabs. A site
 * whose role rules it out of this leg (a delivery-only site at the pickup) is
 * left out. Nothing else is: every remaining site is reachable, however many
 * there are.
 */
function locationOptions(
  rows: FlowLocation[],
  leg: 'pickup' | 'delivery' | null,
  otherGroup: string,
): PickerOption[] {
  return rows
    .filter((row) => !(leg === 'pickup' && row.role === 'delivery') && !(leg === 'delivery' && row.role === 'pickup'))
    .map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: [row.city, row.country].filter(Boolean).join(', ') || null,
      group: (row.company ?? '').trim() || otherGroup,
      tab: row.group === 'customer' ? 'customer' : 'my',
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
}
