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
