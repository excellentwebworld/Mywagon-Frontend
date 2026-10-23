/**
 * Create-in-place (CONTRACT.md §8.10, MS3-397): the location and cargo widgets expose `canCreate`, and tapping it is
 * CLIENT-LOCAL — the host mounts the existing `CreateAddressForm` / `CreateProductForm` (fed by the existing
 * `GET /chat/flow-context/{location|product}`, `fetchFlowContext`) beneath the still-visible parent widget. On success the
 * host asks R4 for the new record by name and posts the answer for it unless the shipper un-ticks "use it now".
 * No new route, no new answer type, no model turn.
 *
 * The widgets only know this small interface, so they stay free of the forms (which hold hooks, a map, a Places field) and of
 * the page's submit handlers; `IntakeWidgetHost` builds the kit from the page's own `handleAddressSubmit` / `handleProductSubmit`.
 */
import type { ReactNode } from 'react';
import type { Directory } from './contract';

export type CreateKind = 'location' | 'product';

/** What a saved form tells the widget. `city` only for a site. */
export interface CreatedRecord { kind: CreateKind; id: string; name: string; city?: string | null }

export interface IntakeCreateKit {
  /** The flow-context bundle for the form (`fetchFlowContext`). Rejects when the gateway cannot give one. */
  open: (kind: CreateKind) => Promise<unknown>;
  /** The existing form for a bundle `open` returned. `directory` opens the site form on that directory (MS3-355: customers). */
  form: (
    kind: CreateKind, bundle: unknown,
    handlers: { onSaved: (record: CreatedRecord) => void; onCancel: () => void; directory?: Directory },
  ) => ReactNode;
}

/** One state for the nested step, whatever it creates. */
export type CreateState = { kind: CreateKind; status: 'loading' | 'error' } | { kind: CreateKind; status: 'ready'; bundle: unknown };
