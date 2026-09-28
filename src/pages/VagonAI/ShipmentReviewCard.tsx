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
  Search,
  } from 'lucide-react'; import type { FlowContextEvent,
  FlowLocation,
  FlowProduct,
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
  SECTIONS,
  type DraftLine,
  type SectionId,
  type ShipmentDraft,
  describeSaveBlockers,
} from './createShipmentDraft'
import { pickContractPrice, rankCarriers, type RankingChip } from './carrierRanking';
import { ensureStopSchedules } from './applyLocationChoiceToDraft';
import { AddNewRow, Button, Field, Notes, PickRow, Shell } from './flowPrimitives';
import CreateProductForm, { type ProductSubmitResult } from './CreateProductForm';
import CreateAddressForm, { type AddressSubmitResult, type SavedAddress } from './CreateAddressForm';
import { fetchFlowContext, type SubFlowBundle } from './api/flowContextService';
import { postDraftFieldEdits } from './api/learningEventsService';
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
   * can open the row that owns the missing value.
   */
  onSubmit: (
    draft: ShipmentDraft,
    intent: 'save_draft' | 'publish',
    routeSummary?: { total_dist_km: number; total_drive_min?: number },
  ) => Promise<FlowSubmitResult>;
  onSubmitProduct: (draft: ProductDraft) => Promise<ProductSubmitResult>;
  onSubmitAddress: (draft: Record<string, unknown>) => Promise<AddressSubmitResult>;
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

/** A search box over a picker's own list. */
function SearchBox({ T, value, onChange, placeholder }: { T: ThemeTokens; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: '0 8px', gap: 6, marginBottom: 6 }}>
      <Search size={13} style={{ color: T.t3, flexShrink: 0 }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle(T), border: 'none', background: 'transparent', padding: '7px 0' }}
      />
    </div>
  );
}

/** The scroll box every picker sits in, so no list can take over the card. */
function PickList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 5, maxHeight: 220, overflowY: 'auto' }}>
      {children}
    </div>
  );
}

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

  const seeded = useMemo(() => draftFromSeed(bundle), [bundle]);
  const [draft, setDraft] = useState<ShipmentDraft>(() => ensureStopSchedules(seeded));
  // Opens on the first row with something missing, or closed when the load is
  // ready - which is the ordinary case, and the one the card is designed around.
  const [open, setOpen] = useState<SectionId | null>(() => openingSection(seeded));

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

  const [locationTerm, setLocationTerm] = useState('');
  const [productTerm, setProductTerm] = useState('');
  const [carrierTerm, setCarrierTerm] = useState('');

  const locked = Boolean(disabled) || busy || done !== null;

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

  const locations = useMemo(
    () => [...bundle.locations, ...addedLocations],
    [bundle.locations, addedLocations],
  );
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const productById = useMemo(
    () => new Map(bundle.products.map((p) => [p.id, p])),
    [bundle.products],
  );
  const partnerById = useMemo(
    () => new Map(bundle.partners.map((p) => [p.id, p])),
    [bundle.partners],
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
    const when = from?.from ? ` · ${displayDate(from.from, tr)}` : '';
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
    setBusy(true);
    setError(null);
    try {
      const measured = intent === 'publish' ? await routeSummaryFor() : undefined;
      const result = await onSubmit(draft, intent, measured);
      setUnsupported(result.unsupported ?? []);

      if (!result.ok) {
        setError(result.reason ?? t('vagonai.review.saveFailed', 'That could not be saved.'));
        // Land the shipper on the row that owns the first refused field. An
        // error with no way back to the control that caused it is the failure
        // this mapping exists to prevent.
        const first = result.missing?.[0];
        if (first) setOpen(sectionForField(first));
        return;
      }
      if (result.done) {
        setDone(result.done);
      }
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!onSchedule) return;
    setBusy(true);
    try {
      onSchedule(draft, await routeSummaryFor());
    } finally {
      setBusy(false);
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
              {done.outcome === 'published'
                ? t('vagonai.review.done.publishedTitle', '{{id}} sent to your carrier', { id: done.autoId })
                : t('vagonai.review.done.draftTitle', '{{id}} saved as a draft', { id: done.autoId })}
            </p>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 3 }}>
              {done.outcome === 'published'
                ? t('vagonai.review.done.publishedHint', 'It has not been booked — the carrier still has to accept it.')
                : t('vagonai.review.done.draftHint', 'Nobody can see it yet. Open it to send it out, or ask me to.')}
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
            { id: site.id, name: site.name, city: site.city, country: site.region, role: site.role, lat: site.lat, lng: site.lng },
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
              ? t('vagonai.review.route.collection', 'Collection')
              : index === draft.stops.length - 1
                ? t('vagonai.review.route.delivery', 'Delivery')
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

              {chosen ? (
                <div className="flex items-center justify-between rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: '7px 9px', gap: 8 }}>
                  <span className="min-w-0">
                    <span className="block" style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{chosen.name}</span>
                    <span className="block" style={{ fontSize: 11, color: T.t3 }}>
                      {[chosen.city, chosen.country].filter(Boolean).join(', ')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => patch(setStopAt(draft, index, { locationId: '' }))}
                    disabled={locked}
                    style={{ fontSize: 11, fontWeight: 600, color: T.ac, flexShrink: 0 }}
                  >
                    {t('vagonai.review.change', 'Change')}
                  </button>
                </div>
              ) : (
                <>
                  {hint && (
                    <p style={{ fontSize: 11, color: '#B45309', marginBottom: 6 }}>
                      {t('vagonai.review.route.orderSays', 'The order says “{{hint}}” — pick the matching saved site.', { hint })}
                    </p>
                  )}
                  <SearchBox
                    T={T}
                    value={locationTerm}
                    onChange={setLocationTerm}
                    placeholder={hint ?? t('vagonai.review.route.searchSites', 'Search your sites')}
                  />
                  <PickList>
                    {useableLocations(locations, locationTerm, hint).map((location) => (
                      <PickRow
                        key={location.id}
                        T={T}
                        title={location.name}
                        subtitle={[location.city, location.country].filter(Boolean).join(', ') || null}
                        selected={false}
                        disabled={locked}
                        onClick={() => {
                          patch(setStopAt(draft, index, { locationId: location.id }));
                          setLocationTerm('');
                        }}
                      />
                    ))}
                    <AddNewRow
                      T={T}
                      label={t('vagonai.review.route.addSite', 'Add a new site')}
                      hint={t('vagonai.review.route.addSiteHint', 'It is saved to your Address Book')}
                      disabled={locked}
                      onClick={() => void openSubForm('location', { kind: 'location', stop: index })}
                    />
                  </PickList>
                </>
              )}

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
                ? t('vagonai.review.cargo.collectedAt', 'Collected at stop {{n}}', { n: stopIndex + 1 })
                : t('vagonai.review.cargo.deliveredAt', 'Delivered at stop {{n}}', { n: stopIndex + 1 });

            return (
              <div key={`${stopIndex}-${lineIndex}`} className="rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: 9 }}>
                <span className="block" style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 6 }}>
                  {where}
                </span>

                {product ? (
                  <div className="flex items-center justify-between rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: '7px 9px', gap: 8 }}>
                    <span className="min-w-0">
                      <span className="block" style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{product.name}</span>
                      {product.sku && <span className="block" style={{ fontSize: 11, color: T.t3 }}>{product.sku}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => patch(setLine(draft, stopIndex, lineIndex, { productId: '' }))}
                      disabled={locked}
                      style={{ fontSize: 11, fontWeight: 600, color: T.ac, flexShrink: 0 }}
                    >
                      {t('vagonai.review.change', 'Change')}
                    </button>
                  </div>
                ) : (
                  <>
                    {hint && (
                      <p style={{ fontSize: 11, color: '#B45309', marginBottom: 6 }}>
                        {t(
                          'vagonai.review.cargo.notInProductMaster',
                          '“{{hint}}” is not in your Product Master yet — pick it or add it.',
                          { hint },
                        )}
                      </p>
                    )}
                    <SearchBox
                      T={T}
                      value={productTerm}
                      onChange={setProductTerm}
                      placeholder={hint ?? t('vagonai.review.cargo.searchProducts', 'Search your products')}
                    />
                    <PickList>
                      {useableProducts(bundle.products, productTerm, hint).map((candidate) => (
                        <PickRow
                          key={candidate.id}
                          T={T}
                          title={candidate.name}
                          subtitle={[candidate.sku, candidate.category].filter(Boolean).join(' · ') || null}
                          selected={false}
                          disabled={locked}
                          onClick={() => {
                            patch(setLine(draft, stopIndex, lineIndex, { productId: candidate.id }));
                            setProductTerm('');
                          }}
                        />
                      ))}
                      <AddNewRow
                        T={T}
                        label={t('vagonai.review.cargo.addProduct', 'Add a new product')}
                        hint={t('vagonai.review.cargo.addProductHint', 'It is saved to your Product Master')}
                        disabled={locked}
                        onClick={() => void openSubForm('product', { kind: 'product', stop: stopIndex, line: lineIndex })}
                      />
                    </PickList>
                  </>
                )}

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
          {bundle.vehicleTypes.map((type) => {
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
        {bundle.vehicleTypes.some(
          (type) => draft.vehicleTypeIds.includes(type.id) && subtypeOptionsOf(type).length > 0,
        ) && (
          <div style={{ marginTop: 4 }}>
            <span className="block" style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 6 }}>
              {t('vagonai.review.truck.subtypesHeading')}
            </span>
            <PickList>
              {bundle.vehicleTypes.flatMap((type) => {
                if (!draft.vehicleTypeIds.includes(type.id)) return [];
                return subtypeOptionsOf(type).map((opt) => {
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
                });
              })}
            </PickList>
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

    const needle = carrierTerm.trim().toLowerCase();
    const filtered = needle
      ? ordered.filter((p) => [p.name, p.uniqueId].some((v) => v?.toLowerCase().includes(needle)))
      : ordered;

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
          <div className="flex items-center" style={{ gap: 8, fontSize: 11.5, color: T.t3 }}>
            <span data-testid="ms3-carrier-count">
              {t('vagonai.review.carrier.selectedCount', { count: selectedIds.length })}
            </span>
            {!locked && (
              <button
                type="button"
                onClick={() =>
                  patch({ ...draft, broadcast: { ...draft.broadcast, carrierPartnerIds: [] } })
                }
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  font: "inherit",
                  color: T.t3,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {t('vagonai.review.carrier.clear')}
              </button>
            )}
          </div>
        )}
        {bundle.partners.length === 0 ? (
          <p style={{ fontSize: 12, color: "#B45309" }}>{t('vagonai.review.carrier.noCarriers')}</p>
        ) : (
          <>
            <SearchBox
              T={T}
              value={carrierTerm}
              onChange={setCarrierTerm}
              placeholder={t('vagonai.review.carrier.searchPlaceholder')}
            />
            <PickList>
              {needle && filtered.length === 0 ? (
                <p
                  style={{ fontSize: 12, color: T.t3, padding: "8px 2px" }}
                  data-testid="ms348-carrier-empty"
                >
                  {t('vagonai.review.carrier.noMatch', { term: carrierTerm.trim() })}
                </p>
              ) : null}
              {filtered.map((partner: FlowPartner, index: number) => {
                const chosen = selectedIds.includes(partner.id);
                const rankedRow = rankedById.get(partner.id);
                const chips = rankedRow?.chips ?? [];
                // The gateway's own reason, when it picked this carrier. The
                // ranker's `reason` is not used here: it restates the name and
                // would crowd out the id and rating a shipper scans for.
                const reason = suggestion?.partnerId === partner.id ? suggestion.reason : null;
                const isTop = index === 0 && !needle && (rankedRow?.score ?? 0) > 0;
                return (
                  <PickRow
                    key={partner.id}
                    T={T}
                    title={partner.name}
                    subtitle={
                      chipText(chips, partner.trips) ??
                      reason ??
                      ([partner.uniqueId, partner.rating ? `★ ${partner.rating}` : null]
                        .filter(Boolean)
                        .join(" · ") || null)
                    }
                    badge={
                      suggestion?.partnerId === partner.id
                        ? suggestion.named
                          ? t('vagonai.review.badge.youAskedFor')
                          : t('vagonai.review.badge.suggested')
                        : isTop
                          ? t('vagonai.review.badge.topMatch')
                          : undefined
                    }
                    selected={chosen}
                    disabled={locked}
                    onClick={() => selectCarrier(partner.id)}
                  />
                );
              })}
            </PickList>
          </>
        )}
      </div>
    );
  }

  function renderPrice() {
    const priceMissing = !(draft.pricing.startingPrice && draft.pricing.startingPrice > 0);
    const priceRequiredForSend = outstanding.some((i) => i.field === 'pricing.startingPrice');
    const showRequired = priceMissing && (priceRequiredForSend || !draft.pricing.negotiable);

    return (
      <div className="flex flex-col" style={{ gap: 8 }} data-testid="ms347-price-section">
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <Field
            T={T}
            label={t('vagonai.review.price.asking', { currency: draft.pricing.currency })}
            required={showRequired}
            invalid={showRequired}
          >
            <input
              type="number"
              min={0}
              value={draft.pricing.startingPrice ?? ''}
              onChange={(e) =>
                patch({
                  ...draft,
                  pricing: { ...draft.pricing, startingPrice: e.target.value === '' ? null : Number(e.target.value) },
                })
              }
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
          {showRequired ? t('vagonai.review.price.required') : t('vagonai.review.price.optional')}
        </p>
      </div>
    );
  }

  function renderExtras() {
    const candidates = trackingCandidates(draft, bundle);
    return (
      <div className="flex flex-col" style={{ gap: 10 }}>
        <Field T={T} label={t('vagonai.review.referenceOptional', 'Your reference (optional)')}>
          <input
            value={draft.customerReference ?? ''}
            onChange={(e) => patch({ ...draft, customerReference: e.target.value || null })}
            disabled={locked}
            style={inputStyle(T)}
          />
        </Field>

        <label className="flex items-start" style={{ gap: 7, fontSize: 12, color: T.t2 }}>
          <input
            type="checkbox"
            checked={draft.requireTracking}
            onChange={(e) => patch({ ...draft, requireTracking: e.target.checked })}
            disabled={locked}
            style={{ marginTop: 2 }}
          />
          <span>
            Require live tracking
            <span className="block" style={{ fontSize: 11, color: T.t3 }}>
              The carrier then has to execute the trip in the app — they cannot mark it delivered by hand.
            </span>
          </span>
        </label>

        {candidates.length > 0 && (
          <div>
            <span className="block" style={{ fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 6 }}>
              Send a tracking link to
            </span>
            <PickList>
              {candidates.map((candidate) => (
                <PickRow
                  key={candidate.orderId}
                  T={T}
                  title={candidate.customerName}
                  subtitle={candidate.email ?? t('vagonai.review.noAddressOnFile', 'No address on file — cannot be sent')}
                  selected={draft.trackingOrderIds.includes(candidate.orderId)}
                  disabled={locked || !candidate.email}
                  onClick={() => patch(toggleTrackingOrder(draft, candidate.orderId))}
                />
              ))}
            </PickList>
          </div>
        )}
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
                onClick={() => patch(setBroadcastChannel(draft, ch))}
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

      <Notes T={T} notes={bundle.notes} />
      <Notes T={T} notes={warnings} tone="warn" />
      {subError && <Notes T={T} notes={[subError]} tone="warn" />}
      {error && (
        <p className="flex items-start" style={{ gap: 5, fontSize: 12, color: '#B45309', marginTop: 8 }}>
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </p>
      )}

      
      {saveBlockers.length > 0 && (
        <ul
          data-testid="ms332-save-blockers"
          style={{ fontSize: 11, color: '#B45309', marginTop: 8, paddingLeft: 16 }}
        >
          {saveBlockers.map((b) => (
            <li key={b.field}>
              <code style={{ fontSize: 10 }}>{b.field}</code>: {b.message}
            </li>
          ))}
        </ul>
      )}
<div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 12 }}>
        <Button
          T={T}
          onClick={() => submit('save_draft')}
          disabled={locked || blocking.length > 0}
          data-save-blockers={saveBlockers.map((b) => b.field).join(',')}
          data-testid="ms332-save-draft"
          icon={<Save size={13} />}
        >
          Save as draft
        </Button>
        <Button
          T={T}
          variant="ghost"
          onClick={() => submit('publish')}
          disabled={locked || blocking.length > 0 || outstanding.length > 0}
          icon={<Send size={13} />}
        >
          {sendLabel}
        </Button>
        {onSchedule && (
          <Button
            T={T}
            variant="ghost"
            onClick={schedule}
            // A batch posts from the queue to named carriers only - the gateway
            // refuses copies of a public load, so the button says so up front.
            disabled={locked || blocking.length > 0 || outstanding.length > 0 || isPublic}
            title={isPublic ? t('vagonai.review.schedulePublicBlocked') : undefined}
            icon={<CalendarClock size={13} />}
          >
            {t('vagonai.review.scheduleCopies')}
          </Button>
        )}
      </div>

      {blocking.length === 0 && outstanding.length > 0 && (
        <p style={{ fontSize: 11, color: T.t3, marginTop: 8 }}>
          Saving works now. To send it you still need: {outstanding.map((issue) => issue.message).join(' ')}
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
 * The sites a picker offers, pre-searched on the order's own words.
 *
 * The hint is used as the opening search term rather than as a filter that
 * sticks: a shipper whose order says "Athens Depot" and whose Address Book calls
 * it "ATH-1" has to be able to reach it, and a list that only ever matched the
 * order's spelling would hide the very site they are looking for.
 */
function useableLocations(rows: FlowLocation[], term: string, hint?: string): FlowLocation[] {
  const needle = (term || hint || '').trim().toLowerCase();
  const filtered = needle
    ? rows.filter((row) => [row.name, row.city, row.country].some((v) => v?.toLowerCase().includes(needle)))
    : rows;
  return (filtered.length > 0 ? filtered : rows).slice(0, 40);
}

function useableProducts(rows: FlowProduct[], term: string, hint?: string): FlowProduct[] {
  const needle = (term || hint || '').trim().toLowerCase();
  const filtered = needle
    ? rows.filter((row) => [row.name, row.sku, row.category, row.type].some((v) => v?.toLowerCase().includes(needle)))
    : rows;
  return (filtered.length > 0 ? filtered : rows).slice(0, 40);
}
