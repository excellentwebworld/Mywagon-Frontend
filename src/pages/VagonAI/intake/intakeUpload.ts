/**
 * The upload hand-off (CONTRACT.md §5.1 `upload_offer` / `pick_orders`): "Yes, upload the file" posts `upload_offer`
 * and the page hands the shipper to the EXISTING import flow (`runOrderImports` → `ErpImportCard`); when that import
 * finishes, the page posts `pick_orders` with the order ids it created. This file holds the pure rules; the page owns
 * the file picker, the import and the toasts.
 *
 * Nothing here invents a route or a field: `pick_orders` is `{ orderIds: string[] }` of 1–20 ids (§5.1).
 */
import { createdOrderIds } from '../erpImport';
import type { ThreadMessage } from '../threadCards';
import type { IntakeAnswerWire, IntakeStepEvent } from './contract';
import { liveIndexByIntake } from './intakeThread';

type ImportSummary = Parameters<typeof createdOrderIds>[0];
type PickOrdersWire = Extract<IntakeAnswerWire, { step: 'pick_orders' }>;

/** §5.1: one load takes 1–20 orders. */
export const PICK_ORDERS_MAX = 20;

/** The load that sent the shipper to the import. */
export interface UploadHandoff { intakeId: string }

/** The live `pick_orders` step of that load — or null once the load moved on (the shipper typed something else, discarded, …). */
export function handoffTarget(thread: ThreadMessage[], handoff: UploadHandoff | null): IntakeStepEvent | null {
  if (!handoff) return null;
  const i = liveIndexByIntake(thread).get(handoff.intakeId);
  const s = i === undefined ? undefined : thread[i]?.intake;
  return s?.kind === 'event' && s.event.type === 'step' && s.event.step === 'pick_orders' ? s.event : null;
}

/** Order ids → the `pick_orders` answer: de-duplicated, at most 20; `capped` says some were left out. */
export function pickOrdersAnswer(ids: readonly string[]): { answer: PickOrdersWire | null; used: number; capped: boolean } {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter((id) => id.length > 0))];
  const orderIds = unique.slice(0, PICK_ORDERS_MAX);
  return { answer: orderIds.length > 0 ? { step: 'pick_orders', orderIds } : null, used: orderIds.length, capped: unique.length > PICK_ORDERS_MAX };
}

/** What the page does when an import finishes. */
export type HandoffResult =
  /** No hand-off is open: an ordinary import, nothing to do. */
  | { kind: 'idle' }
  /** The load is no longer waiting for orders: drop the hand-off, say nothing. */
  | { kind: 'moved_on' }
  /** The import created or updated no order: tell the shipper, keep the hand-off open for another file. */
  | { kind: 'empty' }
  | { kind: 'post'; event: IntakeStepEvent; wire: PickOrdersWire; used: number; capped: boolean };

export function handoffAfterImport(thread: ThreadMessage[], handoff: UploadHandoff | null, summary: ImportSummary): HandoffResult {
  if (!handoff) return { kind: 'idle' };
  const event = handoffTarget(thread, handoff);
  if (!event) return { kind: 'moved_on' };
  const { answer, used, capped } = pickOrdersAnswer(createdOrderIds(summary));
  return answer ? { kind: 'post', event, wire: answer, used, capped } : { kind: 'empty' };
}
