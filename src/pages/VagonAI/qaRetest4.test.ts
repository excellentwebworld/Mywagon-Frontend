/**
 * QA retest #4 (2026-10-10), the web app's share:
 *  - item 2: in the Greek UI the network / stall / timeout sentences were English
 *    (only the Try again button was Greek);
 *  - item 5: the dashboard card was gone after a page reload.
 */
import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import en from '../../locale/en.json';
import el from '../../locale/el.json';
import { GatewayStalledError } from '../../hooks/streamWatchdog';
import type { ResultCardSet } from '../../hooks/useChat';
import { errorKindOf, messageForErrorKind, userFacingError } from '../../utils/userFacingError';
import { CARD_MEMORY_KEY, forgetCards, rememberCard, replyOrdinal, restoreCards } from './cardMemory';

type LiveCopy = Record<string, string>;
const liveCopy = (locale: unknown): LiveCopy => (locale as { vagonai: { live: LiveCopy } }).vagonai.live;
const EN = liveCopy(en);
const EL = liveCopy(el);

async function translators() {
  const inst = i18next.createInstance();
  await inst.init({ resources: { en: { translation: en }, el: { translation: el } }, lng: 'en', fallbackLng: 'en' });
  // The app's useTranslation wrapper: (key, fallback) -> t(key, { defaultValue }).
  const wrap = (fixed: ReturnType<typeof inst.getFixedT>) => (key: string, fallback?: string) =>
    fixed(key, { defaultValue: fallback }) as string;
  return { inst, wrap };
}

describe('item 2: the chat\'s own errors in the shipper\'s language', () => {
  it('renders the network, stalled and timeout sentences from el.json in a Greek UI', async () => {
    const { inst, wrap } = await translators();
    const elT = wrap(inst.getFixedT('el'));
    const live = EL;
    expect(messageForErrorKind('network', elT)).toBe(live.network);
    expect(messageForErrorKind('stalled', elT)).toBe(live.stalled);
    expect(messageForErrorKind('timeout', elT)).toBe(live.timeout);
    expect(userFacingError(new TypeError('Failed to fetch'), elT, 'x')).toBe(live.network);
    expect(userFacingError(new GatewayStalledError(), elT, 'x')).toBe(live.stalled);
    // and they really are Greek, not the English copy
    for (const k of ['network', 'stalled', 'timeout', 'retry']) {
      expect(live[k]).toMatch(/[\u0370-\u03FF]/);
      expect(live[k]).not.toBe(EN[k]);
    }
  });

  it('the root cause: a translator captured before the switch to Greek keeps speaking English', async () => {
    const { inst, wrap } = await translators();
    const captured = wrap(inst.getFixedT(inst.language)); // what a stale useCallback held
    await inst.changeLanguage('el');
    const current = wrap(inst.getFixedT(inst.language)); // what the page renders with
    expect(messageForErrorKind('network', captured)).toBe(EN.network);
    // So the page words the failure from its KIND, with its own translator.
    const kind = errorKindOf(new TypeError('Failed to fetch'));
    expect(kind).toBe('network');
    expect(messageForErrorKind(kind!, current)).toBe(EL.network);
  });

  it('classifies every chat failure the page words itself', () => {
    expect(errorKindOf(new GatewayStalledError())).toBe('stalled');
    expect(errorKindOf(new Error('The operation was aborted due to timeout'))).toBe('timeout');
    expect(errorKindOf(new TypeError('NetworkError when attempting to fetch resource.'))).toBe('network');
    expect(errorKindOf(new Error('Only Excel and CSV files can be imported.'))).toBeNull();
  });
});

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const dashboard: ResultCardSet = { id: 'res_dash', kind: 'analytics', title: 'Your dashboard', query: null, cards: [] };
const report: ResultCardSet = { id: 'res_rep', kind: 'report', title: 'Loads', query: null, cards: [] };
const shipments: ResultCardSet = { id: 'res_ship', kind: 'shipment', title: '3 shipments', query: null, cards: [] };

type Msg = { who: 'user' | 'ai'; text: string; records?: ResultCardSet };

describe('item 5: dashboard and report cards survive a reload', () => {
  const live: Msg[] = [
    { who: 'user', text: 'Show me my dashboard analytics.' },
    { who: 'ai', text: 'Here is your dashboard, all time.\n- **Attention:** 2 need action', records: dashboard },
    { who: 'user', text: 'Loads this month' },
    { who: 'ai', text: 'This month: 12 loads.', records: report },
  ];

  it('files the card when the turn settles and puts it back on the reopened transcript', () => {
    const storage = memoryStorage();
    rememberCard('c1', { ordinal: replyOrdinal(live, 1), text: live[1]!.text, records: dashboard }, storage);
    rememberCard('c1', { ordinal: replyOrdinal(live, 3), text: live[3]!.text, records: report }, storage);
    // After a reload the gateway gives text only (whitespace may differ).
    const reopened: Msg[] = live.map(({ who, text }) => ({ who, text: text.replace('\n', '  \n') }));
    const restored = restoreCards('c1', reopened, storage);
    expect(restored[1]!.records).toEqual(dashboard);
    expect(restored[3]!.records).toEqual(report);
    expect(restored[0]!.records).toBeUndefined();
  });

  it('falls back to the reply\'s position when its text changed', () => {
    const storage = memoryStorage();
    rememberCard('c1', { ordinal: 0, text: 'streamed wording', records: dashboard }, storage);
    const restored = restoreCards('c1', [{ who: 'user', text: 'q' }, { who: 'ai', text: 'stored wording' }] as Msg[], storage);
    expect(restored[1]!.records).toEqual(dashboard);
  });

  it('keeps only dashboard and report cards, per chat, and forgets them with the chat', () => {
    const storage = memoryStorage();
    rememberCard('c1', { ordinal: 0, text: 'a', records: shipments }, storage);
    expect(storage.data.has(CARD_MEMORY_KEY)).toBe(false);
    rememberCard('c1', { ordinal: 0, text: 'a', records: dashboard }, storage);
    rememberCard('c2', { ordinal: 0, text: 'b', records: report }, storage);
    expect(restoreCards('c2', [{ who: 'ai', text: 'a' }] as Msg[], storage)[0]!.records).toEqual(report);
    forgetCards('c1', storage);
    expect(restoreCards('c1', [{ who: 'ai', text: 'a' }] as Msg[], storage)[0]!.records).toBeUndefined();
    forgetCards(null, storage);
    expect(storage.data.has(CARD_MEMORY_KEY)).toBe(false);
  });

  it('is bounded and survives unreadable storage', () => {
    const storage = memoryStorage();
    for (let i = 0; i < 60; i += 1) rememberCard(`c${i}`, { ordinal: 0, text: 't', records: dashboard }, storage);
    const stored = JSON.parse(storage.data.get(CARD_MEMORY_KEY)!);
    expect(stored.order.length).toBe(40);
    expect(stored.chats.c0).toBeUndefined();
    storage.data.set(CARD_MEMORY_KEY, '{not json');
    expect(restoreCards('c59', [{ who: 'ai', text: 't' }] as Msg[], storage)[0]!.records).toBeUndefined();
    expect(restoreCards('x', [] as Msg[], null)).toEqual([]);
  });
});
