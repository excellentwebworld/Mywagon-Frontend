/**
 * The non-React half of `PickerDropdown`: what a search matches, what order the
 * rows come in, and which row the keyboard lands on.
 *
 * Split out for the same reason as `selectionGroups`: vitest runs in
 * `environment: 'node'` here, so logic left inside the component is invisible
 * to the suite. A picker that silently drops a site is exactly the kind of bug
 * that looks fine on screen.
 *
 * ## Why there is no cap
 *
 * The inline pickers this replaced each cut their list to 40 rows and said
 * nothing about it, so a shipper with 200 sites could scroll to the bottom,
 * not find theirs, and conclude it did not exist. Here every match is
 * reachable: rows arrive a page at a time, and the panel always says how many
 * are shown out of how many there are.
 */
import { groupSelectionOptions } from './selectionGroups';

export interface PickerOption {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string;
  /** Section header the row sits under — a company, a product category. */
  group?: string;
  /** Which tab the row belongs to, when the picker has tabs. */
  tab?: string;
  /** Extra text a search should hit that is not shown (SKU, VAT, city…). */
  keywords?: (string | null | undefined)[];
  disabled?: boolean;
}

/** How many rows are drawn per page. Big enough that most lists fit in one. */
export const PICKER_PAGE_SIZE = 50;

function haystack(option: PickerOption): string {
  return [option.title, option.subtitle, option.badge, option.group, ...(option.keywords ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * The options a query matches.
 *
 * Every word has to appear somewhere on the row, in any order, so "athens dc"
 * finds "DC Athens North" and "frozen 2kg" finds "Frozen Peas 2kg". A
 * whole-string match would miss both.
 */
export function filterPickerOptions<T extends PickerOption>(options: T[], query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return options;
  return options.filter((option) => {
    const text = haystack(option);
    return words.every((word) => text.includes(word));
  });
}

/** The options on one tab, or all of them when the picker has none. */
export function optionsInTab<T extends PickerOption>(options: T[], tab: string | null): T[] {
  return tab === null ? options : options.filter((option) => option.tab === tab);
}

/**
 * Options in the order they are drawn: grouped, groups in first-seen order.
 *
 * Done BEFORE paging, so "show more" appends rows at the bottom of the list
 * instead of slotting them into a section the shipper has already scrolled past.
 */
export function orderByGroup<T extends PickerOption>(options: T[]): T[] {
  return groupSelectionOptions(options).flatMap((group) => group.options);
}

/**
 * The search a picker opens with.
 *
 * Pre-filled with the order's own wording ("Athens Depot") when it matches
 * something, so the likely site is already at the top. When it matches
 * nothing it starts empty: a picker that opens on "No matches" looks broken,
 * and the shipper may call the site something else entirely.
 */
export function openingQuery(options: PickerOption[], hint: string | null | undefined): string {
  const term = (hint ?? '').trim();
  if (!term) return '';
  return filterPickerOptions(options, term).length > 0 ? term : '';
}

/**
 * The tab a picker opens on: the one holding the current choice, else the
 * first tab with anything in it, so the picker never opens on an empty tab
 * while the other one is full.
 */
export function openingTab(
  tabs: { id: string }[] | undefined,
  options: PickerOption[],
  selectedIds: string[],
): string | null {
  if (!tabs || tabs.length === 0) return null;
  const selected = options.find((option) => selectedIds.includes(option.id));
  if (selected?.tab && tabs.some((tab) => tab.id === selected.tab)) return selected.tab;
  const filled = tabs.find((tab) => options.some((option) => option.tab === tab.id));
  return (filled ?? tabs[0]!).id;
}

/**
 * The tab and search a picker opens on, together.
 *
 * Usually `openingTab` plus `openingQuery`. The exception is a picker with
 * nothing chosen whose order wording only matches on another tab ("Patras
 * Depot" is a customer's site, not one of the shipper's own). It opens on
 * that tab with the wording already searched, so the shipper does not have
 * to guess which tab the site is on.
 */
export function openingView(
  tabs: { id: string }[] | undefined,
  options: PickerOption[],
  selectedIds: string[],
  hint: string | null | undefined,
): { tab: string | null; query: string } {
  const tab = openingTab(tabs, options, selectedIds);
  const query = openingQuery(optionsInTab(options, tab), hint);
  const hasChoice = options.some((option) => selectedIds.includes(option.id));
  if (query || !tabs || hasChoice) return { tab, query };
  for (const other of tabs) {
    const found = openingQuery(optionsInTab(options, other.id), hint);
    if (found) return { tab: other.id, query: found };
  }
  return { tab, query };
}

/**
 * Where the arrow keys go next. Disabled rows are skipped, and the ends do not
 * wrap: wrapping a long list makes "one more down" jump to the top.
 */
export function moveActive(rows: PickerOption[], from: number, delta: 1 | -1): number {
  let index = from;
  for (;;) {
    index += delta;
    if (index < 0 || index >= rows.length) return from;
    if (!rows[index]!.disabled) return index;
  }
}

/** The row the keyboard starts on: the current choice, else the first one that can be picked. */
export function initialActive(rows: PickerOption[], selectedIds: string[]): number {
  const chosen = rows.findIndex((row) => selectedIds.includes(row.id));
  if (chosen >= 0) return chosen;
  return rows.findIndex((row) => !row.disabled);
}

/** A top and bottom edge, in viewport (client) pixels. */
export interface VerticalBounds {
  top: number;
  bottom: number;
}

/** Roughly how tall an open panel is: tabs, search, a full list and the footer. */
export const PANEL_ROOM = 360;

/**
 * The part of a scroll container the shipper can actually see: its own box,
 * cut to the window. Falls back to the window when there is no container.
 */
export function visibleBounds(container: VerticalBounds | null, viewportHeight: number): VerticalBounds {
  if (!container) return { top: 0, bottom: viewportHeight };
  return { top: Math.max(0, container.top), bottom: Math.min(viewportHeight, container.bottom) };
}

/**
 * Whether the panel opens above its trigger (MS3-399).
 *
 * Measured against what is visible of the chat's own scroller, not the
 * window. The window includes the composer under the chat, so a trigger just
 * above the composer looked like it had room below and the panel opened down
 * behind the composer — and the code that then pulled it into view scrolled
 * the whole chat. Upward only when below is short AND above is roomier, so a
 * card at the very top of a short chat still opens down.
 */
export function shouldOpenUpward(trigger: VerticalBounds, bounds: VerticalBounds, room = PANEL_ROOM): boolean {
  const below = bounds.bottom - trigger.bottom;
  const above = trigger.top - bounds.top;
  return below < room && above > below;
}

/** The list's own height cap when there is room; the panel's other parts take about 96px. */
export const PICKER_LIST_MAX = 264;
const PICKER_LIST_MIN = 120;

/**
 * How tall the list may be so the opened panel fits in the visible chat.
 *
 * With the chat no longer scrolled to show the panel (MS3-399), a panel taller
 * than the space on its side would hang off the edge. Shrinking the list keeps
 * it whole, down to a floor below which a list is not worth reading.
 */
export function pickerListHeight(trigger: VerticalBounds, bounds: VerticalBounds, upward: boolean): number {
  const space = upward ? trigger.top - bounds.top : bounds.bottom - trigger.bottom;
  const chrome = PANEL_ROOM - PICKER_LIST_MAX;
  return Math.max(PICKER_LIST_MIN, Math.min(PICKER_LIST_MAX, Math.floor(space - chrome)));
}

/**
 * The `scrollTop` that brings one row fully into view inside its own list, or
 * null when it already is.
 *
 * This replaces `row.scrollIntoView()`, which scrolls every scrollable
 * ancestor as well — the chat included — so arrowing through a picker, or just
 * opening one, moved the conversation (MS3-399). Setting the list's own
 * `scrollTop` can never move anything outside the list.
 *
 * `inset` keeps the row clear of a sticky section header at the top.
 */
export function revealScrollTop(
  row: VerticalBounds,
  list: VerticalBounds & { scrollTop: number },
  inset = 0,
): number | null {
  const topEdge = list.top + inset;
  if (row.top < topEdge) return Math.max(0, list.scrollTop - (topEdge - row.top));
  if (row.bottom > list.bottom) {
    // A row taller than the space shows its top rather than its bottom.
    const shift = Math.min(row.bottom - list.bottom, row.top - topEdge);
    return list.scrollTop + shift;
  }
  return null;
}
