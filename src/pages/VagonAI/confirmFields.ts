/**
 * Field builders for the confirmation cards whose rows need more than a lookup:
 * the truck bid (PTB-02 / PTB-03) and the publish card's truck row (PUB-02).
 *
 * Pure and React-free, beside `confirmVariants.ts`, so the rows can be tested
 * without rendering and the card only lays them out.
 *
 * Every name here was resolved by the gateway before the card existed - the
 * truck's type and subtype, the carrier, the load - so nothing is looked up or
 * guessed in the browser. When a name is missing the row is left out rather
 * than filled with an id.
 */
import { formatMoney } from '../SearchTrucks/utils/money';

export interface Field {
  label: string;
  value: string;
}

export type Translate = (key: string, opts?: Record<string, unknown>) => string;
export type Lang = 'en' | 'el';

/** `place_truck_bid` arguments as the gateway sends them: display keys first, then the tool's own. */
export interface TruckBidArgs {
  truck_label?: string;
  truck_type_name?: string;
  truck_subtype_name?: string;
  truck_type_name_el?: string;
  truck_subtype_name_el?: string;
  carrier_name?: string | null;
  truck_pickup?: string | null;
  truck_available_from?: string | null;
  shipment_label?: string;
  shipment_lane?: string | null;
  shipment_pickup_at?: string | null;
  /** Always present: the shipper's quote, or the carrier's asking price when quote was left out. */
  offer_price?: number;
  offer_currency?: string;
  offer_price_source?: 'quote' | 'carrier_asking_price';
  exact_match?: boolean;
  /** Always true: render the amber "the carrier sees this now; not a booking" warning. */
  offer_visible_to_carrier?: boolean;
  availability_id?: string;
  shipment_id?: string;
  quote?: number;
  notes?: string;
}

/** One truck type on the publish card, as the gateway resolves it (PUB-02). */
export interface PublishVehicleEntry {
  type_id: number;
  type_name: string;
  type_name_el?: string;
  subtypes?: { id: number; name: string; name_el?: string }[];
  any_subtype?: boolean;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** "Semi-trailer · Refrigerated" - the gateway's own rule, so both ends name a truck alike. */
export function joinTruckName(type: string | null, subtype: string | null): string | null {
  if (type && subtype) return type.toLowerCase() === subtype.toLowerCase() ? type : `${type} · ${subtype}`;
  return type ?? subtype;
}

/**
 * The truck, with its subtype (PTB-03). Greek names when the UI is Greek and the
 * catalog had them; otherwise the gateway's English label.
 */
export function bidTruckLabel(args: TruckBidArgs, lang: Lang): string | null {
  if (lang === 'el' && (text(args.truck_type_name_el) || text(args.truck_subtype_name_el))) {
    return joinTruckName(
      text(args.truck_type_name_el) ?? text(args.truck_type_name),
      text(args.truck_subtype_name_el) ?? text(args.truck_subtype_name),
    );
  }
  return text(args.truck_label) ?? joinTruckName(text(args.truck_type_name), text(args.truck_subtype_name));
}

/** A short local date-time, or the raw value when it does not parse. */
export function formatWhen(value: string | null | undefined, lang: Lang): string {
  const raw = text(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * The offer as the shipper is about to send it.
 *
 * The price row is the point (PTB-02). It is always shown with its currency,
 * and says whose figure it is: leaving quote out sends the carrier's asking
 * price, which the shipper should be told rather than infer.
 */
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The price row's value. Never empty (FAT-01 round 1, FE-S1): a bid card must
 * not render without a price.
 *
 * 1. `offer_price` - the gateway's figure (gateway PR #7 and later).
 * 2. `quote` - an older gateway sends no `offer_price`, but a quoted figure is
 *    still the amount being offered, so it is shown as "your offer".
 * 3. Neither - the offer goes at the carrier's asking price and no figure was
 *    sent to show, so the row says exactly that, in warning copy, instead of
 *    disappearing.
 */
export function bidPriceValue(args: TruckBidArgs, t: Translate): { value: string; missing: boolean } {
  if (finite(args.offer_price)) {
    const source = args.offer_price_source === 'carrier_asking_price'
      ? t('vagonai.confirm.bid.askingPrice')
      : args.offer_price_source === 'quote' ? t('vagonai.confirm.bid.yourOffer') : '';
    return { value: [formatMoney(args.offer_price, args.offer_currency ?? 'EUR', ''), source].filter(Boolean).join(' · '), missing: false };
  }
  if (finite(args.quote)) {
    return {
      value: [formatMoney(args.quote, args.offer_currency ?? 'EUR', ''), t('vagonai.confirm.bid.yourOffer')].join(' · '),
      missing: false,
    };
  }
  return { value: t('vagonai.confirm.bid.priceNotShown'), missing: true };
}

export function bidFields(args: TruckBidArgs, t: Translate, lang: Lang, opts: { omitTruck?: boolean } = {}): Field[] {
  const price = bidPriceValue(args, t);
  const truckWhere = [text(args.truck_pickup), formatWhen(args.truck_available_from, lang)].filter(Boolean).join(' · ');
  const load = [text(args.shipment_label), text(args.shipment_lane)].filter(Boolean).join(' · ');

  return [
    // Left out when the card's heading already names the truck (N4).
    { label: t('vagonai.confirm.bid.truck'), value: opts.omitTruck ? '' : bidTruckLabel(args, lang) ?? '' },
    { label: t('vagonai.confirm.bid.carrier'), value: text(args.carrier_name) ?? '' },
    { label: t('vagonai.confirm.bid.truckAvailable'), value: truckWhere },
    { label: t('vagonai.confirm.bid.load'), value: load },
    { label: t('vagonai.confirm.bid.loadPickup'), value: formatWhen(args.shipment_pickup_at, lang) },
    { label: t('vagonai.confirm.bid.price'), value: price.value },
    // Shown both ways: "partial" is the one a shipper needs to notice.
    {
      label: t('vagonai.confirm.bid.match'),
      value: typeof args.exact_match === 'boolean'
        ? t(args.exact_match ? 'vagonai.confirm.bid.exactYes' : 'vagonai.confirm.bid.exactNo')
        : '',
    },
    { label: t('vagonai.confirm.bid.notes'), value: text(args.notes) ?? '' },
  ].filter((f) => f.value);
}

/**
 * The publish card's truck row (PUB-02).
 *
 * "Semi-trailer · Refrigerated", or "Semi-trailer · any subtype" when the type
 * went out un-narrowed - said outright, because a widened request and a
 * narrowed one must not look the same on the last screen before a load reaches
 * carriers. Older gateways send only names; those are shown as they come.
 */
export function publishTruckValue(
  args: { vehicle_selection?: PublishVehicleEntry[]; vehicle_subtype_names?: string[]; vehicle_type_names?: string[] },
  t: Translate,
  lang: Lang,
): string {
  const selection = Array.isArray(args.vehicle_selection) ? args.vehicle_selection : [];
  if (selection.length > 0) {
    return selection.map((entry) => {
      const type = (lang === 'el' ? text(entry.type_name_el) : null) ?? text(entry.type_name) ?? `#${entry.type_id}`;
      const subtypes = (entry.subtypes ?? [])
        .map((subtype) => (lang === 'el' ? text(subtype.name_el) : null) ?? text(subtype.name))
        .filter((name): name is string => Boolean(name));
      if (subtypes.length === 0 || entry.any_subtype) return `${type} · ${t('vagonai.confirm.publish.anySubtype')}`;
      return joinTruckName(type, subtypes.join(' / ')) ?? type;
    }).join(', ');
  }
  const narrowed = args.vehicle_subtype_names ?? [];
  return (narrowed.length > 0 ? narrowed : args.vehicle_type_names ?? []).join(', ');
}
