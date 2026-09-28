import { describe, expect, it } from 'vitest';
import type { ProductFlowBundle } from '../../hooks/useChat';
import {
  WEIGHT_UNITS, categoryOfType, duplicateMessage, duplicateOf, emptyProductDraft,
  productIssues, productWarnings, selectableCategories, serializeProductDraft, skuClashOf,
  typeName, type ProductDraft,
} from './createProductDraft';

/**
 * The add-product form's own rules, asserted without React.
 *
 * The cases worth knowing about:
 *
 * - **Blank means inherit, and `serializeProductDraft` has to keep it blank.** A
 *   whitespace-only temperature must reach the gateway as `null`, because the
 *   gateway reads a set value as "the shipper chose this" and stops asking the
 *   product type. That is how a frozen product ends up recorded as ambient.
 * - **A duplicate is not a malformed field.** It has to be reported separately
 *   from `productIssues`, because the name is perfectly valid — it is just taken,
 *   and the fix is a different name or the existing product's id.
 * - **A deactivated clash gets a different sentence**, pointing at the Product
 *   Master rather than at the form.
 */

function bundle(overrides: Partial<ProductFlowBundle> = {}): ProductFlowBundle {
  return {
    categories: [
      { id: '7', name: 'Frozen Foods', types: [{ id: '44', name: 'Frozen Vegetables' }, { id: '45', name: 'Ice Cream' }] },
      { id: '8', name: 'Dry Goods', types: [{ id: '51', name: 'Pasta' }] },
      { id: '9', name: 'Unset Category', types: [] },
    ],
    products: [
      { id: 'p1', name: 'Frozen Peas 2kg', sku: 'FROZEN-PEAS-2KG', typeId: '44', active: true },
      { id: 'p2', name: 'Old Sweetcorn', sku: 'OLD-CORN', typeId: '44', active: false },
    ],
    defaults: { weightUnit: 'kg' },
    rules: {},
    notes: [],
    truncated: {},
    ...overrides,
  };
}

function draft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  return { ...emptyProductDraft(), name: 'Frozen Carrots 1kg', typeId: '44', ...overrides };
}

describe('productIssues', () => {
  it('accepts a name and a type and nothing else', () => {
    expect(productIssues(draft())).toEqual([]);
  });

  it('names the field the gateway would name, so both focus the same input', () => {
    expect(productIssues(draft({ name: '   ' }))[0]!.field).toBe('name');
    expect(productIssues(draft({ typeId: '' }))[0]!.field).toBe('typeId');
    expect(productIssues(draft({ weight: { value: 0, unit: 'kg' } }))[0]!.field).toBe('weight.value');
  });

  it('reports every gap in one pass rather than one per attempt', () => {
    expect(productIssues(draft({ name: '', typeId: '' })).map((i) => i.field)).toEqual(['name', 'typeId']);
  });

  it('refuses a weight that would serialize as exponential notation', () => {
    expect(productIssues(draft({ weight: { value: 0.0000001, unit: 'kg' } }))).toHaveLength(1);
    expect(productIssues(draft({ weight: { value: 2_000_000, unit: 'kg' } }))).toHaveLength(1);
  });

  it('accepts a weight the form can actually produce', () => {
    for (const unit of WEIGHT_UNITS) {
      expect(productIssues(draft({ weight: { value: 12.5, unit } }))).toEqual([]);
    }
  });
});

describe('the category cascade', () => {
  it('hides no category but offers only the ones with types', () => {
    const b = bundle();
    expect(selectableCategories(b).map((c) => c.id)).toEqual(['7', '8']);
    // The empty one is still in the bundle, so the form can show it disabled — a
    // category that silently vanished reads as a category the shipper has lost.
    expect(b.categories).toHaveLength(3);
  });

  it('derives the category from the type, never the other way round', () => {
    expect(categoryOfType(bundle(), '51')?.name).toBe('Dry Goods');
    expect(categoryOfType(bundle(), 'nope')).toBeNull();
  });

  it('names a chosen type for display', () => {
    expect(typeName(bundle(), '45')).toBe('Ice Cream');
    expect(typeName(bundle(), 'nope')).toBeNull();
  });
});

describe('the duplicate check', () => {
  it('catches a clash on name and type together', () => {
    expect(duplicateOf(draft({ name: 'Frozen Peas 2kg' }), bundle())?.id).toBe('p1');
  });

  it('ignores case and surrounding space, because a shipper typing does both', () => {
    expect(duplicateOf(draft({ name: '  frozen peas 2KG ' }), bundle())?.id).toBe('p1');
  });

  it('does not fire on the same name under a different type', () => {
    expect(duplicateOf(draft({ name: 'Frozen Peas 2kg', typeId: '51' }), bundle())).toBeNull();
  });

  it('stays quiet until both halves of the pair are filled in', () => {
    expect(duplicateOf(draft({ name: '' }), bundle())).toBeNull();
    expect(duplicateOf(draft({ typeId: '' }), bundle())).toBeNull();
  });

  it('sends a deactivated clash somewhere different from a live one', () => {
    const live = duplicateMessage(duplicateOf(draft({ name: 'Frozen Peas 2kg' }), bundle()));
    const dead = duplicateMessage(duplicateOf(draft({ name: 'Old Sweetcorn' }), bundle()));
    expect(live).toMatch(/Use that one/i);
    expect(dead).toMatch(/deactivated/i);
    expect(dead).toMatch(/Product Master/);
  });

  it('checks a SKU code across the whole catalog, not per type', () => {
    // Codes are unique for the shipper, so the type is irrelevant here.
    expect(skuClashOf(draft({ skuNumber: 'old-corn', typeId: '51' }), bundle())?.id).toBe('p2');
  });

  it('says nothing about a blank SKU code, which is generated and suffixed for them', () => {
    expect(skuClashOf(draft({ skuNumber: null }), bundle())).toBeNull();
    expect(skuClashOf(draft({ skuNumber: '  ' }), bundle())).toBeNull();
  });
});

describe('serializeProductDraft', () => {
  it('turns a whitespace-only optional into null, so the type default still applies', () => {
    const out = serializeProductDraft(draft({ temperature: '   ', palletType: '', skuNumber: ' ' }));
    expect(out.temperature).toBeNull();
    expect(out.palletType).toBeNull();
    expect(out.skuNumber).toBeNull();
  });

  it('keeps an explicit false, which is an answer and not a blank', () => {
    const out = serializeProductDraft(draft({ hazardous: false, stackable: false }));
    expect(out.hazardous).toBe(false);
    expect(out.stackable).toBe(false);
  });

  it('leaves an untouched tristate null, so the type answers instead', () => {
    const out = serializeProductDraft(draft());
    expect(out.hazardous).toBeNull();
    expect(out.stackable).toBeNull();
  });

  it('trims the name and drops empty tags', () => {
    const out = serializeProductDraft(draft({ name: '  Frozen Carrots 1kg  ', tags: [' frozen ', '', '  '] }));
    expect(out.name).toBe('Frozen Carrots 1kg');
    expect(out.tags).toEqual(['frozen']);
  });

  it('sends null rather than an empty array when there are no tags', () => {
    expect(serializeProductDraft(draft({ tags: [] })).tags).toBeNull();
  });
});

describe('productWarnings', () => {
  it('says the type defaults will apply for anything left blank', () => {
    expect(productWarnings(draft(), bundle()).join(' ')).toMatch(/defaults will apply/i);
  });

  it('says a SKU code will be generated when none was given', () => {
    expect(productWarnings(draft(), bundle()).join(' ')).toMatch(/generated from the name/i);
  });

  it('admits the duplicate check is partial when the catalog was capped', () => {
    const warned = productWarnings(draft(), bundle({ truncated: { products: 100 } }));
    expect(warned.join(' ')).toMatch(/only see part of your catalog/i);
  });

  it('says nothing about a partial catalog when it saw all of it', () => {
    expect(productWarnings(draft(), bundle()).join(' ')).not.toMatch(/part of your catalog/i);
  });
});
