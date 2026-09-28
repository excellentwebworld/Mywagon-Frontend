/**
 * MS3-339 — post structured learning events to the chat gateway.
 *
 * Field edits on an AI draft are fire-and-forget: a logging failure must never
 * block the shipper from finishing the card. Confirms are also emitted
 * server-side on save/publish; this path covers in-card edits before submit.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';

export type LearningEventType =
  | 'field_edit'
  | 'confirm'
  | 'carrier_accept'
  | 'carrier_reject'
  | 'delivery_outcome';

export type LearningEventSource = 'chat' | 'guided_flow' | 'api' | 'system';

export interface LearningEventInput {
  event_type: LearningEventType;
  conversation_id?: string;
  run_id?: string;
  draft_id?: string | number;
  shipment_id?: string | number;
  field_path?: string;
  previous_value?: unknown;
  new_value?: unknown;
  outcome?: string;
  source: LearningEventSource;
  metadata?: Record<string, unknown>;
}

/** Best-effort POST — never throws to callers. */
export async function postLearningEvent(
  input: LearningEventInput,
  locale?: string,
): Promise<boolean> {
  try {
    const token = getStoredToken();
    if (!token) return false;
    await gatewayFetch('/vagon-ai/learning-events', {
      method: 'POST',
      token,
      locale,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Emit one field_edit per leaf that changed between `prev` and `next`.
 * Caps at 20 paths so a wholesale seed merge does not spam the log.
 */
export function postDraftFieldEdits(opts: {
  prev: unknown;
  next: unknown;
  conversationId?: string | null;
  locale?: string;
  source?: LearningEventSource;
}): void {
  const paths = diffLeaves(opts.prev, opts.next).slice(0, 20);
  if (paths.length === 0) return;
  const conversation_id = opts.conversationId ?? undefined;
  const source = opts.source ?? 'guided_flow';
  for (const { path, previous_value, new_value } of paths) {
    void postLearningEvent(
      {
        event_type: 'field_edit',
        conversation_id,
        field_path: path,
        previous_value,
        new_value,
        source,
      },
      opts.locale,
    );
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function diffLeaves(
  prev: unknown,
  next: unknown,
  base = '',
): Array<{ path: string; previous_value: unknown; new_value: unknown }> {
  if (Object.is(prev, next)) return [];
  if (isPlainObject(prev) && isPlainObject(next)) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    const out: Array<{ path: string; previous_value: unknown; new_value: unknown }> = [];
    for (const key of keys) {
      const path = base ? `${base}.${key}` : key;
      out.push(...diffLeaves(prev[key], next[key], path));
    }
    return out;
  }
  if (Array.isArray(prev) && Array.isArray(next)) {
    const len = Math.max(prev.length, next.length);
    const out: Array<{ path: string; previous_value: unknown; new_value: unknown }> = [];
    for (let i = 0; i < len; i += 1) {
      out.push(...diffLeaves(prev[i], next[i], `${base}[${i}]`));
    }
    return out;
  }
  return [{ path: base || '(root)', previous_value: prev, new_value: next }];
}
