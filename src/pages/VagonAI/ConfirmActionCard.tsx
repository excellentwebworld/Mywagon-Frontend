/**
 * ConfirmActionCard — the human-in-the-loop gate for a write action Vagon AI
 * has proposed.
 *
 * The gateway never executes a write from a chat turn. It records the proposal
 * and stops, and this card is the only thing that turns it into a real action.
 * So it shows what will actually be written rather than a bare "Are you sure?" —
 * the shipper is approving something they cannot otherwise inspect.
 *
 * Each write tool lands in a different module, so the card is chosen by
 * `action.tool`: a draft shipment, a published one, an Address Book location, or
 * a Product Registry entry. Title, body and button label all follow from that —
 * announcing a draft shipment over a proposed address is simply wrong, and the
 * "nothing is sent to carriers" note only means anything for a draft. An
 * unrecognised write tool falls back to a generic variant that lists its
 * arguments, so a card is never empty and never mislabelled.
 *
 * The draft card carries THREE buttons rather than two, because saving a load
 * and sending it to carriers are different decisions and the shipper owns both:
 *
 *   Save draft          — writes a private draft and stops there.
 *   Create shipment now — writes the same draft, then the assistant collects the
 *                         channel, truck type, carriers and price and proposes
 *                         `publish_shipment`. Still nothing is published here.
 *   Cancel              — writes nothing.
 *
 * "Create shipment now" is disabled when the route cannot be measured. MYVAGON
 * refuses to publish a load without a road distance, that distance is measured
 * in this page from the stops' coordinates, and a stop the shipper never
 * geocoded has none — so the honest move is to grey the button out and say why,
 * rather than let them start a flow that dead-ends at the last step.
 */
import { useState } from 'react';
import {
  MapPin, Package, Loader2, ArrowUpFromLine, ArrowDownToLine, ArrowRight, Send, ClipboardList, CalendarClock,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { PendingAction } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { FACILITY_SUBTYPES, confirmVariant } from './confirmVariants';

interface CargoLine {
  action?: 'pickup' | 'dropoff';
  qty?: number;
  unit?: string;
  weight?: number;
  weight_unit?: string;
  order_reference?: string;
  /** Resolved server-side from product_id — the shipper must see a name, not an id. */
  product_name?: string | null;
  /** The ERP customer this cargo belongs to, when the load was built from an order. */
  customer_name?: string | null;
}

interface Stop {
  location_id?: string;
  date_from?: string;
  time_from?: string;
  date_to?: string;
  time_to?: string;
  lines?: CargoLine[];
  /** Resolved server-side from location_id. Seeing the wrong warehouse named
   *  here is the last chance to catch a mix-up before the draft is written. */
  location_name?: string | null;
  location_city?: string | null;
}

interface CreateShipmentArgs {
  customer_reference?: string;
  stops?: Stop[];
  target_price?: number;
  negotiable?: boolean;
}

interface PublishShipmentArgs {
  broadcast_type?: 'private' | 'public';
  target_price?: number;
  /** Resolved server-side, so the card names real trucks and carriers, not ids. */
  shipment_reference?: string;
  route_distance_km?: number | null;
  vehicle_type_names?: string[];
  partner_names?: string[];
  /**
   * The load itself, rebuilt from the draft by the gateway.
   *
   * Publishing is the last moment anything can be caught, and by then the
   * itinerary has scrolled away above a channel picker, a truck picker, a
   * carrier picker and a price. Same field names as a draft's stops, because the
   * same block below renders both.
   */
  customer_reference?: string;
  stops?: Stop[];
  /**
   * Whether carriers may counter-offer. Always sent by the gateway rather than
   * left to a default, because MYVAGON opens a load to counter-offers unless
   * told otherwise and a card silent about it lets someone approve that without
   * being told they had.
   */
  negotiable?: boolean;
  /** Customers who will be emailed a tracking link. Named, because a count is not checkable. */
  tracking_recipient_names?: string[];
}

/**
 * `create_order` arguments, as the gateway sends them.
 *
 * Snake_case because these are the tool's own argument names, not a projection.
 * Only the fields worth checking before approving are read: the two location ids
 * are deliberately NOT shown, because they arrive as bare ids with no name
 * resolved beside them and "Ship from 1841" is worse than no row at all.
 */
interface CreateOrderArgs {
  order_reference?: string;
  erp_reference?: string;
  customer_name?: string;
  ship_date?: string;
  delivery_date?: string;
  order_value?: number;
  high_priority?: boolean;
  notes?: string;
  lines?: {
    product_name?: string;
    quantity?: number;
    unit?: string;
    weight?: number;
    weight_unit?: string;
  }[];
}

interface Props {
  action: PendingAction;
  T: ThemeTokens;
  /** Save draft (or, on the publish card, send the load out). */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  /** Save the draft and carry straight on to publishing. Draft card only. */
  onCreateNow?: () => void | Promise<void>;
  /**
   * Arm a batch of copies instead of publishing this load once. Publish card
   * only.
   *
   * On the publish card and not the draft card, because a batch is graded by the
   * real publish gate: a draft with no channel, no truck type and no price would
   * be refused, so offering it a step earlier would be offering a dead end. By
   * the time this card is drawn all four of those are settled, which is exactly
   * where the guided flow's own Schedule button sits.
   *
   * It does NOT read this card's arguments. They are display-shaped by design,
   * and matching those names back to records is how a batch posts real freight
   * against the wrong product — the caller fetches the template from the draft
   * instead.
   */
  onSchedule?: () => void | Promise<void>;
  /**
   * False when a stop has no map position, so no route can be measured and the
   * load can only ever be saved as a draft.
   */
  canCreateNow?: boolean;
}

interface Field {
  label: string;
  value: string;
}

/** `arguments` is untyped by construction, so only printable scalars get through. */
function scalar(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return null;
}

function formatWindow(stop: Stop): string {
  const start = [stop.date_from, stop.time_from].filter(Boolean).join(' ');
  const end = stop.time_to ? (stop.date_to && stop.date_to !== stop.date_from
    ? `${stop.date_to} ${stop.time_to}`
    : stop.time_to) : '';
  return end ? `${start} - ${end}` : start;
}

function formatLine(line: CargoLine): string {
  const qty = [line.qty, line.unit].filter((v) => v !== undefined && v !== '').join(' ');
  const weight = [line.weight, line.weight_unit].filter((v) => v !== undefined && v !== '').join(' ');
  return [qty, weight].filter(Boolean).join(' · ');
}

/** `location_name` on one gateway build, `name` on the next — read either. */
function pick(args: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = scalar(args[key]);
    if (value !== null) return value;
  }
  return null;
}

function humanize(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

function locationFields(args: Record<string, unknown>, t: Translate): Field[] {
  const company = pick(args, 'company_name', 'company');
  const vat = pick(args, 'company_vat', 'vat', 'vat_number');
  const subtype = pick(args, 'location_subtype', 'subtype', 'facility_type');
  const role = pick(args, 'location_role', 'role');
  const lat = pick(args, 'resolved_lat', 'lat', 'latitude');
  const lng = pick(args, 'resolved_lng', 'lng', 'longitude');

  const roleLabel = role === 'pickup' ? t('pickup')
    : (role === 'delivery' || role === 'dropoff') ? t('delivery')
      : role === 'both' ? `${t('pickup')} + ${t('delivery')}` : role;
  const subtypeLabel = subtype && FACILITY_SUBTYPES.includes(subtype)
    ? t(`vagonai.confirm.location.subtype.${subtype}`)
    : subtype;

  return [
    { label: t('companyName'), value: [company, vat].filter(Boolean).join(' · ') },
    { label: t('addressCol'), value: pick(args, 'location', 'address', 'street') ?? '' },
    { label: t('city'), value: pick(args, 'city') ?? '' },
    { label: t('vagonai.confirm.location.usedFor'), value: [subtypeLabel, roleLabel].filter(Boolean).join(' · ') },
    // The Address Book cannot hold a location without a map position, and the
    // bot never invents one — so this is the pair the shipper themselves gave.
    { label: t('vagonai.confirm.location.coordinates'), value: lat && lng ? `${lat}, ${lng}` : '' },
  ].filter((f) => f.value);
}

function productFields(args: Record<string, unknown>, t: Translate): Field[] {
  const category = pick(args, 'category_name', 'category');
  const type = pick(args, 'type_name', 'product_type', 'type');

  return [
    { label: t('skuNumber'), value: pick(args, 'sku_number', 'number', 'sku', 'code') ?? '' },
    { label: t('category'), value: [category, type].filter(Boolean).join(' → ') },
    { label: t('unit'), value: pick(args, 'unit') ?? '' },
    { label: t('weightPerUnit'), value: pick(args, 'weight', 'weight_per_unit') ?? '' },
    { label: t('temperature'), value: pick(args, 'temperature') ?? '' },
    { label: t('palletType'), value: pick(args, 'pallet_type') ?? '' },
  ].filter((f) => f.value);
}

/**
 * What the shipper is about to send out.
 *
 * The channel is first and stated in full, because it is the field that decides
 * who sees the load — "my carriers" and "every carrier on MYVAGON" are very
 * different things to approve, and they differ by one word on the wire.
 *
 * The measured distance is shown rather than kept internal. It is what the price
 * is judged against, and it was measured in this browser rather than agreed with
 * anyone, so the shipper should be able to see the number they are pricing per
 * kilometre against.
 */

function markCompleteFields(args: Record<string, unknown>, t: Translate): Field[] {
  const sid = typeof args.auto_id === 'string' && args.auto_id
    ? args.auto_id
    : (typeof args.shipment_id === 'string' ? args.shipment_id : '');
  const status = typeof args.current_status === 'string' ? args.current_status : '';
  // What the gateway worked out it will become, from the stops: "Partially
  // Fulfilled" when some were reported failed, so the card never says more.
  const result = typeof args.result_status === 'string' ? args.result_status : '';
  return [
    { label: t('vagonai.confirm.markComplete.sid'), value: sid },
    // The app's own status labels ("On Trip" / "Σε Διαδρομή"), not raw codes;
    // an unknown code falls back to itself rather than blank.
    { label: t('vagonai.confirm.markComplete.status'), value: status ? t(status, { defaultValue: status }) : '' },
    { label: t('vagonai.confirm.markComplete.result'), value: result ? t(result, { defaultValue: result }) : '' },
  ].filter((f) => Boolean(f.value));
}

function publishFields(args: PublishShipmentArgs, t: Translate): Field[] {
  const carriers = args.partner_names ?? [];
  const trucks = args.vehicle_type_names ?? [];

  return [
    {
      label: t('vagonai.confirm.publish.channel'),
      value: args.broadcast_type === 'public'
        ? t('vagonai.confirm.publish.channelPublic')
        : t('vagonai.confirm.publish.channelPrivate'),
    },
    { label: t('vagonai.confirm.publish.truckTypes'), value: trucks.join(', ') },
    // Only for a private load: a public one goes to the whole marketplace, and an
    // empty "Carriers" row under it reads as nobody rather than everybody.
    {
      label: t('vagonai.confirm.publish.carriers'),
      value: args.broadcast_type === 'private' ? carriers.join(', ') : '',
    },
    {
      label: t('vagonai.confirm.publish.price'),
      value: args.target_price !== undefined ? String(args.target_price) : '',
    },
    {
      label: t('vagonai.confirm.publish.distance'),
      value: args.route_distance_km ? t('vagonai.confirm.publish.km', { km: args.route_distance_km }) : '',
    },
    // Stated in full rather than as a word appended to the price. "Negotiable"
    // beside a figure reads as a hedge; "Carriers can send counter-offers" is
    // what actually happens, and it is a commercial term nobody chose out loud.
    {
      label: t('vagonai.confirm.publish.negotiableRow'),
      value: args.negotiable === false
        ? t('vagonai.confirm.publish.negotiableNo')
        : t('vagonai.confirm.publish.negotiableYes'),
    },
    // The last screen before a shipper's itinerary is emailed to other
    // companies, so the companies are named.
    {
      label: t('vagonai.confirm.publish.tracking'),
      value: (args.tracking_recipient_names ?? []).join(', '),
    },
  ].filter((f) => f.value);
}

/**
 * What the shipper is about to file.
 *
 * The customer and the delivery date lead, because those are the two things
 * MYVAGON requires and the two an order is wrong about most damagingly. The
 * product lines are rendered separately below, like a shipment's stops, since a
 * count is not checkable and a row per line is.
 */
function orderFields(args: CreateOrderArgs, t: Translate): Field[] {
  return [
    { label: t('vagonai.confirm.erpOrder.customer'), value: args.customer_name ?? '' },
    { label: t('vagonai.confirm.erpOrder.delivered'), value: args.delivery_date ?? '' },
    { label: t('vagonai.confirm.erpOrder.shipDate'), value: args.ship_date ?? '' },
    { label: t('vagonai.confirm.erpOrder.erpRef'), value: args.erp_reference ?? '' },
    {
      label: t('vagonai.confirm.erpOrder.value'),
      value: args.order_value !== undefined ? String(args.order_value) : '',
    },
    // Shown only when it is set. An empty "High priority" row reads as a
    // decision the shipper made and declined, which they did not.
    { label: t('vagonai.confirm.erpOrder.priority'), value: args.high_priority ? t('yes') : '' },
  ].filter((f) => f.value);
}

/**
 * A write tool this build does not know about. The labels cannot be localized,
 * but showing the arguments still beats asking the shipper to approve nothing.
 * A yes/no value can be, so it is shown as a word rather than as `true`.
 */
function genericFields(args: Record<string, unknown>, t: Translate): Field[] {
  return Object.entries(args)
    .map(([key, value]) => ({
      label: humanize(key),
      value: typeof value === 'boolean' ? t(value ? 'yes' : 'no') : scalar(value) ?? '',
    }))
    .filter((f) => f.value)
    .slice(0, 10);
}

/**
 * Which end of the route a stop is, read off its own cargo lines.
 *
 * Position is not enough and never was: a middle stop on a multi-drop run both
 * collects and delivers, and the last stop of a backhaul collects. The lines say
 * what actually happens there, which is the same rule the gateway validates
 * against server-side.
 *
 * This exists because both stops used to render with an identical pin, so the
 * one thing a shipper most needs to check on a draft - that the origin and the
 * destination are not the wrong way round - was the one thing the card did not
 * show. A wrong-way-round load saves cleanly and looks entirely normal.
 */
type StopRole = 'pickup' | 'delivery' | 'both' | 'unknown';

function stopRole(stop: Stop): StopRole {
  const lines = stop.lines ?? [];
  const collects = lines.some((line) => line.action === 'pickup');
  const delivers = lines.some((line) => line.action === 'dropoff');
  if (collects && delivers) return 'both';
  if (collects) return 'pickup';
  if (delivers) return 'delivery';
  return 'unknown';
}

const ROLE_KEY: Record<StopRole, string | null> = {
  pickup: 'vagonai.confirm.stopPickup',
  delivery: 'vagonai.confirm.stopDelivery',
  both: 'vagonai.confirm.stopBoth',
  unknown: null,
};

function RoleIcon({ role }: { role: StopRole }) {
  if (role === 'pickup') return <ArrowUpFromLine size={13} />;
  if (role === 'delivery') return <ArrowDownToLine size={13} />;
  return <MapPin size={13} />;
}

export default function ConfirmActionCard({
  action, T, onConfirm, onCancel, onCreateNow, onSchedule, canCreateNow = false,
}: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'confirm' | 'cancel' | 'createNow' | 'schedule' | null>(null);
  const variant = confirmVariant(action.tool);
  const markCompleteWarning = variant === 'markComplete'
    ? t('vagonai.confirm.markComplete.warning')
    : null;
  const args = action.arguments;

  const shipment = args as CreateShipmentArgs;
  // Both cards describe one load and draw it the same way. The publish card is
  // not a summary of the finishing interview - it is the shipment, plus how it
  // is going out.
  const detailed = variant === 'shipment' || variant === 'publish';
  const stops = detailed ? shipment.stops ?? [] : [];

  // The whole load in one line, above the itinerary. A shipper checking a draft
  // is checking the route first and the appointment windows second, and on a
  // two-stop run the detail below repeats this - which is the point: the summary
  // is what gets read, the detail is what gets verified.
  const originName = stops[0]?.location_name ?? null;
  const finalName = stops.length > 1 ? stops[stops.length - 1]?.location_name ?? null : null;

  const heading = variant === 'location' ? pick(args, 'location_name', 'name')
    : variant === 'product' ? pick(args, 'sku_name', 'product_name', 'name')
      : variant === 'publish' ? pick(args, 'shipment_reference')
        : variant === 'markComplete' ? pick(args, 'auto_id', 'shipment_id')
        : variant === 'erpOrder' ? pick(args, 'order_reference')
          : null;

  const fields = variant === 'location' ? locationFields(args, t)
    : variant === 'product' ? productFields(args, t)
      : variant === 'publish' ? publishFields(args as PublishShipmentArgs, t)
        : variant === 'markComplete' ? markCompleteFields(args, t)
          : variant === 'erpOrder' ? orderFields(args as CreateOrderArgs, t)
            : variant === 'generic' ? genericFields(args, t)
              : [];

  /* The order's own lines. Rendered like a shipment's stops rather than folded
     into `fields`, because "3 products" is not something a shipper can check
     and three named rows are. */
  const orderLines = variant === 'erpOrder' ? ((args as CreateOrderArgs).lines ?? []) : [];

  // Disabling is for feel, not correctness: the gateway claims the action
  // atomically, so a double-click can never write the record twice.
  const run = async (which: 'confirm' | 'cancel' | 'createNow' | 'schedule', fn: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(which);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="rounded-xl"
      style={{ border: `1px solid ${T.bd}`, background: T.sa, padding: 14, maxWidth: 560 }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>
        {t(`vagonai.confirm.${variant}.title`)}
      </div>
      {markCompleteWarning ? (
        <p className="vai-confirm-warn" style={{ marginTop: 8, fontSize: 12.5, opacity: 0.9, color: T.t2 }}>{markCompleteWarning}</p>
      ) : null}

      {heading && (
        <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: 13.5, fontWeight: 600, color: T.t1 }}>
          <span style={{ color: T.t3 }}>
            {variant === 'location' ? <MapPin size={13} />
              : variant === 'publish' ? <Send size={13} />
                : variant === 'erpOrder' ? <ClipboardList size={13} />
                  : <Package size={13} />}
          </span>
          {heading}
        </div>
      )}

      {detailed && shipment.customer_reference && (
        <div className="mt-1" style={{ fontSize: 12, color: T.t3 }}>
          {t('vagonai.confirm.reference', { ref: shipment.customer_reference })}
        </div>
      )}

      {detailed && originName && finalName && (
        <div
          className="flex items-center gap-1.5 mt-2.5"
          style={{ fontSize: 13.5, fontWeight: 600, color: T.t1, flexWrap: 'wrap' }}
        >
          <span className="min-w-0" style={{ wordBreak: 'break-word' }}>{originName}</span>
          <ArrowRight size={13} className="flex-shrink-0" style={{ color: T.t3 }} />
          <span className="min-w-0" style={{ wordBreak: 'break-word' }}>{finalName}</span>
          {stops.length > 2 && (
            <span style={{ fontWeight: 400, color: T.t3, fontSize: 12 }}>
              {`· ${t('vagonai.confirm.stopsCount', { count: stops.length })}`}
            </span>
          )}
        </div>
      )}

      {detailed && (
        <ol className="mt-3 m-0 p-0" style={{ listStyle: 'none' }}>
          {stops.map((stop, i) => (
            <li key={i} className="flex gap-2.5 mb-2.5">
              <span className="flex-shrink-0 mt-0.5" style={{ color: T.t3 }}>
                <RoleIcon role={stopRole(stop)} />
              </span>
              <div className="min-w-0">
                {/*
                  Named, not just iconified. An arrow direction is a convention the
                  shipper has to learn; the word is one they already know, and it is
                  what a screen reader reads out.
                */}
                {ROLE_KEY[stopRole(stop)] && (
                  <div
                    style={{
                      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: T.t3, marginBottom: 1,
                    }}
                  >
                    {t(ROLE_KEY[stopRole(stop)] as string)}
                  </div>
                )}
                <div style={{ fontSize: 13, color: T.t1, fontWeight: 600 }}>
                  {stop.location_name ?? t('vagonai.confirm.stop', { n: i + 1 })}
                  {stop.location_city && (
                    <span style={{ fontWeight: 400, color: T.t3 }}>{`, ${stop.location_city}`}</span>
                  )}
                  {formatWindow(stop) && (
                    <span style={{ fontWeight: 400, color: T.t2 }}>{` — ${formatWindow(stop)}`}</span>
                  )}
                </div>
                {(stop.lines ?? []).map((line, j) => (
                  <div key={j} className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: 12, color: T.t3 }}>
                    <Package size={11} />
                    <span>
                      {t(`vagonai.confirm.${line.action === 'dropoff' ? 'dropoff' : 'pickup'}`)}
                      {line.product_name ? ` ${line.product_name} —` : ''}
                      {` ${formatLine(line)}`}
                      {line.order_reference ? ` · ${t('vagonai.confirm.order', { ref: line.order_reference })}` : ''}
                      {line.customer_name ? ` · ${t('vagonai.confirm.forCustomer', { name: line.customer_name })}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {variant === 'shipment' && shipment.target_price !== undefined && (
        <div style={{ fontSize: 13, color: T.t1 }}>
          {t('vagonai.confirm.price', { price: shipment.target_price })}
          {shipment.negotiable ? ` · ${t('vagonai.confirm.negotiable')}` : ''}
        </div>
      )}

      {fields.length > 0 && (
        <div className="mt-2.5">
          {fields.map((field) => (
            <div key={field.label} className="flex gap-2 mt-1.5" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              <span className="flex-shrink-0" style={{ color: T.t3, minWidth: 116 }}>{field.label}</span>
              <span className="min-w-0" style={{ color: T.t1, fontWeight: 500, wordBreak: 'break-word' }}>
                {field.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {orderLines.length > 0 && (
        <div className="mt-2.5">
          <div
            style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: T.t3, marginBottom: 3,
            }}
          >
            {t('vagonai.confirm.erpOrder.lines')}
          </div>
          {orderLines.map((line, i) => {
            // Reuses the shipment card's own formatter, so a quantity and a
            // weight read identically on both cards — an order line and the
            // cargo line built from it are the same freight.
            const amount = formatLine({
              qty: line.quantity,
              unit: line.unit,
              weight: line.weight,
              weight_unit: line.weight_unit,
            });
            return (
              <div key={i} className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: 12, color: T.t2 }}>
                <Package size={11} style={{ flexShrink: 0, color: T.t3 }} />
                <span style={{ wordBreak: 'break-word' }}>
                  {line.product_name ?? t('vagonai.confirm.stop', { n: i + 1 })}
                  {amount ? ` — ${amount}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/*
        The order card's counterpart to the shipment card's note below, and the
        more important of the two here: "order" is the word a shipper is most
        likely to read as "it is on its way". Nothing moves until they build a
        load from it, so the card says so before the button.
      */}
      {variant === 'erpOrder' && (
        <p className="m-0 mt-3" style={{ fontSize: 12, lineHeight: 1.5, color: T.t3 }}>
          {t('vagonai.confirm.erpOrder.notPlanned')}
        </p>
      )}

      {/*
        Shipment only, and said plainly next to the button: a shipper who
        believes the load already went to carriers will never go and publish it.
        A location or a product, by contrast, really does just get saved.
      */}
      {variant === 'shipment' && (
        <p className="m-0 mt-3" style={{ fontSize: 12, lineHeight: 1.5, color: T.t3 }}>
          {t('vagonai.confirm.notPublished')}
        </p>
      )}

      {/*
        The mirror image of the note above, and the more important of the two.
        This is the only card in the assistant whose Confirm button is visible to
        other companies, and it cannot be undone from the chat — so it says what
        publishing does, and says in the same breath what it does not do. "Live"
        and "booked" are one word apart and mean entirely different things to
        someone planning a week's transport.
      */}
      {variant === 'publish' && (
        <p
          className="m-0 mt-3 rounded-lg"
          style={{
            fontSize: 12, lineHeight: 1.5, color: T.t2, padding: '8px 10px',
            background: 'rgba(245,158,11,0.12)',
          }}
        >
          {t('vagonai.confirm.publish.warning')}
        </p>
      )}

      {/*
        Said before the button rather than after the disappointment: a shipper who
        cannot use "Create shipment now" should know why while they still have the
        draft in front of them, not discover a greyed-out control.
      */}
      {variant === 'shipment' && onCreateNow && !canCreateNow && (
        <p className="m-0 mt-2.5" style={{ fontSize: 11.5, lineHeight: 1.5, color: T.t3 }}>
          {t('vagonai.confirm.createNowUnavailable')}
        </p>
      )}

      {/*
        The gateway rebuilds a proposal from a corrected instruction and replaces
        the card, so a change genuinely does just need saying. Without this line
        Cancel looks like the only way to alter anything - and cancelling loses
        every detail already collected.
      */}
      <p className="m-0 mt-2.5" style={{ fontSize: 11.5, lineHeight: 1.5, color: T.t3 }}>
        {t('vagonai.confirm.changeHint')}
      </p>

      <div className="flex items-center gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
        {/*
          "Create shipment now" leads on the draft card, because a shipper who
          pressed it is doing the whole job in one go and Save draft is the
          fallback. On every other card there is only one thing to confirm.
        */}
        {variant === 'shipment' && onCreateNow && (
          <button
            type="button"
            onClick={() => run('createNow', onCreateNow)}
            disabled={busy !== null || !canCreateNow}
            title={canCreateNow ? undefined : t('vagonai.confirm.createNowUnavailable')}
            className="inline-flex items-center gap-1.5 rounded-lg"
            style={{
              height: 34, padding: '0 14px', border: 'none', background: T.ac, color: '#fff',
              fontSize: 13, fontWeight: 700,
              cursor: busy || !canCreateNow ? 'default' : 'pointer',
              opacity: busy || !canCreateNow ? 0.6 : 1,
            }}
          >
            {busy === 'createNow' && <Loader2 size={13} className="animate-spin" />}
            {t('vagonai.confirm.createNow')}
          </button>
        )}
        <button
          type="button"
          onClick={() => run('confirm', onConfirm)}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg"
          style={{
            height: 34, padding: '0 14px',
            // Demoted to the secondary style once it sits beside a primary
            // action: two filled buttons side by side say neither is the
            // expected one.
            border: variant === 'shipment' && onCreateNow ? `1px solid ${T.bd}` : 'none',
            background: variant === 'shipment' && onCreateNow ? 'transparent' : T.ac,
            color: variant === 'shipment' && onCreateNow ? T.t1 : '#fff',
            fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy === 'confirm' && <Loader2 size={13} className="animate-spin" />}
          {t(`vagonai.confirm.${variant}.confirm`)}
        </button>
        <button
          type="button"
          onClick={() => run('cancel', onCancel)}
          disabled={busy !== null}
          className="rounded-lg"
          style={{
            height: 34, padding: '0 14px', border: `1px solid ${T.bd}`, background: 'transparent',
            color: T.t2, fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {t('vagonai.confirm.cancel')}
        </button>
        {/*
          Scheduling copies INSTEAD of publishing once, and deliberately
          secondary: ghost styling and last in the row, because Confirm is still
          the expected action and this replaces it rather than following it. The
          same shape the guided flow's Review card uses for the same choice, so
          the two paths offer it identically.
        */}
        {variant === 'publish' && onSchedule && (
          <button
            type="button"
            onClick={() => run('schedule', onSchedule)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg"
            style={{
              height: 34, padding: '0 14px', border: `1px solid ${T.bd}`, background: 'transparent',
              color: T.t2, fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy === 'schedule' ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />}
            {t('vagonai.confirm.publish.schedule')}
          </button>
        )}
      </div>
    </div>
  );
}
