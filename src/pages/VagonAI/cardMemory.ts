/**
 * Keeps the dashboard and report cards across a page reload (QA retest #4).
 *
 * The gateway's transcript is text only, so a chat reopened after a reload is
 * redrawn from the words alone. For most turns that is the whole answer. For a
 * dashboard or a report it is not: the reply is written to sit on top of its
 * card ("the card under your reply already shows every figure"), and without it
 * the shipper reads three bullets about numbers they can no longer see.
 *
 * So the browser files those two kinds of card under the chat's id when the turn
 * settles, and puts them back on the matching reply when the chat is reopened -
 * matched by the reply's text, or failing that by its position among the
 * replies. It is a picture of what the shipper saw then, not a fresh query.
 * Bounded (MAX_CHATS chats, MAX_CARDS_PER_CHAT each) and cleared with the chat.
 */
import type { ResultCardSet } from '../../hooks/useChat';

export const CARD_MEMORY_KEY = 'vagonai.cardMemory.v1';
const MAX_CHATS = 40;
const MAX_CARDS_PER_CHAT = 20;
const REMEMBERED_KINDS: ReadonlyArray<ResultCardSet['kind']> = ['analytics', 'report'];

export interface RememberedCard {
  /** Position among the chat's replies that have text, 0-based. */
  ordinal: number;
  /** The reply's text, whitespace-collapsed - the primary match. */
  text: string;
  records: ResultCardSet;
}

interface Store {
  /** Most recently written chat last. */
  order: string[];
  chats: Record<string, RememberedCard[]>;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null; // storage disabled (privacy mode): the cards just are not kept
  }
}

function read(storage: Storage | null): Store {
  if (!storage) return { order: [], chats: {} };
  try {
    const parsed = JSON.parse(storage.getItem(CARD_MEMORY_KEY) ?? 'null') as Store | null;
    if (parsed && Array.isArray(parsed.order) && parsed.chats && typeof parsed.chats === 'object') return parsed;
  } catch {
    /* unreadable: start over */
  }
  return { order: [], chats: {} };
}

function write(storage: Storage | null, store: Store): void {
  if (!storage) return;
  try {
    if (store.order.length === 0) storage.removeItem(CARD_MEMORY_KEY);
    else storage.setItem(CARD_MEMORY_KEY, JSON.stringify(store));
  } catch {
    /* quota: the card is simply not kept */
  }
}

export function isRememberedKind(records: ResultCardSet | null | undefined): records is ResultCardSet {
  return Boolean(records && REMEMBERED_KINDS.includes(records.kind));
}

/** Files a settled reply's dashboard/report card under its chat. */
export function rememberCard(
  conversationId: string,
  card: { ordinal: number; text: string; records: ResultCardSet },
  storage: Storage | null = defaultStorage(),
): void {
  if (!conversationId || !isRememberedKind(card.records)) return;
  const store = read(storage);
  const list = (store.chats[conversationId] ?? []).filter((c) => c.ordinal !== card.ordinal && c.records.id !== card.records.id);
  list.push({ ordinal: card.ordinal, text: norm(card.text), records: card.records });
  store.chats[conversationId] = list.slice(-MAX_CARDS_PER_CHAT);
  store.order = [...store.order.filter((id) => id !== conversationId), conversationId];
  while (store.order.length > MAX_CHATS) {
    const evicted = store.order.shift()!;
    delete store.chats[evicted];
  }
  write(storage, store);
}

/**
 * Puts remembered cards back on a reopened transcript. `messages` is the thread
 * as rebuilt from the gateway's text; a reply already carrying records is left alone.
 */
export function restoreCards<T extends { who: 'user' | 'ai'; text: string; records?: ResultCardSet }>(
  conversationId: string,
  messages: T[],
  storage: Storage | null = defaultStorage(),
): T[] {
  const remembered = read(storage).chats[conversationId];
  if (!remembered?.length) return messages;
  const replies = messages.map((m, i) => ({ m, i })).filter(({ m }) => m.who === 'ai' && norm(m.text) !== '');
  const used = new Set<number>();
  const placed = new Map<number, ResultCardSet>();
  // First by text, which survives a reply moving; then by position.
  for (const card of remembered) {
    const hit = replies.find(({ m, i }) => !used.has(i) && norm(m.text) === card.text);
    if (hit) {
      used.add(hit.i);
      placed.set(hit.i, card.records);
    }
  }
  for (const card of remembered) {
    if ([...placed.values()].includes(card.records)) continue;
    const at = replies[card.ordinal];
    if (at && !used.has(at.i)) {
      used.add(at.i);
      placed.set(at.i, card.records);
    }
  }
  if (placed.size === 0) return messages;
  return messages.map((m, i) => (placed.has(i) && !m.records ? { ...m, records: placed.get(i) } : m));
}

/** Position of thread[index] among the replies that have text - what `rememberCard` keys on. */
export function replyOrdinal<T extends { who: 'user' | 'ai'; text: string }>(thread: T[], index: number): number {
  let n = -1;
  for (let i = 0; i <= index && i < thread.length; i += 1) {
    if (thread[i]!.who === 'ai' && norm(thread[i]!.text) !== '') n += 1;
  }
  return n;
}

export function forgetCards(conversationId: string | null, storage: Storage | null = defaultStorage()): void {
  const store = read(storage);
  if (conversationId === null) {
    write(storage, { order: [], chats: {} });
    return;
  }
  if (!store.chats[conversationId]) return;
  delete store.chats[conversationId];
  store.order = store.order.filter((id) => id !== conversationId);
  write(storage, store);
}
