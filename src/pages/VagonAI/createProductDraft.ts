/**
 * The draft the guided add-product form fills in, and the rules it checks it
 * against.
 *
 * Same contract as `createShipmentDraft.ts` beside it: one object, held for the
 * length of the form, written by every input and sent once. There is no per-field
 * endpoint because there is no per-field state on the server.
 *
 * ## This validation is an affordance, not a gate
 *
 * Everything in `productIssues` is re-derived server-side, which trusts neither
 * this file nor the model. What it is for is telling the shipper *before* they
 * press Save, so the answer to "why is this disabled" is on screen rather than one
 * round trip away. If the two ever disagree the server wins, and its `missing[]`
 * names the field to go back to.
 *
 * Pure, and deliberately free of React so it can be reasoned about on its own.
 */
import type { ProductFlowBundle, ProductFlowProduct } from '../../hooks/useChat';
import { englishTr, type Tr } from './i18n';

/** Exactly the units the gateway accepts, and the only ones the picker offers. */
export const WEIGHT_UNITS = ['g', 'kg', 't'] as const;
export type ProductWeightUnit = (typeof WEIGHT_UNITS)[number];

/**
 * The four fields a product TYPE supplies when the shipper leaves them blank.
 *
 * Blank means inherit, and the form has to render it that way. An empty
 * temperature is not "Ambient", it is "whatever Frozen Foods says" - so each of
 * these needs an explicit inherit state distinct from every value the shipper
 * could pick, and `null` is what that state sends.
 */
export const INHERITED_FIELDS = ['temperature', 'palletType', 'hazardous', 'stackable'] as const;

export interface ProductDraft {
  name: string;
  /** A type id from `bundle.categories[].types[]`. Never typed by hand. */
  typeId: string;
  skuNumber: string | null;
  barcode: string | null;
  /** Packaging, free text: "Case", "Pallet", "Each". NOT a cargo line's unit. */
  unit: string | null;
  /**
   * A number and a unit, never a string.
   *
   * The API takes weight as one free-text value whose unit is part of it ("12.5
   * kg") and refuses a bare number, because 12.5 could be kilos or tonnes and
   * reading it wrong is a thousand-fold error on every load the product later
   * goes on. The gateway joins these two; the form must not.
   */
  weight: { value: number; unit: ProductWeightUnit } | null;
  temperature: string | null;
  palletType: string | null;
  hazardous: boolean | null;
  stackable: boolean | null;
  tags: string[] | null;
}

export interface ProductIssue {
  /** The draft path the gateway would name in `missing[]`, so both agree. */
  field: string;
  message: string;
}

export function emptyProductDraft(): ProductDraft {
  return {
    name: '',
    typeId: '',
    skuNumber: null,
    barcode: null,
    unit: null,
    weight: null,
    temperature: null,
    palletType: null,
    hazardous: null,
    stackable: null,
    tags: null,
  };
}

/** Only the categories that can actually be chosen. A category with no types cannot. */
export function selectableCategories(bundle: ProductFlowBundle) {
  return bundle.categories.filter((category) => category.types.length > 0);
}

/** The category a chosen type belongs to, for the picker's own display. */
export function categoryOfType(bundle: ProductFlowBundle, typeId: string) {
  return bundle.categories.find((category) => category.types.some((type) => type.id === typeId)) ?? null;
}

export function typeName(bundle: ProductFlowBundle, typeId: string): string | null {
  for (const category of bundle.categories) {
    const type = category.types.find((t) => t.id === typeId);
    if (type) return type.name;
  }
  return null;
}

/**
 * What stops Save, in the order the form asks for it.
 *
 * `field` values are the gateway's own draft paths, so a server refusal and a
 * local one focus the same input.
 */
export function productIssues(draft: ProductDraft, tr: Tr = englishTr): ProductIssue[] {
  const issues: ProductIssue[] = [];

  if (draft.name.trim().length === 0) {
    issues.push({ field: 'name', message: tr('vagonai.productForm.issues.nameRequired', 'A product needs a name.') });
  } else if (draft.name.trim().length > 255) {
    issues.push({
      field: 'name',
      message: tr('vagonai.productForm.issues.nameTooLong', 'A product name cannot be longer than 255 characters.'),
    });
  }

  if (draft.typeId.trim().length === 0) {
    issues.push({
      field: 'typeId',
      message: tr(
        'vagonai.productForm.issues.typeRequired',
        'Choose the product type — it is what files the product under a category.',
      ),
    });
  }

  if (draft.weight) {
    if (!Number.isFinite(draft.weight.value) || draft.weight.value < 0.001) {
      issues.push({
        field: 'weight.value',
        message: tr('vagonai.productForm.issues.weightNotPositive', 'Weight per unit must be greater than zero.'),
      });
    } else if (draft.weight.value > 1_000_000) {
      issues.push({
        field: 'weight.value',
        message: tr('vagonai.productForm.issues.weightTooLarge', 'Weight per unit is implausibly large — check the unit.'),
      });
    }
  }

  if (draft.skuNumber && draft.skuNumber.trim().length > 255) {
    issues.push({
      field: 'skuNumber',
      message: tr('vagonai.productForm.issues.skuTooLong', 'A SKU code cannot be longer than 255 characters.'),
    });
  }

  return issues;
}

/**
 * The product this draft would collide with, if any.
 *
 * Two products cannot share a name under the same type. Checked here so the
 * clash surfaces while the shipper is still looking at the name field, rather
 * than as a 502 after they have pressed Save - which is all the conversational
 * path can do.
 *
 * Returns null when either half of the pair is still blank: a name with no type
 * chosen yet cannot collide with anything, and warning then would fire on every
 * keystroke of a product that is going to be fine.
 */
export function duplicateOf(draft: ProductDraft, bundle: ProductFlowBundle): ProductFlowProduct | null {
  const name = draft.name.trim().toLowerCase();
  if (name.length === 0 || draft.typeId.length === 0) return null;

  return (
    bundle.products.find(
      (product) => product.typeId === draft.typeId && product.name.trim().toLowerCase() === name,
    ) ?? null
  );
}

/**
 * The SKU code this draft would collide with, if any.
 *
 * Unlike the name, SKU codes are unique across the WHOLE catalog rather than per
 * type, so this ignores `typeId`. Only checked for a code the shipper actually
 * typed: a blank one is derived server-side and a derived collision is suffixed
 * automatically, so there is nothing to warn about.
 */
export function skuClashOf(draft: ProductDraft, bundle: ProductFlowBundle): ProductFlowProduct | null {
  const code = draft.skuNumber?.trim().toLowerCase() ?? '';
  if (code.length === 0) return null;

  return bundle.products.find((product) => product.sku?.trim().toLowerCase() === code) ?? null;
}

/**
 * The sentence for a duplicate, or null.
 *
 * A deactivated product gets a different sentence pointing at a different fix: it
 * cannot go on a load until it is reactivated in the Product Master, which the
 * chatbot cannot do for them.
 */
export function duplicateMessage(clash: ProductFlowProduct | null, tr: Tr = englishTr): string | null {
  if (!clash) return null;
  const params = { name: clash.name };
  return clash.active
    ? tr(
        'vagonai.productForm.duplicate.active',
        'You already have a product called "{{name}}" under this type. Use that one rather than saving a second.',
        params,
      )
    : tr(
        'vagonai.productForm.duplicate.deactivated',
        'You have a product called "{{name}}" under this type, but it is deactivated. It has to be reactivated in the Product Master before it can go on a load.',
        params,
      );
}

/** Real, but not blocking — shown under the form so nothing is a surprise. */
export function productWarnings(draft: ProductDraft, bundle: ProductFlowBundle, tr: Tr = englishTr): string[] {
  const warnings: string[] = [];

  const blank = INHERITED_FIELDS.filter((field) => draft[field] === null);
  if (blank.length > 0) {
    warnings.push(
      tr(
        'vagonai.productForm.warnings.inheritDefaults',
        'The product type’s own defaults will apply for anything you left blank in More details — you can change them in the Product Master.',
      ),
    );
  }

  if (!draft.skuNumber || draft.skuNumber.trim().length === 0) {
    warnings.push(
      tr('vagonai.productForm.warnings.skuGenerated', 'A SKU code will be generated from the name. You can replace it later.'),
    );
  }

  if (bundle.truncated.products !== undefined) {
    warnings.push(
      tr(
        'vagonai.productForm.warnings.catalogTruncated',
        'The duplicate check can only see part of your catalog, so it may not spot a clash with an older product. Saving is still refused if there is one.',
      ),
    );
  }

  return warnings;
}

/** Strips the blanks the gateway treats as absent, so the payload says what it means. */
export function serializeProductDraft(draft: ProductDraft): ProductDraft {
  const text = (value: string | null) => {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  };
  const tags = (draft.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0);

  return {
    name: draft.name.trim(),
    typeId: draft.typeId,
    skuNumber: text(draft.skuNumber),
    barcode: text(draft.barcode),
    unit: text(draft.unit),
    weight: draft.weight,
    temperature: text(draft.temperature),
    palletType: text(draft.palletType),
    hazardous: draft.hazardous,
    stackable: draft.stackable,
    tags: tags.length > 0 ? tags : null,
  };
}
