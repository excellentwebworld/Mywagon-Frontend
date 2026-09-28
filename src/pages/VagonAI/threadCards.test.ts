import { describe, expect, it } from 'vitest';
import type { SelectionRequest } from '../../hooks/useChat';
import {
  newestCardIndex, newestSelectionIndex, resolveLiveCards, retireCards, dedupeSelections,
  type ThreadMessage,
} from './threadCards';

const ai = (text: string, actionId?: string): ThreadMessage => ({
  who: 'ai',
  text,
  ...(actionId ? { action: { id: actionId, tool: 'create_shipment', arguments: {} } } : {}),
});

const user = (text: string): ThreadMessage => ({ who: 'user', text });

const request = (id: string): SelectionRequest => ({
  id,
  kind: 'location',
  title: 'Pick the pickup site',
  query: 'Athens',
  options: [
    { id: 'location:1841', kind: 'record', title: 'Athens DC' },
    { id: 'new_location', kind: 'action', title: 'Add a new one' },
  ],
});

/** An assistant turn offering a card list, optionally already answered. */
const list = (text: string, id: string, chosen?: string): ThreadMessage => ({
  who: 'ai',
  text,
  selection: request(id),
  ...(chosen ? { selectionChoice: chosen } : {}),
});

describe('newestCardIndex', () => {
  it('returns -1 when no turn holds a proposal', () => {
    expect(newestCardIndex([user('hi'), ai('hello')])).toBe(-1);
  });

  it('returns the last holder, not the first', () => {
    expect(newestCardIndex([user('a'), ai('', 'X'), user('b'), ai('', 'X')])).toBe(3);
  });
});

describe('retireCards', () => {
  // The gateway re-sends an unresolved proposal on every later turn with the
  // same id, so the transcript would otherwise end up holding it twice.
  it('drops the earlier copy of a re-sent proposal, keeping the newest', () => {
    const kept = retireCards([user('a'), ai('', 'X'), user('yes submit now'), ai('Press the button.', 'X')], 3);
    expect(kept.map((m) => m.text)).toEqual(['a', 'yes submit now', 'Press the button.']);
    expect(kept.filter((m) => m.action)).toHaveLength(1);
    expect(kept[2].action?.id).toBe('X');
  });

  it('supersedes a proposal that came back under a new id', () => {
    const kept = retireCards([ai('', 'X'), user('make it 14 pallets'), ai('', 'Y')], 2);
    expect(kept).toHaveLength(2);
    expect(kept[1].action?.id).toBe('Y');
  });

  it('keeps a superseded turn that had prose of its own, minus its card', () => {
    const kept = retireCards([ai('Here is what I have so far.', 'X'), ai('', 'X')], 1);
    expect(kept).toHaveLength(2);
    expect(kept[0].action).toBeUndefined();
    expect(kept[0].text).toBe('Here is what I have so far.');
  });

  it('keeps a superseded turn that produced a draft', () => {
    const withDraft: ThreadMessage = {
      ...ai('', 'X'),
      draft: { draft_id: 1, auto_id: 'SID-1', published: false, review_url: '/x', stops_count: 2, total_pickup_qty: 12, total_pickup_weight: 8000 },
    };
    const kept = retireCards([withDraft, ai('', 'Y')], 1);
    expect(kept).toHaveLength(2);
    expect(kept[0].action).toBeUndefined();
    expect(kept[0].draft?.auto_id).toBe('SID-1');
  });

  // A lookup can fail and the bot propose adding the missing record in the same
  // turn, so retiring the card must not take the gateway's failure line with it.
  it('keeps a superseded turn that reported a failed action', () => {
    const failed: ThreadMessage = { ...ai('', 'X'), actionError: 'That product is deactivated.' };
    const kept = retireCards([failed, ai('', 'Y')], 1);
    expect(kept).toHaveLength(2);
    expect(kept[0].action).toBeUndefined();
    expect(kept[0].actionError).toBe('That product is deactivated.');
  });

  // keepIndex -1 is confirm/cancel: the action resolved, so no card survives —
  // including a leftover that would otherwise become the newest and reappear.
  it('retires every card when keepIndex is -1', () => {
    const kept = retireCards([ai('', 'X'), user('go ahead'), ai('Done.', 'X')], -1);
    expect(kept.some((m) => m.action)).toBe(false);
    expect(kept.map((m) => m.text)).toEqual(['go ahead', 'Done.']);
  });

  it('leaves a transcript without proposals untouched', () => {
    const th = [user('a'), ai('b')];
    expect(retireCards(th, newestCardIndex(th))).toEqual(th);
  });
});

describe('newestSelectionIndex', () => {
  it('returns -1 when no turn offers a list', () => {
    expect(newestSelectionIndex([user('hi'), ai('hello')])).toBe(-1);
  });

  it('returns the last list still open', () => {
    expect(newestSelectionIndex([list('', 'sel_1'), user('b'), list('', 'sel_2')])).toBe(2);
  });

  // An answered list keeps its place in the transcript, but it must never come
  // back to life because a later turn happened not to ask anything.
  it('skips a list the shipper already answered', () => {
    expect(newestSelectionIndex([list('', 'sel_1', 'location:1841'), ai('Got it.')])).toBe(-1);
  });

  it('prefers an open list over a later answered one', () => {
    const th = [list('', 'sel_1'), list('', 'sel_2', 'product:97')];
    expect(newestSelectionIndex(th)).toBe(0);
  });
});

describe('resolveLiveCards', () => {
  it('leaves a lone card of either kind live', () => {
    expect(resolveLiveCards(3, -1)).toEqual({ action: 3, selection: -1 });
    expect(resolveLiveCards(-1, 2)).toEqual({ action: -1, selection: 2 });
    expect(resolveLiveCards(-1, -1)).toEqual({ action: -1, selection: -1 });
  });

  // A picker and a Confirm button are two competing next actions for the same
  // decision, so whichever turn is later is the real one.
  it('lets a later proposal supersede an earlier picker', () => {
    expect(resolveLiveCards(4, 1)).toEqual({ action: 4, selection: -1 });
  });

  it('lets a later picker supersede an earlier proposal', () => {
    expect(resolveLiveCards(1, 4)).toEqual({ action: -1, selection: 4 });
  });

  it('gives a tie to the proposal, since a picker only ever leads to one', () => {
    expect(resolveLiveCards(2, 2)).toEqual({ action: 2, selection: -1 });
  });
});

describe('dedupeSelections', () => {
  it('drops the earlier copy of a re-sent list, keeping the newest', () => {
    const th = [list('', 'sel_1'), user('which ones are these?'), list('Here they are again.', 'sel_1')];
    const kept = dedupeSelections(th, 2);
    expect(kept.map((m) => m.text)).toEqual(['which ones are these?', 'Here they are again.']);
    expect(kept.filter((m) => m.selection)).toHaveLength(1);
  });

  // The pickup site, then the delivery site: two different questions, and the
  // thread only reads as a conversation if both stay where they were asked.
  it('leaves a list with a different id in place', () => {
    const th = [list('Where from?', 'sel_1', 'location:1841'), list('Where to?', 'sel_2')];
    expect(dedupeSelections(th, 1)).toEqual(th);
  });

  it('keeps an answered copy, which is the turn the shipper replied on', () => {
    const th = [list('', 'sel_1', 'location:1841'), list('', 'sel_1')];
    const kept = dedupeSelections(th, 1);
    expect(kept).toHaveLength(2);
    expect(kept[0].selectionChoice).toBe('location:1841');
  });

  it('keeps a duplicated turn that had prose of its own, minus its list', () => {
    const th = [list('Four sites matched.', 'sel_1'), list('', 'sel_1')];
    const kept = dedupeSelections(th, 1);
    expect(kept).toHaveLength(2);
    expect(kept[0].selection).toBeUndefined();
    expect(kept[0].text).toBe('Four sites matched.');
  });

  it('is a no-op when there is no list to keep', () => {
    const th = [user('a'), ai('b')];
    expect(dedupeSelections(th, newestSelectionIndex(th))).toEqual(th);
  });
});

// Rule 4 retires the stale card, and retireCards is what does it — so a turn
// carrying both must lose the card and keep the list.
describe('retireCards with a card list on the turn', () => {
  it('keeps a superseded turn that offered a list', () => {
    const both: ThreadMessage = { ...list('', 'sel_1'), action: { id: 'X', tool: 'create_shipment', arguments: {} } };
    const kept = retireCards([both, ai('', 'Y')], 1);
    expect(kept).toHaveLength(2);
    expect(kept[0].action).toBeUndefined();
    expect(kept[0].selection?.id).toBe('sel_1');
  });

  it('retires every proposal but leaves the lists alone', () => {
    const kept = retireCards([list('', 'sel_1'), ai('Ready when you are.', 'X')], -1);
    expect(kept.some((m) => m.action)).toBe(false);
    expect(kept[0].selection?.id).toBe('sel_1');
  });
});
