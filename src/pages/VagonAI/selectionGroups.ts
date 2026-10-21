/**
 * How a selection list is split into sections, and which sections are open.
 *
 * Pulled out of `SelectionCards` because getting it wrong is invisible in the
 * card's own chrome and catastrophic to the flow — which is exactly what
 * happened, and what these two functions exist to make testable.
 *
 * ## The bug this was extracted for
 *
 * Options arrive in two shapes. Truck types carry a `group` ("Trailers", "Rigid
 * trucks") and collapse under a header. Everything else — locations, customers,
 * products, ERP orders — carries no `group` at all and is meant to render as a
 * flat list of buttons.
 *
 * The component bucketed the groupless ones under a literal `'ungrouped'` key
 * and then asked the expanded-sections set whether to draw them. That set is
 * seeded from the group names actually present, `'ungrouped'` is never one of
 * them, so the answer was always no. The heading, the "Matched on …" line and
 * the "Tap one to use it" hint all sit OUTSIDE that loop, so they rendered
 * normally — and the assistant appeared to offer cards that were not on screen,
 * waiting for a tap that could not happen. Every order and draft-shipment run
 * that hit an ambiguous lookup dead-ended there.
 *
 * Two rules follow, and both are asserted in the sibling test:
 *
 * - **An ungrouped section is always open.** It has no header, so there is
 *   nothing to reopen it with; letting it participate in collapse at all is the
 *   bug.
 * - **The bucket key is `null`, not a string.** Group names come from the
 *   gateway and share this namespace, so any magic string could in principle
 *   collide with a real one. `null` cannot.
 */

/** The subset of a selection option this module needs. */
export interface GroupableOption {
  group?: string;
}

export interface OptionGroup<T> {
  /** The group's name, or null for options that carry none. */
  name: string | null;
  options: T[];
}

/**
 * Buckets options by `group`, preserving first-seen order.
 *
 * Order matters: the gateway sends a whole type and its subtypes adjacent, and
 * re-sorting would separate them.
 */
export function groupSelectionOptions<T extends GroupableOption>(options: T[]): OptionGroup<T>[] {
  const buckets = new Map<string | null, T[]>();

  for (const option of options) {
    // `|| null` rather than `?? null` on purpose: an empty-string group is not
    // a group, and bucketing it separately would draw a header with no name.
    const key = option.group || null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(option);
    else buckets.set(key, [option]);
  }

  return [...buckets.entries()].map(([name, grouped]) => ({ name, options: grouped }));
}

/**
 * Whether a section's options should be drawn.
 *
 * An ungrouped section is always drawn. A named one is drawn when it is in the
 * expanded set — which every present group is, at mount.
 */
export function isSectionOpen(name: string | null, expanded: ReadonlySet<string>): boolean {
  return name === null || expanded.has(name);
}

/** The group names present in a list, deduplicated — what the expanded set is seeded with. */
export function initialExpandedGroups<T extends GroupableOption>(options: T[]): Set<string> {
  return new Set(
    options
      .map((option) => option.group)
      .filter((group): group is string => Boolean(group)),
  );
}

/**
 * How many record cards a list holds before it gets a filter box.
 *
 * A location browse sends the whole Address Book (QA 2026-10-06: six of 24
 * sites read as the rest being missing), and twenty-odd cards are a scroll. A
 * search list never gets here - the gateway caps it at six.
 */
export const FILTER_AFTER = 8;

/** The subset of a selection option the filter reads. */
export interface FilterableOption {
  kind: 'record' | 'action';
  title: string;
  subtitle?: string;
  lines?: string[];
}

/**
 * The options left after the shipper types into a long list's filter box.
 *
 * Matches the title, subtitle and address lines, case-insensitively. An action
 * card ("None of these - add a new location") always stays: it is the way out
 * when the filter shows the site really is not there.
 */
export function filterSelectionOptions<T extends FilterableOption>(options: T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return options;
  return options.filter(
    (option) =>
      option.kind !== 'record' ||
      [option.title, option.subtitle, ...(option.lines ?? [])].some(
        (text) => typeof text === 'string' && text.toLocaleLowerCase().includes(needle),
      ),
  );
}

/* -------------------------------------------------------------------------- *
 * Collapsed by default (MS3-396)
 *
 * A list of options used to arrive fully drawn under the assistant's message,
 * and the chat followed it down: twelve sites later, the message that said
 * what to do with them was off the top of the screen. So every list starts
 * collapsed behind one row that says what is in it ("Show 12 sites"), and the
 * shipper opens it when they have read the message.
 * -------------------------------------------------------------------------- */

/** The list kinds with a wording of their own; anything else reads "options". */
export const SHOW_LIST_KINDS = [
  'location',
  'product',
  'truck_match',
  'shipment_channel',
  'vehicle_type',
  'partner',
  'price_option',
  'erp_order',
  'tracking_recipient',
] as const;

/**
 * The i18n key for the collapsed list's toggle, without the plural suffix -
 * i18next adds `_one` / `_other` from `count`. An unknown kind falls back to
 * the neutral "Show 3 options" rather than to a missing key.
 */
export function showListKey(kind: string | null | undefined): string {
  const known = (SHOW_LIST_KINDS as readonly string[]).includes(kind ?? '');
  return `vagonai.select.show.${known ? kind : 'option'}`;
}

/**
 * How many choices the toggle says the list holds: the records, not the
 * "None of these - add a new one" card, which is a way out rather than a
 * choice. A list of nothing but action cards counts those instead of saying 0.
 */
export function selectionListCount(options: ReadonlyArray<Pick<FilterableOption, 'kind'>>): number {
  const records = options.filter((option) => option.kind === 'record').length;
  return records > 0 ? records : options.length;
}

/**
 * The options an answered list picked, in list order - shown compactly under
 * the collapsed list, so the record of the answer needs no expanding.
 */
export function chosenSelectionOptions<T extends { id: string }>(
  options: readonly T[],
  chosenIds: readonly string[] | null | undefined,
): T[] {
  if (!chosenIds || chosenIds.length === 0) return [];
  return options.filter((option) => chosenIds.includes(option.id));
}
