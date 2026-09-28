/**
 * CreateOrderForm — the guided create-order form.
 *
 * Opens when a turn delivers a `flow_context` event with `flow: "create_order"`,
 * and then runs entirely on the client. The customers, the Address Book sites and
 * the product catalog all arrived in that one bundle, so **there is no /chat call
 * while the form is open** — the same rule as the other three flows, and the same
 * reason.
 *
 * ## This is an ORDER, not a load, and the form is shaped to say so
 *
 * The bug this whole flow exists to fix is that "create order" opened the
 * create-SHIPMENT wizard. So the difference is not left to a heading: there is no
 * truck type on this form, no channel, no carrier list and no price, because none
 * of those exists on an order. An order is a commercial fact — a customer, a
 * delivery date and a line per product, freight the shipper has SOLD — and it
 * moves nothing until a load is built from it. The success card says that in
 * words and offers the load as the next step.
 *
 * Two shapes carry that intent and should not be "simplified" away:
 *
 *   - **The order ID is the first field and it opens with a suggestion.** It is
 *     the shipper's own numbering, MYVAGON refuses one they have already used, and
 *     it is the one required value in this product that cannot be looked up. The
 *     bundle's suggested reference is picked to miss every one it could see; the
 *     field stays fully editable, and a clash is warned about under it rather than
 *     discovered at save time.
 *   - **A line may name a product with no id.** The picker is preferred, because
 *     `productId` is what a load built from this order reuses as its cargo
 *     `product_id`. But an order for something not yet in the Product Master is
 *     real and MYVAGON accepts a bare name, so typing one is allowed and warned
 *     about rather than blocked — the alternative is derailing an order into an
 *     add-product flow nobody asked for.
 *
 * ## A past delivery date is fine
 *
 * Unlike a shipment stop, which is refused when it is unbookable, a back-dated
 * order is ordinary record-keeping: orders get entered late and catching the
 * records up is exactly the data entry this form is for. Nothing here refuses the
 * past, and `orderIssues` deliberately does not check it.
 */
import { useMemo, useState } from 'react';
import { ClipboardList, CircleCheck, Save, Plus, Trash2, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import type { FlowContextEvent, OrderFlowBundle, OrderFlowProduct } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Field, Heading, Notes, PickRow, Shell } from './flowPrimitives';
import { inputStyle, useFilter } from './flowHelpers';
import {
  ORDER_QTY_UNITS, ORDER_WEIGHT_UNITS, emptyOrderDraft, emptyOrderLine, orderIssues,
  orderWarnings, referenceClashOf, serializeOrderDraft, setLineProduct,
  type OrderDraft, type OrderDraftLine, type OrderQtyUnit, type OrderWeightUnit,
} from './createOrderDraft';
import { useTr } from './i18n';

/**
 * Locale keys for the two unit pickers. The option VALUE stays the English unit
 * the gateway takes; only the label the shipper reads is translated.
 */
const QTY_UNIT_KEYS: Record<OrderQtyUnit, string> = {
  'EUR Pallets': 'eurPallets',
  'US Pallets': 'usPallets',
  Boxes: 'boxes',
  Units: 'units',
  'Big Bags': 'bigBags',
};
const WEIGHT_UNIT_KEYS: Record<OrderWeightUnit, string> = { Tonnes: 'tonnes', Kgs: 'kgs' };

export interface OrderSubmitResult {
  ok: boolean;
  missing?: string[];
  reason?: string;
  /** Set when the order was actually filed. Drives the success card. */
  done?: {
    orderId: string;
    reference: string | null;
    customerName: string | null;
    deliveryDate: string | null;
    lineCount: number;
    /** Lines whose product was typed rather than picked — worth naming once. */
    unmatchedProducts: string[];
    orderUrl: string;
  };
}

interface Props {
  /** Narrowed to this flow's own event, exactly as the other three forms are. */
  event: Extract<FlowContextEvent, { flow: 'create_order' }>;
  T: ThemeTokens;
  onSubmit: (draft: Record<string, unknown>) => Promise<OrderSubmitResult>;
  /**
   * Called with the filed order when the shipper answers YES to "create a
   * shipment from this order?" on the success card.
   *
   * Never called by the save itself. Filing an order and building a load are two
   * decisions, and firing this on save is how a filed order used to walk straight
   * into shipment preparation without the shipper asking for it. The order id is
   * what a shipment's cargo lines carry, so the caller gets it without re-reading
   * the order.
   */
  onCreateShipment?: (orderId: string, reference: string | null) => void;
  /** True while a turn is streaming — the form stays readable, just not editable. */
  disabled?: boolean;
}

/**
 * A collapsible picker over the bundle's sites. Used for both optional legs.
 *
 * Tapping the chosen row clears it, because both sites are optional on an order
 * and a picker with no way back would make a stray tap permanent.
 */
function SitePicker({
  T, label, rows, chosenId, disabled, onPick,
}: {
  T: ThemeTokens;
  label: string;
  rows: OrderFlowBundle['locations'];
  chosenId: string | null;
  disabled?: boolean;
  onPick: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const filtered = useFilter(
    rows,
    search,
    (row, needle) =>
      row.name.toLowerCase().includes(needle) ||
      (row.city ?? '').toLowerCase().includes(needle) ||
      (row.company ?? '').toLowerCase().includes(needle),
  );

  return (
    <div style={{ flex: '1 1 100%' }}>
      <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 10.5, color: T.t3, marginLeft: 6 }}>{t('vagonai.orderForm.more.optional', 'optional')}</span>
      {rows.length > 6 && (
        <input
          value={search}
          disabled={disabled}
          placeholder={t('vagonai.orderForm.more.siteSearch', 'Search your sites…')}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle(T), marginTop: 5 }}
        />
      )}
      <div className="flex flex-col" style={{ gap: 4, marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
        {filtered.map((row) => {
          const on = chosenId === row.id;
          return (
            <PickRow
              key={row.id}
              T={T}
              title={row.name}
              subtitle={[row.company, row.city].filter(Boolean).join(' · ') || null}
              selected={on}
              disabled={disabled}
              onClick={() => onPick(on ? null : row.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * One line's product: a picker over the catalog, with a typed name as the
 * fallback.
 *
 * The picker is the preferred path because `productId` is what a load built from
 * this order reuses as its cargo `product_id`. Typing is still allowed — MYVAGON
 * accepts a bare `product_name`, and an order for something not in the catalog is
 * real — so the typed case is warned about by `orderWarnings` rather than blocked.
 *
 * The result list only appears once something has been typed into the search box.
 * A hundred products under every one of an order's lines is a scroll, not a
 * picker, and the lines are the part of this form there can be fifty of.
 */
function LineProductPicker({
  T, bundle, line, disabled, invalid, onPick, onType,
}: {
  T: ThemeTokens;
  bundle: OrderFlowBundle;
  line: OrderDraftLine;
  disabled?: boolean;
  invalid: boolean;
  onPick: (product: OrderFlowProduct) => void;
  onType: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const filtered = useFilter(
    bundle.products,
    search,
    (row, needle) => row.name.toLowerCase().includes(needle) || (row.sku ?? '').toLowerCase().includes(needle),
  );
  const chosen = useMemo(
    () => (line.productId ? bundle.products.find((row) => row.id === line.productId) ?? null : null),
    [bundle.products, line.productId],
  );

  if (chosen) {
    return (
      <PickRow
        T={T}
        title={chosen.name}
        subtitle={[chosen.sku, chosen.category].filter(Boolean).join(' · ') || null}
        selected
        disabled={disabled}
        onClick={() => onType('')}
      />
    );
  }

  return (
    <div>
      {bundle.products.length > 0 && (
        <>
          <input
            value={search}
            disabled={disabled}
            placeholder={t('vagonai.orderForm.product.search', 'Search your products…')}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle(T)}
          />
          {search.trim().length > 0 && (
            <div className="flex flex-col" style={{ gap: 4, marginTop: 6, maxHeight: 150, overflowY: 'auto' }}>
              {filtered.map((product) => (
                <PickRow
                  key={product.id}
                  T={T}
                  title={product.name}
                  subtitle={[product.sku, product.category].filter(Boolean).join(' · ') || null}
                  selected={false}
                  disabled={disabled}
                  onClick={() => {
                    setSearch('');
                    onPick(product);
                  }}
                />
              ))}
              {filtered.length === 0 && (
                <span style={{ fontSize: 11, color: T.t3 }}>
                  {t('vagonai.orderForm.product.noMatch', 'Nothing matched. You can type the product name below instead.')}
                </span>
              )}
            </div>
          )}
        </>
      )}
      <Field
        T={T}
        label={
          bundle.products.length > 0
            ? t('vagonai.orderForm.product.typeName', 'Or type a product name')
            : t('vagonai.orderForm.product.name', 'Product name')
        }
      >
        <input
          value={line.productName}
          disabled={disabled}
          placeholder={t('vagonai.orderForm.product.namePlaceholder', 'Frozen Peas 2kg')}
          onChange={(e) => onType(e.target.value)}
          style={{ ...inputStyle(T), borderColor: invalid ? '#DC2626' : T.bd }}
        />
      </Field>
    </div>
  );
}

export default function CreateOrderForm({ event, T, onSubmit, onCreateShipment, disabled }: Props) {
  const { t } = useTranslation();
  const tr = useTr();
  const bundle: OrderFlowBundle = event.bundle;
  const [draft, setDraft] = useState<OrderDraft>(() => emptyOrderDraft(bundle));
  const [customerSearch, setCustomerSearch] = useState('');
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ reason: string; missing: string[] } | null>(null);
  const [saved, setSaved] = useState<OrderSubmitResult['done'] | null>(null);
  /** The shipper's answer to "create a shipment from this order?" — null until they pick. */
  const [shipmentChoice, setShipmentChoice] = useState<'yes' | 'no' | null>(null);

  const locked = disabled || busy || saved !== null;

  const patch = (next: Partial<OrderDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setRefusal(null);
  };

  const patchLine = (index: number, next: Partial<OrderDraftLine>) => {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line, i) => (i === index ? { ...line, ...next } : line)),
    }));
    setRefusal(null);
  };

  const customers = useFilter(
    bundle.customers,
    customerSearch,
    (row, needle) => row.name.toLowerCase().includes(needle) || (row.vat ?? '').toLowerCase().includes(needle),
  );

  const issues = orderIssues(draft, tr);
  const warnings = orderWarnings(draft, bundle, tr);
  const clash = referenceClashOf(draft, bundle);

  // A blocked save the shipper cannot fix by pressing again. The reference clash
  // is in here rather than in `orderIssues` because it is not a malformed field —
  // the ID is perfectly valid, it is just already taken.
  const cannotSave = issues.length > 0 || clash !== null;
  const blocking = clash
    ? t('vagonai.orderForm.blocking.referenceInUse', 'That order ID is already in use. Change it before filing.')
    : (issues[0]?.message ?? null);

  const invalid = (field: string) => refusal?.missing.includes(field) ?? false;

  const save = async () => {
    setBusy(true);
    setRefusal(null);
    try {
      const result = await onSubmit(serializeOrderDraft(draft));
      if (!result.ok) {
        setRefusal({
          reason: result.reason ?? t('vagonai.orderForm.refusalFallback', 'This order could not be filed yet.'),
          missing: result.missing ?? [],
        });
        return;
      }
      setSaved(result.done ?? null);
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    const unmatched = saved.unmatchedProducts;
    return (
      <Shell T={T}>
        <Heading T={T} icon={<CircleCheck size={15} />} title={t('vagonai.orderForm.saved.title', 'Order filed')} />
        <div className="flex flex-col" style={{ gap: 3, fontSize: 13, color: T.t1 }}>
          <span style={{ fontWeight: 650 }}>{saved.reference ?? saved.orderId}</span>
          {saved.customerName && <span style={{ fontSize: 12, color: T.t3 }}>{saved.customerName}</span>}
          <span style={{ fontSize: 12, color: T.t3 }}>
            {saved.deliveryDate
              ? `${t('vagonai.orderForm.saved.due', 'Due {{date}}', { date: saved.deliveryDate })} · `
              : ''}
            {t(
              'vagonai.orderForm.saved.lineCount',
              saved.lineCount === 1 ? '{{count}} product line' : '{{count}} product lines',
              { count: saved.lineCount },
            )}
          </span>
        </div>
        {/* The sentence the whole flow is for. An order that reads as a shipment
            is the bug this replaced, so the success card states what has NOT
            happened before it offers the step that would make it happen. */}
        <Notes
          T={T}
          notes={[
            t(
              'vagonai.orderForm.saved.notLoad',
              'This is an order in your Orders Master, not a load. Nothing has been sent to a carrier and no shipment exists for it yet.',
            ),
            // Only once they have said "not now": while the question below is
            // open it would be a second way of asking the same thing.
            ...(shipmentChoice === 'no'
              ? [
                t(
                  'vagonai.orderForm.saved.nextStep',
                  'Ask me to build a load from it whenever you are ready — the order already holds the customer, the products and the dates.',
                ),
              ]
              : []),
            ...(unmatched.length > 0
              ? [
                t(
                  'vagonai.orderForm.saved.unmatched',
                  unmatched.length === 1
                    ? '{{names}} is not in your Product Master yet. A load built from this order will need it added first.'
                    : '{{names}} are not in your Product Master yet. A load built from this order will need them added first.',
                  { names: unmatched.join(', '), count: unmatched.length },
                ),
              ]
              : []),
          ]}
        />
        {/* The next step is ASKED, never taken. Answered once: after either
            button the question is gone, so a second click cannot start a
            second shipment. */}
        {onCreateShipment && shipmentChoice === null && (
          <div style={{ marginTop: 12 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.t1 }}>
              {t('vagonai.orderForm.saved.askShipment', 'Do you want to create a shipment with this order?')}
            </span>
            <div className="flex items-center justify-end" style={{ gap: 7, marginTop: 8 }}>
              <Button T={T} variant="ghost" disabled={disabled} onClick={() => setShipmentChoice('no')}>
                {t('vagonai.orderForm.saved.shipmentNo', 'Not now')}
              </Button>
              <Button
                T={T}
                disabled={disabled}
                icon={<Truck size={14} />}
                onClick={() => {
                  setShipmentChoice('yes');
                  onCreateShipment(saved.orderId, saved.reference);
                }}
              >
                {t('vagonai.orderForm.saved.shipmentYes', 'Yes, create a shipment')}
              </Button>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  return (
    <Shell T={T}>
      <Heading
        T={T}
        icon={<ClipboardList size={15} />}
        title={t('vagonai.orderForm.title', 'Create an order')}
        hint={t(
          'vagonai.orderForm.hint',
          'An order records freight you have sold. It does not post a load — you can build one from it afterwards.',
        )}
      />

      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <Field T={T} label={t('vagonai.orderForm.fields.orderId', 'Order ID')}>
          <input
            value={draft.orderReference}
            disabled={locked}
            placeholder="ORD-1042"
            onChange={(e) => patch({ orderReference: e.target.value })}
            style={{
              ...inputStyle(T),
              borderColor: clash ? '#B45309' : invalid('orderReference') ? '#DC2626' : T.bd,
            }}
          />
        </Field>
        <Field T={T} label={t('vagonai.orderForm.fields.deliveryDate', 'Delivery date')}>
          <input
            type="date"
            value={draft.deliveryDate}
            disabled={locked}
            onChange={(e) => patch({ deliveryDate: e.target.value })}
            style={{ ...inputStyle(T), borderColor: invalid('deliveryDate') ? '#DC2626' : T.bd }}
          />
        </Field>
        <Field T={T} label={t('vagonai.orderForm.fields.shipDate', 'Ship date')}>
          <input
            type="date"
            value={draft.shipDate ?? ''}
            disabled={locked}
            onChange={(e) => patch({ shipDate: e.target.value || null })}
            style={{ ...inputStyle(T), borderColor: invalid('shipDate') ? '#DC2626' : T.bd }}
          />
        </Field>
      </div>
      <span style={{ display: 'block', fontSize: 10.5, color: T.t3, marginTop: 4 }}>
        {t(
          'vagonai.orderForm.fields.hint',
          'Your own order ID — it has to be one you have not used before. The ship date is optional, and a date in the past is fine.',
        )}
      </span>

      {/* The customer. A picker over their own records, with a typed name as the
          fallback: MYVAGON requires only the name, so an order for a one-off
          buyer with no company record is perfectly valid. */}
      <div style={{ marginTop: 12 }}>
        <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{t('vagonai.orderForm.customer.label', 'Customer')}</span>
        {bundle.customers.length > 6 && (
          <input
            value={customerSearch}
            disabled={locked}
            placeholder={t('vagonai.orderForm.customer.search', 'Search your customers…')}
            onChange={(e) => setCustomerSearch(e.target.value)}
            style={{ ...inputStyle(T), marginTop: 5 }}
          />
        )}
        <div className="flex flex-col" style={{ gap: 4, marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
          {customers.map((customer) => (
            <PickRow
              key={customer.id}
              T={T}
              title={customer.name}
              subtitle={[customer.vat, customer.email].filter(Boolean).join(' · ') || null}
              badge={customer.isPartner ? t('vagonai.orderForm.customer.partnerBadge', 'Partner') : undefined}
              selected={draft.customerId === customer.id}
              disabled={locked}
              /* The name travels with the id. Sending an id alongside somebody
                 else's name is the one way this form can file an order against
                 the wrong company and still look right. */
              onClick={() =>
                draft.customerId === customer.id
                  ? patch({ customerId: null, customerName: '' })
                  : patch({ customerId: customer.id, customerName: customer.name })
              }
            />
          ))}
        </div>
        <Field
          T={T}
          label={
            bundle.customers.length > 0
              ? t('vagonai.orderForm.customer.typeName', 'Or type a customer name')
              : t('vagonai.orderForm.customer.name', 'Customer name')
          }
        >
          <input
            value={draft.customerId ? '' : draft.customerName}
            disabled={locked || draft.customerId !== null}
            placeholder="Alphavita SA"
            onChange={(e) => patch({ customerName: e.target.value, customerId: null })}
            style={{ ...inputStyle(T), borderColor: invalid('customerName') ? '#DC2626' : T.bd }}
          />
        </Field>
      </div>

      {/* The lines. Each needs a product, a quantity and a weight — the three
          things a load built from this order will read back off it. */}
      <div style={{ marginTop: 14 }}>
        <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
          {t('vagonai.orderForm.lines.heading', 'Products on this order')}
        </span>
        <div className="flex flex-col" style={{ gap: 10, marginTop: 6 }}>
          {draft.lines.map((line, i) => (
            <div key={i} className="rounded-lg" style={{ border: `1px solid ${T.bd}`, padding: 9 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>{t('vagonai.orderForm.lines.line', 'Line {{line}}', { line: i + 1 })}</span>
                {draft.lines.length > 1 && (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => patch({ lines: draft.lines.filter((_, j) => j !== i) })}
                    aria-label={t('vagonai.orderForm.lines.remove', 'Remove line {{line}}', { line: i + 1 })}
                    style={{
                      background: 'none', border: 0, color: '#DC2626', padding: 0,
                      cursor: locked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <LineProductPicker
                T={T}
                bundle={bundle}
                line={line}
                disabled={locked}
                invalid={invalid(`lines[${i}].productName`)}
                onPick={(product) => patchLine(i, setLineProduct(line, product))}
                onType={(name) => patchLine(i, { productId: null, productName: name })}
              />
              <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
                <Field T={T} label={t('vagonai.orderForm.lines.quantity', 'Quantity')}>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.qty ?? ''}
                    disabled={locked}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      patchLine(i, { qty: e.target.value === '' || !Number.isFinite(value) ? null : value });
                    }}
                    style={{ ...inputStyle(T), borderColor: invalid(`lines[${i}].qty`) ? '#DC2626' : T.bd }}
                  />
                </Field>
                <Field T={T} label={t('vagonai.orderForm.lines.unit', 'Unit')}>
                  <select
                    value={line.unit}
                    disabled={locked}
                    onChange={(e) => patchLine(i, { unit: e.target.value as OrderQtyUnit })}
                    style={inputStyle(T)}
                  >
                    {ORDER_QTY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{t(`vagonai.orderForm.units.${QTY_UNIT_KEYS[unit]}`, unit)}</option>
                    ))}
                  </select>
                </Field>
                <Field T={T} label={t('vagonai.orderForm.lines.weight', 'Weight')}>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.weight ?? ''}
                    disabled={locked}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      patchLine(i, { weight: e.target.value === '' || !Number.isFinite(value) ? null : value });
                    }}
                    style={{ ...inputStyle(T), borderColor: invalid(`lines[${i}].weight`) ? '#DC2626' : T.bd }}
                  />
                </Field>
                <Field T={T} label={t('vagonai.orderForm.lines.weightUnit', 'Weight unit')}>
                  <select
                    value={line.weightUnit}
                    disabled={locked}
                    onChange={(e) => patchLine(i, { weightUnit: e.target.value as OrderWeightUnit })}
                    style={inputStyle(T)}
                  >
                    {ORDER_WEIGHT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{t(`vagonai.orderForm.units.${WEIGHT_UNIT_KEYS[unit]}`, unit)}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <Button
            T={T}
            variant="ghost"
            disabled={locked || draft.lines.length >= 50}
            onClick={() => patch({ lines: [...draft.lines, emptyOrderLine(bundle)] })}
            icon={<Plus size={13} />}
          >
            {t('vagonai.orderForm.lines.addAnother', 'Add another product')}
          </Button>
        </div>
      </div>

      {/* Everything below is optional. Behind a disclosure because the order ID,
          the customer, the dates and the lines are the whole first screen — and
          because the two sites in here get settled on the load, not the order. */}
      <button
        type="button"
        onClick={() => setMore((open) => !open)}
        className="inline-flex items-center"
        style={{
          gap: 5, marginTop: 12, fontSize: 12, fontWeight: 600, color: T.t2,
          background: 'none', border: 0, cursor: 'pointer', padding: 0,
        }}
      >
        {more ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {t('vagonai.orderForm.more.toggle', 'More details (all optional)')}
      </button>

      {more && (
        <div className="flex flex-wrap" style={{ gap: 10, marginTop: 9 }}>
          {bundle.locations.length > 0 && (
            <>
              <SitePicker
                T={T}
                label={t('vagonai.orderForm.more.shipFrom', 'Ship from')}
                rows={bundle.locations.filter((row) => row.role !== 'delivery')}
                chosenId={draft.originLocationId}
                disabled={locked}
                onPick={(id) => patch({ originLocationId: id })}
              />
              <SitePicker
                T={T}
                label={t('vagonai.orderForm.more.shipTo', 'Ship to')}
                rows={bundle.locations.filter((row) => row.role !== 'pickup')}
                chosenId={draft.destLocationId}
                disabled={locked}
                onPick={(id) => patch({ destLocationId: id })}
              />
            </>
          )}
          <Field T={T} label={t('vagonai.orderForm.more.erpReference', 'ERP reference')}>
            <input
              value={draft.erpReference ?? ''}
              disabled={locked}
              placeholder={t('vagonai.orderForm.more.erpPlaceholder', 'The ID this order has in your own system')}
              onChange={(e) => patch({ erpReference: e.target.value })}
              style={inputStyle(T)}
            />
          </Field>
          <Field T={T} label={t('vagonai.orderForm.more.orderValue', 'Order value')}>
            <input
              type="number"
              min={0}
              step="any"
              value={draft.orderValue ?? ''}
              disabled={locked}
              onChange={(e) => {
                const value = Number(e.target.value);
                patch({ orderValue: e.target.value === '' || !Number.isFinite(value) ? null : value });
              }}
              style={{ ...inputStyle(T), borderColor: invalid('orderValue') ? '#DC2626' : T.bd }}
            />
          </Field>
          <Field T={T} label={t('vagonai.orderForm.more.notes', 'Notes')}>
            <input
              value={draft.notes ?? ''}
              disabled={locked}
              onChange={(e) => patch({ notes: e.target.value })}
              style={inputStyle(T)}
            />
          </Field>
          <label className="flex items-center" style={{ gap: 6, flex: '1 1 100%', fontSize: 12, color: T.t2 }}>
            <input
              type="checkbox"
              checked={draft.highPriority}
              disabled={locked}
              onChange={(e) => patch({ highPriority: e.target.checked })}
            />
            {t('vagonai.orderForm.more.highPriority', 'Flag this order as high priority')}
          </label>
        </div>
      )}

      <Notes T={T} notes={bundle.notes} />
      <Notes T={T} notes={warnings} />
      {refusal && <Notes T={T} tone="warn" notes={[refusal.reason]} />}

      <div className="flex items-center justify-end" style={{ gap: 7, marginTop: 13 }}>
        <Button T={T} onClick={save} disabled={locked || cannotSave} icon={busy ? undefined : <Save size={14} />}>
          {busy ? t('vagonai.orderForm.submit.filing', 'Filing…') : t('vagonai.orderForm.submit.file', 'File order')}
        </Button>
      </div>
      {cannotSave && blocking && (
        <p style={{ fontSize: 11, color: T.t3, textAlign: 'right', marginTop: 5 }}>{blocking}</p>
      )}
    </Shell>
  );
}
