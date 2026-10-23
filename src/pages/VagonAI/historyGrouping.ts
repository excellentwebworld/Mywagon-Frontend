import type { ConversationSummary } from './api/conversationsService';

export type HistoryGroupLabel = 'today' | 'yesterday' | 'previous7' | 'older';

export interface ConversationGroup {
  label: HistoryGroupLabel;
  items: ConversationSummary[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many past conversations the history panel lists. */
export const HISTORY_LIMIT = 5;

/**
 * The title the gateway gives a chat that an order import opened before any
 * message was sent (`ensureConversationForUser`). It is not localized there.
 */
export const ORDER_IMPORT_TITLE = 'Order import';

/** How many of those import-only chats are listed, on top of HISTORY_LIMIT. */
export const IMPORT_HISTORY_LIMIT = 1;

function isImportChat(c: ConversationSummary): boolean {
  return (c.title ?? '').trim() === ORDER_IMPORT_TITLE;
}

/**
 * The `limit` most recently active conversations, newest first, plus the newest
 * "Order import" chat. The gateway already sorts this way; sorting again keeps
 * the cut correct if it ever stops.
 *
 * Every file dropped into a fresh chat opens an "Order import" chat, so four
 * imports pushed four real conversations out of the five slots (QA 2026-10-10).
 * Import chats no longer take those slots: the newest one is listed beside them
 * and older ones count as hidden, like any chat past the limit.
 */
export function recentConversations(conversations: ConversationSummary[], limit = HISTORY_LIMIT): ConversationSummary[] {
  const sorted = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const chats = sorted.filter((c) => !isImportChat(c)).slice(0, limit);
  const imports = sorted.filter(isImportChat).slice(0, IMPORT_HISTORY_LIMIT);
  const keep = new Set([...chats, ...imports]);
  return sorted.filter((c) => keep.has(c));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysBefore(now: Date, date: Date): number {
  return Math.floor((startOfDay(now) - startOfDay(date)) / DAY_MS);
}

/** Buckets conversations by recency (Today/Yesterday/Previous 7 days/Older), most recent group first. */
export function groupConversationsByRecency(conversations: ConversationSummary[], now = new Date()): ConversationGroup[] {
  const buckets: Record<HistoryGroupLabel, ConversationSummary[]> = {
    today: [], yesterday: [], previous7: [], older: [],
  };

  conversations.forEach((c) => {
    const diffDays = daysBefore(now, new Date(c.updatedAt));
    if (diffDays <= 0) buckets.today.push(c);
    else if (diffDays === 1) buckets.yesterday.push(c);
    else if (diffDays <= 7) buckets.previous7.push(c);
    else buckets.older.push(c);
  });

  return (['today', 'yesterday', 'previous7', 'older'] as const)
    .map((label) => ({ label, items: buckets[label] }))
    .filter((group) => group.items.length > 0);
}

/** Short, contextual timestamp for a history row: time-of-day today, weekday this week, else a date. */
export function formatConversationTimestamp(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const diffDays = daysBefore(now, date);

  if (diffDays <= 0) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays <= 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
