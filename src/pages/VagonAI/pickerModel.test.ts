import { describe, expect, it } from 'vitest';
import {
  filterPickerOptions,
  initialActive,
  moveActive,
  openingQuery,
  openingTab,
  openingView,
  optionsInTab,
  orderByGroup,
  PANEL_ROOM,
  PICKER_LIST_MAX,
  pickerListHeight,
  revealScrollTop,
  shouldOpenUpward,
  visibleBounds,
  type PickerOption,
} from './pickerModel';

/**
 * The decisions behind `PickerDropdown`, asserted without a DOM.
 *
 * The case that matters most is the absence of a cap: the inline pickers this
 * replaced cut every list to 40 rows without saying so, and a site past row 40
 * simply did not exist as far as the shipper could tell.
 */

const row = (id: string, extra: Partial<PickerOption> = {}): PickerOption => ({ id, title: id, ...extra });

describe('filterPickerOptions', () => {
  it('returns every option for an empty query, however many there are', () => {
    const many = Array.from({ length: 213 }, (_, i) => row(`site-${i}`));
    expect(filterPickerOptions(many, '')).toHaveLength(213);
    expect(filterPickerOptions(many, '   ')).toHaveLength(213);
  });

  it('matches every word in any order, across title, subtitle and keywords', () => {
    const rows = [
      row('a', { title: 'DC Athens North', subtitle: 'Alphavita SA' }),
      row('b', { title: 'Milan hub', keywords: ['SKU-ATH-1'] }),
      row('c', { title: 'Athens port' }),
    ];
    expect(filterPickerOptions(rows, 'athens dc').map((r) => r.id)).toEqual(['a']);
    expect(filterPickerOptions(rows, 'alphavita').map((r) => r.id)).toEqual(['a']);
    expect(filterPickerOptions(rows, 'sku-ath').map((r) => r.id)).toEqual(['b']);
    expect(filterPickerOptions(rows, 'ATHENS').map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('searches the group name, so a company finds all of its sites', () => {
    const rows = [row('a', { title: 'Depot 1', group: 'Roussos SA' }), row('b', { title: 'Depot 2', group: 'Other' })];
    expect(filterPickerOptions(rows, 'roussos').map((r) => r.id)).toEqual(['a']);
  });
});

describe('optionsInTab', () => {
  it('keeps only the rows on the tab, or everything with no tabs', () => {
    const rows = [row('a', { tab: 'my' }), row('b', { tab: 'customer' })];
    expect(optionsInTab(rows, 'customer').map((r) => r.id)).toEqual(['b']);
    expect(optionsInTab(rows, null)).toHaveLength(2);
  });
});

describe('orderByGroup', () => {
  it('pulls each group together in first-seen order, so paging appends at the bottom', () => {
    const rows = [row('a1', { group: 'A' }), row('b1', { group: 'B' }), row('a2', { group: 'A' }), row('x')];
    expect(orderByGroup(rows).map((r) => r.id)).toEqual(['a1', 'a2', 'b1', 'x']);
  });
});

describe('openingQuery', () => {
  const rows = [row('a', { title: 'Athens Depot' })];

  it('opens on the order wording when it matches something', () => {
    expect(openingQuery(rows, ' Athens ')).toBe('Athens');
  });

  it('opens empty when the wording matches nothing, rather than on "No matches"', () => {
    expect(openingQuery(rows, 'ATH-1')).toBe('');
    expect(openingQuery(rows, undefined)).toBe('');
  });
});

describe('openingTab', () => {
  const tabs = [{ id: 'my' }, { id: 'customer' }];

  it('opens on the tab holding the current choice', () => {
    const rows = [row('a', { tab: 'my' }), row('b', { tab: 'customer' })];
    expect(openingTab(tabs, rows, ['b'])).toBe('customer');
  });

  it('skips an empty first tab instead of opening on nothing', () => {
    expect(openingTab(tabs, [row('b', { tab: 'customer' })], [])).toBe('customer');
  });

  it('is null for a picker with no tabs', () => {
    expect(openingTab(undefined, [row('a')], [])).toBeNull();
  });
});

describe('openingView', () => {
  const tabs = [{ id: 'my' }, { id: 'customer' }];
  const rows = [row('a', { title: 'Athens DC', tab: 'my' }), row('b', { title: 'Patras Depot', tab: 'customer' })];

  it('moves to the tab where the order wording matches when nothing is chosen', () => {
    expect(openingView(tabs, rows, [], 'Patras')).toEqual({ tab: 'customer', query: 'Patras' });
  });

  it('keeps the tab of an existing choice even if the wording matches elsewhere', () => {
    expect(openingView(tabs, rows, ['a'], 'Patras')).toEqual({ tab: 'my', query: '' });
  });

  it('opens on the default tab with no search when the wording matches nothing', () => {
    expect(openingView(tabs, rows, [], 'Milan')).toEqual({ tab: 'my', query: '' });
  });
});

describe('keyboard', () => {
  const rows = [row('a', { disabled: true }), row('b'), row('c', { disabled: true }), row('d')];

  it('skips disabled rows and stops at the ends', () => {
    expect(moveActive(rows, 1, 1)).toBe(3);
    expect(moveActive(rows, 3, 1)).toBe(3);
    expect(moveActive(rows, 1, -1)).toBe(1);
  });

  it('starts on the current choice, else the first enabled row', () => {
    expect(initialActive(rows, ['d'])).toBe(3);
    expect(initialActive(rows, [])).toBe(1);
  });
});

/**
 * MS3-399: opening a picker must never move the chat. These are the two
 * decisions that used to lean on the window and on scrollIntoView.
 */
describe('shouldOpenUpward', () => {
  // The chat scroller (.vai-body) shows y 60..640 of a 800px window; the
  // composer fills the rest below it.
  const chat = visibleBounds({ top: 60, bottom: 640 }, 800);

  it('opens up for a trigger just above the composer, though the window has room below it', () => {
    const trigger = { top: 560, bottom: 598 };
    // Against the window there is 202px below; against the chat only 42px.
    expect(shouldOpenUpward(trigger, chat)).toBe(true);
  });

  it('opens down when the chat has room below', () => {
    expect(shouldOpenUpward({ top: 120, bottom: 158 }, chat)).toBe(false);
  });

  it('stays down when below is short but above is shorter still', () => {
    expect(shouldOpenUpward({ top: 300, bottom: 338 }, { top: 290, bottom: 640 })).toBe(false);
  });

  it('uses the panel room as the threshold', () => {
    const bounds = { top: 0, bottom: 1000 };
    expect(shouldOpenUpward({ top: 1000 - PANEL_ROOM - 38, bottom: 1000 - PANEL_ROOM }, bounds)).toBe(false);
    expect(shouldOpenUpward({ top: 1000 - PANEL_ROOM + 1 - 38, bottom: 1000 - PANEL_ROOM + 1 }, bounds)).toBe(true);
  });
});

describe('visibleBounds', () => {
  it('falls back to the window without a scroll container', () => {
    expect(visibleBounds(null, 720)).toEqual({ top: 0, bottom: 720 });
  });

  it('cuts a container that runs past the window to the part on screen', () => {
    expect(visibleBounds({ top: -200, bottom: 2000 }, 720)).toEqual({ top: 0, bottom: 720 });
  });
});

describe('pickerListHeight', () => {
  it('keeps the full list height when there is room', () => {
    expect(pickerListHeight({ top: 100, bottom: 138 }, { top: 0, bottom: 900 }, false)).toBe(PICKER_LIST_MAX);
  });

  it('shrinks the list to the room on the side it opens', () => {
    // 260px above the trigger, 96px of it for search and footer.
    expect(pickerListHeight({ top: 300, bottom: 338 }, { top: 40, bottom: 400 }, true)).toBe(164);
  });

  it('never goes below a readable floor', () => {
    expect(pickerListHeight({ top: 50, bottom: 88 }, { top: 40, bottom: 120 }, false)).toBe(120);
  });
});

describe('revealScrollTop', () => {
  const list = { top: 100, bottom: 364, scrollTop: 200 };

  it('leaves a row that is already in view alone', () => {
    expect(revealScrollTop({ top: 150, bottom: 186 }, list)).toBeNull();
  });

  it('scrolls the list down just enough for a row below the fold', () => {
    expect(revealScrollTop({ top: 350, bottom: 386 }, list)).toBe(222);
  });

  it('scrolls the list up for a row above it, clear of a sticky header', () => {
    expect(revealScrollTop({ top: 90, bottom: 126 }, list)).toBe(190);
    expect(revealScrollTop({ top: 110, bottom: 146 }, list, 24)).toBe(186);
  });

  it('never asks for a negative scrollTop', () => {
    expect(revealScrollTop({ top: -400, bottom: -364 }, list)).toBe(0);
  });
});
