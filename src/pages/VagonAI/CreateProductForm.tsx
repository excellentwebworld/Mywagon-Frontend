/**
 * CreateProductForm — the guided add-product form.
 *
 * Opens when a turn delivers a `flow_context` event with `flow: "create_product"`,
 * and then runs entirely on the client. The whole category tree arrived in that
 * one bundle, so **there is no /chat call while the form is open** — same rule as
 * the shipment cards beside it, and the same reason.
 *
 * ## Why this is a form and not an interview
 *
 * `create_product` needs a `type_id` from the shipper's own catalog. The
 * conversational path gets there by having the model read a capped list of
 * categories and pick one, which is exactly where an id gets invented. Here the
 * tree is on screen and the shipper walks it: category, then type. An invented id
 * is not discouraged, it is unreachable.
 *
 * Two shapes carry that intent and should not be "simplified" away:
 *
 *   - The type picker is a CASCADE, not a text input. A category with no types is
 *     shown and disabled, because a product cannot be filed without a type and a
 *     silently-missing option reads as a missing category.
 *   - Weight is a NUMBER and a UNIT, never a string. The API takes "12.5 kg" and
 *     refuses a bare number, because 12.5 could be kilos or tonnes and reading it
 *     wrong is a thousand-fold error on every load the product later goes on.
 *
 * ## Blank means inherit
 *
 * The four fields under More details default to the product type's own values,
 * and the controls say so in words rather than leaving an empty box that reads as
 * "none". `hazardous` is three-state — inherit / yes / no — because a checkbox
 * cannot express the difference between "not dangerous" and "ask the type", and
 * filling in the wrong one produces a record that looks correct and gets the load
 * carried wrong.
 */
import { useMemo, useState } from 'react';
import { Package, CircleCheck, Save, ChevronDown, ChevronRight } from 'lucide-react';
import type { FlowContextEvent, ProductFlowBundle } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Field, Heading, Notes, PickRow, Shell } from './flowPrimitives';
import { inputStyle, useFilter } from './flowHelpers';
import {
  WEIGHT_UNITS, categoryOfType, duplicateMessage, duplicateOf, emptyProductDraft,
  productIssues, productWarnings, selectableCategories, serializeProductDraft, skuClashOf,
  type ProductDraft, type ProductWeightUnit,
} from './createProductDraft';
import { useTr } from './i18n';

/**
 * The datalist suggestions, each with the locale key for the label the shipper
 * reads. The VALUE stays English: it is what gets saved, and a packaging unit is
 * mapped back onto a cargo line's unit by its English name. A null key is a code
 * ("EUR", "-18C") that reads the same in every language and gets no label.
 */
const PACKAGING_OPTIONS: [string, string][] = [
  ['Each', 'each'], ['Case', 'case'], ['Box', 'box'], ['Bag', 'bag'],
  ['Pallet', 'pallet'], ['Crate', 'crate'], ['Drum', 'drum'], ['Roll', 'roll'],
];
const TEMPERATURE_OPTIONS: [string, string | null][] = [
  ['Ambient', 'ambient'], ['Chilled', 'chilled'], ['Frozen', 'frozen'], ['+2 to +8C', 'twoToEight'], ['-18C', null],
];
const PALLET_OPTIONS: [string, string | null][] = [
  ['EUR', null], ['EUR2', null], ['Industrial', 'industrial'], ['Half', 'half'], ['None', 'none'],
];

export interface ProductSubmitResult {
  ok: boolean;
  missing?: string[];
  reason?: string;
  /** Set when the product was actually written. Drives the success card. */
  done?: {
    productId: string;
    name: string;
    skuNumber: string | null;
    category: string | null;
    type: string | null;
    inheritedMessage?: string;
    generatedSku?: string;
  };
}

interface Props {
  /**
   * Narrowed to this flow's own event, exactly as `CreateShipmentFlow` is.
   * The bundles differ in shape, so the caller does the switch.
   */
  event: Extract<FlowContextEvent, { flow: 'create_product' }>;
  T: ThemeTokens;
  onSubmit: (draft: ProductDraft) => Promise<ProductSubmitResult>;
  /**
   * Called with the new product's id once it is saved.
   *
   * The reason this flow can open from inside the shipment wizard: a shipper who
   * needs a product mid-load adds it and the cargo line takes the id straight
   * away, with nothing to re-fetch.
   */
  onSaved?: (productId: string, name: string) => void;
  /** True while a turn is streaming — the form stays readable, just not editable. */
  disabled?: boolean;
}

/** A three-state control for a field whose blank means "inherit from the type". */
function Tristate({
  T, label, value, onChange, hint, disabled,
}: {
  T: ThemeTokens; label: string; value: boolean | null;
  onChange: (next: boolean | null) => void; hint: string; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const options: { key: string; label: string; value: boolean | null }[] = [
    { key: 'inherit', label: t('vagonai.productForm.tristate.inherit', 'Use type default'), value: null },
    { key: 'yes', label: t('vagonai.productForm.tristate.yes', 'Yes'), value: true },
    { key: 'no', label: t('vagonai.productForm.tristate.no', 'No'), value: false },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 4, flex: '1 1 100%' }}>
      <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{label}</span>
      <div className="flex flex-wrap" style={{ gap: 5 }}>
        {options.map((option) => {
          const on = value === option.value;
          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className="rounded-lg"
              style={{
                height: 30, padding: '0 11px', fontSize: 12, fontWeight: 600,
                border: `1px solid ${on ? T.ac : T.bd}`,
                background: on ? T.al : 'transparent',
                color: on ? T.ac : T.t2,
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span style={{ fontSize: 10.5, color: T.t3 }}>{hint}</span>
    </div>
  );
}

export default function CreateProductForm({ event, T, onSubmit, onSaved, disabled }: Props) {
  const { t } = useTranslation();
  const tr = useTr();
  const bundle: ProductFlowBundle = event.bundle;
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft);
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ reason: string; missing: string[] } | null>(null);
  const [saved, setSaved] = useState<ProductSubmitResult['done'] | null>(null);
  const [tagText, setTagText] = useState('');

  const locked = disabled || busy || saved !== null;
  // A datalist option's label, only when it differs from the saved value: in
  // English the option renders exactly as it did before, with no label at all.
  const optionLabel = (value: string, key: string) => {
    const label = t(`vagonai.productForm.options.${key}`, value);
    return label !== value ? label : undefined;
  };
  const patch = (next: Partial<ProductDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setRefusal(null);
  };

  const categories = useMemo(() => selectableCategories(bundle), [bundle]);
  const filtered = useFilter(
    categories,
    search,
    (category, needle) =>
      category.name.toLowerCase().includes(needle) ||
      category.types.some((type) => type.name.toLowerCase().includes(needle)),
  );

  const chosenCategory = categoryId
    ? (bundle.categories.find((c) => c.id === categoryId) ?? null)
    : categoryOfType(bundle, draft.typeId);

  const issues = productIssues(draft, tr);
  const clash = duplicateOf(draft, bundle);
  const clashText = duplicateMessage(clash, tr);
  const skuClash = skuClashOf(draft, bundle);
  const warnings = productWarnings(draft, bundle, tr);

  // A blocked save the shipper cannot fix by pressing again. The duplicate is in
  // here rather than in `productIssues` because it is not a malformed field - the
  // name is perfectly valid, it is just already taken.
  const cannotSave = issues.length > 0 || clash !== null || skuClash !== null;

  const save = async () => {
    setBusy(true);
    setRefusal(null);
    try {
      const result = await onSubmit(serializeProductDraft(draft));
      if (!result.ok) {
        setRefusal({
          reason: result.reason ?? t('vagonai.productForm.refusalFallback', 'This product could not be saved yet.'),
          missing: result.missing ?? [],
        });
        return;
      }
      setSaved(result.done ?? null);
      if (result.done) onSaved?.(result.done.productId, result.done.name);
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    return (
      <Shell T={T}>
        <Heading T={T} icon={<CircleCheck size={15} />} title={t('vagonai.productForm.saved.title', 'Product added')} />
        <div className="flex flex-col" style={{ gap: 3, fontSize: 13, color: T.t1 }}>
          <span style={{ fontWeight: 650 }}>{saved.name}</span>
          {saved.type && (
            <span style={{ fontSize: 12, color: T.t3 }}>
              {saved.category ? `${saved.category} · ${saved.type}` : saved.type}
            </span>
          )}
          {saved.skuNumber && (
            <span style={{ fontSize: 12, color: T.t3 }}>
              {t('vagonai.productForm.saved.sku', 'SKU {{sku}}', { sku: saved.skuNumber })}
            </span>
          )}
        </div>
        <Notes
          T={T}
          notes={[
            ...(saved.generatedSku
              ? [
                t(
                  'vagonai.productForm.saved.generatedSku',
                  'The SKU code {{sku}} was generated from the name — you can replace it in the Product Master.',
                  { sku: saved.generatedSku },
                ),
              ]
              : []),
            ...(saved.inheritedMessage ? [saved.inheritedMessage] : []),
          ]}
        />
      </Shell>
    );
  }

  return (
    <Shell T={T}>
      <Heading
        T={T}
        icon={<Package size={15} />}
        title={t('vagonai.productForm.title', 'Add a product')}
        hint={t(
          'vagonai.productForm.hint',
          categories.length === 1 ? '{{count}} category to file it under' : '{{count}} categories to file it under',
          { count: categories.length },
        )}
      />

      {categories.length === 0 ? (
        // Said plainly rather than shown as an empty picker. Nothing on this form
        // can be saved without a type, and the fix is not in the chatbot.
        <Notes
          T={T}
          tone="warn"
          notes={[
            t(
              'vagonai.productForm.noCategories',
              'Your product catalog has no categories with types under them, and a product cannot be filed without a type. Set the catalog up in the Product Master first.',
            ),
          ]}
        />
      ) : (
        <>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Field T={T} label={t('vagonai.productForm.fields.name', 'Product name')}>
              <input
                value={draft.name}
                disabled={locked}
                placeholder={t('vagonai.productForm.fields.namePlaceholder', 'Frozen Peas 2kg')}
                onChange={(e) => patch({ name: e.target.value })}
                style={{
                  ...inputStyle(T),
                  borderColor: clash ? '#B45309' : refusal?.missing.includes('name') ? '#DC2626' : T.bd,
                }}
              />
            </Field>
          </div>
          {clashText && <Notes T={T} tone="warn" notes={[clashText]} />}

          {/* The cascade. Category first, then the types under it — never a free
              text input, which is the whole reason this form exists. */}
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
              {t('vagonai.productForm.category.label', 'Category and type')}
            </span>
            {categories.length > 6 && (
              <input
                value={search}
                disabled={locked}
                placeholder={t('vagonai.productForm.category.search', 'Search categories and types…')}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle(T), marginTop: 5 }}
              />
            )}
            <div className="flex flex-col" style={{ gap: 5, marginTop: 6, maxHeight: 210, overflowY: 'auto' }}>
              {filtered.map((category) => {
                const open = chosenCategory?.id === category.id;
                return (
                  <div key={category.id}>
                    <PickRow
                      T={T}
                      title={category.name}
                      subtitle={t(
                        'vagonai.productForm.category.typeCount',
                        category.types.length === 1 ? '{{count}} type' : '{{count}} types',
                        { count: category.types.length },
                      )}
                      selected={open}
                      disabled={locked}
                      onClick={() => {
                        setCategoryId(open ? '' : category.id);
                        // Choosing a different category invalidates the type under
                        // the old one — cleared rather than left to save a
                        // mismatched pair.
                        if (!open && categoryOfType(bundle, draft.typeId)?.id !== category.id) patch({ typeId: '' });
                      }}
                    />
                    {open && (
                      <div className="flex flex-col" style={{ gap: 4, marginTop: 4, paddingLeft: 14 }}>
                        {category.types.map((type) => (
                          <PickRow
                            key={type.id}
                            T={T}
                            title={type.name}
                            selected={draft.typeId === type.id}
                            disabled={locked}
                            onClick={() => patch({ typeId: type.id })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Shown, and shown disabled: a category that silently vanished
                  reads to the shipper as a category they have lost. */}
              {bundle.categories
                .filter((category) => category.types.length === 0)
                .map((category) => (
                  <PickRow
                    key={category.id}
                    T={T}
                    title={category.name}
                    subtitle={t(
                      'vagonai.productForm.category.noTypes',
                      'No product types yet — set one up in the Product Master',
                    )}
                    selected={false}
                    disabled
                    onClick={() => undefined}
                  />
                ))}
            </div>
          </div>

          {/* Everything below is optional, and behind a disclosure because the
              name and the type are the whole first screen. */}
          <button
            type="button"
            onClick={() => setMore((open) => !open)}
            className="inline-flex items-center"
            style={{ gap: 5, marginTop: 12, fontSize: 12, fontWeight: 600, color: T.t2, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          >
            {more ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {t('vagonai.productForm.more.toggle', 'More details (all optional)')}
          </button>

          {more && (
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 9 }}>
              <Field T={T} label={t('vagonai.productForm.more.sku', 'SKU code')}>
                <input
                  value={draft.skuNumber ?? ''}
                  disabled={locked}
                  placeholder={t('vagonai.productForm.more.skuPlaceholder', 'Generated from the name')}
                  onChange={(e) => patch({ skuNumber: e.target.value })}
                  style={{ ...inputStyle(T), borderColor: skuClash ? '#B45309' : T.bd }}
                />
              </Field>
              <Field T={T} label={t('vagonai.productForm.more.barcode', 'Barcode')}>
                <input
                  value={draft.barcode ?? ''}
                  disabled={locked}
                  onChange={(e) => patch({ barcode: e.target.value })}
                  style={inputStyle(T)}
                />
              </Field>
              <Field T={T} label={t('vagonai.productForm.more.packagingUnit', 'Packaging unit')}>
                <input
                  value={draft.unit ?? ''}
                  disabled={locked}
                  placeholder={t('vagonai.productForm.more.packagingPlaceholder', 'Case, Pallet, Each…')}
                  list="vai-packaging"
                  onChange={(e) => patch({ unit: e.target.value })}
                  style={inputStyle(T)}
                />
              </Field>
              <datalist id="vai-packaging">
                {PACKAGING_OPTIONS.map(([option, key]) => (
                  <option key={option} value={option} label={optionLabel(option, `packaging.${key}`)} />
                ))}
              </datalist>

              <Field T={T} label={t('vagonai.productForm.more.weightPerUnit', 'Weight per unit')}>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.weight?.value ?? ''}
                  disabled={locked}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    // A cleared field is "not tracked", not zero — and zero would
                    // be refused, which is the wrong answer to an empty input.
                    patch({
                      weight: e.target.value === '' || !Number.isFinite(value)
                        ? null
                        : { value, unit: draft.weight?.unit ?? (bundle.defaults.weightUnit as ProductWeightUnit) },
                    });
                  }}
                  style={{
                    ...inputStyle(T),
                    borderColor: refusal?.missing.includes('weight.value') ? '#DC2626' : T.bd,
                  }}
                />
              </Field>
              <Field T={T} label={t('vagonai.productForm.more.weightUnit', 'Weight unit')}>
                <select
                  value={draft.weight?.unit ?? bundle.defaults.weightUnit}
                  disabled={locked || draft.weight === null}
                  onChange={(e) =>
                    patch({
                      weight: draft.weight
                        ? { ...draft.weight, unit: e.target.value as ProductWeightUnit }
                        : null,
                    })
                  }
                  style={inputStyle(T)}
                >
                  {WEIGHT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </Field>

              <Field T={T} label={t('vagonai.productForm.more.temperature', 'Carriage temperature')}>
                <input
                  value={draft.temperature ?? ''}
                  disabled={locked}
                  placeholder={t('vagonai.productForm.more.typeDefaultPlaceholder', "Blank = the type's default")}
                  list="vai-temperature"
                  onChange={(e) => patch({ temperature: e.target.value })}
                  style={inputStyle(T)}
                />
              </Field>
              <datalist id="vai-temperature">
                {TEMPERATURE_OPTIONS.map(([option, key]) => (
                  <option key={option} value={option} label={key ? optionLabel(option, `temperature.${key}`) : undefined} />
                ))}
              </datalist>
              <Field T={T} label={t('vagonai.productForm.more.palletType', 'Pallet type')}>
                <input
                  value={draft.palletType ?? ''}
                  disabled={locked}
                  placeholder={t('vagonai.productForm.more.typeDefaultPlaceholder', "Blank = the type's default")}
                  list="vai-pallet"
                  onChange={(e) => patch({ palletType: e.target.value })}
                  style={inputStyle(T)}
                />
              </Field>
              <datalist id="vai-pallet">
                {PALLET_OPTIONS.map(([option, key]) => (
                  <option key={option} value={option} label={key ? optionLabel(option, `pallet.${key}`) : undefined} />
                ))}
              </datalist>

              <Tristate
                T={T}
                label={t('vagonai.productForm.more.hazardous', 'Dangerous goods (ADR)')}
                value={draft.hazardous}
                disabled={locked}
                onChange={(next) => patch({ hazardous: next })}
                hint={t('vagonai.productForm.more.typeDefaultHint', 'Left on the type default unless you say otherwise.')}
              />
              <Tristate
                T={T}
                label={t('vagonai.productForm.more.stackable', 'Pallets can be stacked')}
                value={draft.stackable}
                disabled={locked}
                onChange={(next) => patch({ stackable: next })}
                hint={t('vagonai.productForm.more.typeDefaultHint', 'Left on the type default unless you say otherwise.')}
              />

              <Field T={T} label={t('vagonai.productForm.more.tags', 'Tags')}>
                <input
                  value={tagText}
                  disabled={locked}
                  placeholder={t('vagonai.productForm.more.tagsPlaceholder', 'frozen, retail')}
                  onChange={(e) => {
                    setTagText(e.target.value);
                    const tags = e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean);
                    patch({ tags: tags.length > 0 ? tags : null });
                  }}
                  style={inputStyle(T)}
                />
              </Field>
            </div>
          )}

          <Notes T={T} notes={bundle.notes} />
          <Notes T={T} notes={warnings} />
          {refusal && <Notes T={T} tone="warn" notes={[refusal.reason]} />}

          <div className="flex items-center justify-end" style={{ gap: 7, marginTop: 13 }}>
            <Button
              T={T}
              onClick={save}
              disabled={locked || cannotSave}
              icon={busy ? undefined : <Save size={14} />}
            >
              {busy ? t('vagonai.productForm.submit.saving', 'Saving…') : t('vagonai.productForm.submit.save', 'Save product')}
            </Button>
          </div>
          {cannotSave && issues.length > 0 && (
            <p style={{ fontSize: 11, color: T.t3, textAlign: 'right', marginTop: 5 }}>
              {issues[0]!.message}
            </p>
          )}
        </>
      )}
    </Shell>
  );
}
