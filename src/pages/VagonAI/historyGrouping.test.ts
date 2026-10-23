import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, ORDER_IMPORT_TITLE, recentConversations } from './historyGrouping';
import type { ConversationSummary } from './api/conversationsService';

const conv = (id: string, updatedAt: string): ConversationSummary => ({
  id, title: id, createdAt: updatedAt, updatedAt,
});

describe('recentConversations', () => {
  it('keeps only the five most recently active chats', () => {
    const list = Array.from({ length: 8 }, (_, i) => conv(`c${i}`, `2026-09-${String(10 + i).padStart(2, '0')}T10:00:00Z`));
    const recent = recentConversations(list);
    expect(HISTORY_LIMIT).toBe(5);
    expect(recent.map((c) => c.id)).toEqual(['c7', 'c6', 'c5', 'c4', 'c3']);
  });

  it('orders by last activity even when the input is unsorted', () => {
    const list = [
      conv('old', '2026-09-01T10:00:00Z'),
      conv('newest', '2026-09-29T10:00:00Z'),
      conv('mid', '2026-09-15T10:00:00Z'),
    ];
    expect(recentConversations(list).map((c) => c.id)).toEqual(['newest', 'mid', 'old']);
  });

  it('returns everything when there are fewer than the limit, without mutating the input', () => {
    const list = [conv('a', '2026-09-01T10:00:00Z'), conv('b', '2026-09-02T10:00:00Z')];
    const recent = recentConversations(list);
    expect(recent).toHaveLength(2);
    expect(list.map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('recentConversations — "Order import" chats (QA 2026-10-10)', () => {
  const imp = (id: string, updatedAt: string): ConversationSummary => ({
    id, title: ORDER_IMPORT_TITLE, createdAt: updatedAt, updatedAt,
  });

  it('does not let import chats push real chats out of the five slots', () => {
    const chats = Array.from({ length: 5 }, (_, i) => conv(`c${i}`, `2026-10-10T0${i}:00:00Z`));
    const imports = Array.from({ length: 4 }, (_, i) => imp(`i${i}`, `2026-10-10T1${i}:00:00Z`));
    const recent = recentConversations([...chats, ...imports]).map((c) => c.id);
    expect(recent).toEqual(['i3', 'c4', 'c3', 'c2', 'c1', 'c0']);
  });

  it('lists the newest import chat even when there are few others', () => {
    const recent = recentConversations([conv('a', '2026-10-01T10:00:00Z'), imp('i0', '2026-10-02T10:00:00Z'), imp('i1', '2026-10-03T10:00:00Z')]);
    expect(recent.map((c) => c.id)).toEqual(['i1', 'a']);
  });
});
