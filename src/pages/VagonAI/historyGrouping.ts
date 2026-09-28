import type { ConversationSummary } from './api/conversationsService';

export type HistoryGroupLabel = 'today' | 'yesterday' | 'previous7' | 'older';

export interface ConversationGroup {
  label: HistoryGroupLabel;
  items: ConversationSummary[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
