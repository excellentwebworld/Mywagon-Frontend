/**
 * The review step of a bulk order import, as pure functions over the ERP
 * wizard's own row model (`OrderPreviewRow`), so the chat card and the ERP
 * Orders page agree on what a row is, what it still needs, and what is sent.
 *
 * Kept out of OrderImportReviewCard.tsx so it can be tested in vitest's node
 * environment, which has no DOM.
 */
import type { AiMappedOrder } from '../../api/types/erpOrders';
import {
  applyOrderPatch,
  initOrderPreviewRows,
  orderRowProblems,
  toConfirmImportOrders,
  type OrderPreviewRow,
  type OrderRowProblem,
} from '../../components/ErpOrders/ordersAiWizardUtils';
import type { OrderImportPreview, PreviewOrder } from './api/orderImportService';

export type { OrderRowProblem } from '../../components/ErpOrders/ordersAiWizardUtils';

/**
 * MS3-403: the customer is optional on an imported order (Laravel's AiConfirmImportRequest no longer requires it), as on
 * the ERP Orders page. Only a customer that was typed but not picked from the list is still a problem.
 */
export const IMPORT_ROW_RULES = { customerRequired: false } as const;

export function initImportRows(preview: OrderImportPreview): OrderPreviewRow[] {
  return initOrderPreviewRows(preview.orders);
}

/**
 * What confirming this row will do to the shipper's existing orders.
 *
 * - `new`: no order has this reference.
 * - `updates`: an unplanned order has it; Laravel will overwrite it, and because
 *   the import carries no product lines, clear the lines it had.
 * - `will_fail`: a planned (or later) order has it; Laravel refuses that row.
 * - `unknown`: the lookup failed, so neither "new" nor "updates" can be claimed.
 */
export type ExistingBadge = 'new' | 'updates' | 'will_fail' | 'unknown';

export function existingBadge(row: OrderPreviewRow, existingChecked: boolean): ExistingBadge {
  if (!existingChecked) return 'unknown';
  const existing = (row.original as PreviewOrder).existing ?? null;
  if (!existing) return 'new';
  return existing.editable ? 'updates' : 'will_fail';
}

export function patchRow(rows: OrderPreviewRow[], id: string, patch: Partial<AiMappedOrder>): OrderPreviewRow[] {
  return rows.map((r) => (r.id === id ? applyOrderPatch(r, patch) : r));
}

export function toggleRow(rows: OrderPreviewRow[], id: string): OrderPreviewRow[] {
  return rows.map((r) => (r.id === id ? { ...r, status: r.status === 'accepted' ? 'rejected' : 'accepted' } : r));
}

export function setAllRows(rows: OrderPreviewRow[], status: OrderPreviewRow['status']): OrderPreviewRow[] {
  return rows.map((r) => ({ ...r, status }));
}

/** The customer is never in the file, so most imports set one for every row at once. */
export function applyCustomerToAccepted(
  rows: OrderPreviewRow[],
  customer: { id: number; name: string } | null,
): OrderPreviewRow[] {
  return rows.map((r) =>
    r.status !== 'accepted'
      ? r
      : applyOrderPatch(r, {
          company_entity_id: customer ? customer.id : null,
          customer_name: customer ? customer.name : null,
          inferred: { ...r.order.inferred, customer: !customer },
        }),
  );
}

export interface ImportReviewSummary {
  total: number;
  accepted: number;
  rejected: number;
  /** Accepted rows that will overwrite an existing unplanned order. */
  updates: number;
  /** Accepted rows Laravel will refuse because the order is already planned. */
  willFail: number;
  /** Accepted rows still missing something, by what they miss. */
  problems: Record<OrderRowProblem, number>;
  /** Accepted rows with no problem at all. */
  ready: number;
}

export function summarizeReview(rows: OrderPreviewRow[], existingChecked: boolean): ImportReviewSummary {
  const summary: ImportReviewSummary = {
    total: rows.length,
    accepted: 0,
    rejected: 0,
    updates: 0,
    willFail: 0,
    problems: { order_reference: 0, customer: 0, delivery_date: 0 },
    ready: 0,
  };
  for (const row of rows) {
    if (row.status !== 'accepted') {
      summary.rejected += 1;
      continue;
    }
    summary.accepted += 1;
    const badge = existingBadge(row, existingChecked);
    if (badge === 'updates') summary.updates += 1;
    if (badge === 'will_fail') summary.willFail += 1;
    const problems = orderRowProblems(row, IMPORT_ROW_RULES);
    for (const p of problems) summary.problems[p] += 1;
    if (problems.length === 0) summary.ready += 1;
  }
  return summary;
}

/**
 * Why the Import button is disabled, or null when it is not. Stated rather
 * than merely greyed out: a shipper looking at forty rows cannot be expected
 * to find the one with no customer by themselves.
 */
export type ImportBlocker = 'none_accepted' | OrderRowProblem;

export function importBlocker(summary: ImportReviewSummary): ImportBlocker | null {
  if (summary.accepted === 0) return 'none_accepted';
  if (summary.problems.customer > 0) return 'customer';
  if (summary.problems.delivery_date > 0) return 'delivery_date';
  if (summary.problems.order_reference > 0) return 'order_reference';
  return null;
}

/** Exactly what the ERP wizard sends to confirm-import. */
export function importPayload(rows: OrderPreviewRow[]): AiMappedOrder[] {
  return toConfirmImportOrders(rows);
}

/**
 * The two columns Laravel requires, for the found/missing check. Laravel
 * reports missing ones by these exact labels (`ParsesErpOrdersImportFile`).
 */
export type RequiredColumn = 'order_id' | 'delivery_date';

export function requiredColumnStates(missing: string[]): Record<RequiredColumn, 'found' | 'missing'> {
  const has = (label: string) => missing.some((m) => m.trim().toLowerCase() === label);
  return {
    order_id: has('order id') ? 'missing' : 'found',
    delivery_date: has('delivery date') ? 'missing' : 'found',
  };
}
