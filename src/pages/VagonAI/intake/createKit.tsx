/**
 * Builds the `IntakeCreateKit` (§8.10) from what the page already has: `fetchFlowContext` for the bundle, the existing
 * `CreateAddressForm` / `CreateProductForm` for the forms, and the page's own submit handlers (the same ones the old wizard
 * uses). Nothing new on the wire. Kept out of the widgets so they stay free of the forms' hooks, map and Places field.
 */
import type { ThemeTokens } from '../../../utils/themes';
import CreateAddressForm, { type AddressSubmitResult, type SavedAddress } from '../CreateAddressForm';
import CreateProductForm, { type ProductSubmitResult } from '../CreateProductForm';
import type { ProductDraft } from '../createProductDraft';
import { fetchFlowContext, type SubFlowBundle } from '../api/flowContextService';
import type { IntakeCreateKit } from './intakeCreate';

export interface CreateKitDeps {
  T: ThemeTokens;
  onSubmitAddress: (draft: Record<string, unknown>, runId?: string) => Promise<AddressSubmitResult>;
  onSubmitProduct: (draft: ProductDraft, runId?: string) => Promise<ProductSubmitResult>;
  disabled?: boolean;
  locale?: string;
  /** Test double / preview: replaces the network read. */
  fetchBundle?: (kind: 'product' | 'location') => Promise<SubFlowBundle>;
}

export function createKitOf(d: CreateKitDeps): IntakeCreateKit {
  const get = d.fetchBundle ?? ((kind) => fetchFlowContext(kind, d.locale));
  return {
    open: (kind) => get(kind),
    form: (kind, bundle, h) => {
      const b = bundle as SubFlowBundle;
      if (kind === 'location' && b.flow === 'create_location') {
        return (
          <CreateAddressForm
            key="intake-create-location"
            event={{ id: 'intake-create-location', flow: 'create_location', bundle: b.bundle }}
            T={d.T} onSubmit={d.onSubmitAddress} disabled={d.disabled}
            initialDirectory={h.directory}
            onSaved={(site: SavedAddress) => h.onSaved({ kind: 'location', id: site.id, name: site.name, city: site.city })}
            onCancel={h.onCancel}
          />
        );
      }
      if (kind === 'product' && b.flow === 'create_product') {
        return (
          <CreateProductForm
            key="intake-create-product"
            event={{ id: 'intake-create-product', flow: 'create_product', bundle: b.bundle }}
            T={d.T} onSubmit={d.onSubmitProduct} disabled={d.disabled}
            onSaved={(productId, name) => h.onSaved({ kind: 'product', id: productId, name })}
          />
        );
      }
      return null;
    },
  };
}
