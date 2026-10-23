import { describe, expect, it } from 'vitest';
import { groupSelectionOptions, initialExpandedGroups, isSectionOpen } from './selectionGroups';

/**
 * The sectioning behind every picker in the assistant.
 *
 * These exist because the bug they cover was invisible everywhere else. The
 * component rendered its heading, its "Matched on …" line and its "Tap one to
 * use it" hint from outside the options loop, so a list with no rows looked
 * exactly like a list with rows until someone tried to tap one. Nothing failed,
 * nothing logged, and `vitest.config.ts` runs in `environment: 'node'` — there
 * is no DOM here, so no render test could have caught it either.
 *
 * What can be asserted is the decision itself, once it lives in a pure module.
 * The first case below is the regression that shipped: every location, product
 * and ERP-order picker in the product asked a set seeded with group NAMES
 * whether to draw the bucket that group-LESS options fall into, and the answer
 * was always no.
 */

/** Options as the gateway sends them: truck types carry a group, nothing else does. */
const option = (id: string, group?: string) => ({ id, group });

describe('isSectionOpen', () => {
  it('draws an ungrouped section even though nothing is expanded', () => {
    // THE REGRESSION. A flat list seeds no groups at all, so `expanded` is empty
    // - and this returning false is what emptied every picker in the assistant.
    expect(isSectionOpen(null, new Set())).toBe(true);
  });

  it('draws an ungrouped section while other groups are expanded', () => {
    expect(isSectionOpen(null, new Set(['Trailers']))).toBe(true);
  });

  it('draws a real group only while it is expanded', () => {
    expect(isSectionOpen('Trailers', new Set(['Trailers']))).toBe(true);
    expect(isSectionOpen('Trailers', new Set())).toBe(false);
  });

  it('collapsing one group does not hide the ungrouped section', () => {
    const expanded = new Set(['Trailers']);
    expect(isSectionOpen('Rigid trucks', expanded)).toBe(false);
    expect(isSectionOpen(null, expanded)).toBe(true);
  });

  it('a group literally named "ungrouped" is still a real group', () => {
    // Group names are gateway-supplied labels and share this namespace, which is
    // why the bucket key is `null` rather than a magic string. A group that
    // happens to be called "ungrouped" must collapse like any other.
    expect(isSectionOpen('ungrouped', new Set())).toBe(false);
    expect(isSectionOpen('ungrouped', new Set(['ungrouped']))).toBe(true);
  });
});

describe('groupSelectionOptions', () => {
  it('puts a list with no groups in ONE section named null', () => {
    const options = [option('a'), option('b'), option('c')];
    const sections = groupSelectionOptions(options);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBeNull();
    expect(sections[0].options).toHaveLength(3);
  });

  it('keeps every option - a picker that drops one is worse than no picker', () => {
    const options = [option('a'), option('b', 'Trailers'), option('c')];
    const kept = groupSelectionOptions(options).flatMap((section) => section.options);
    expect(kept.map((o) => o.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('preserves first-seen order, so a type stays next to its subtypes', () => {
    // The gateway sends a truck type and its subtypes adjacent. Re-sorting would
    // separate them, which is why this buckets rather than groups-and-sorts.
    const sections = groupSelectionOptions([
      option('a', 'Trailers'),
      option('b', 'Rigid trucks'),
      option('c', 'Trailers'),
    ]);
    expect(sections.map((s) => s.name)).toEqual(['Trailers', 'Rigid trucks']);
    expect(sections[0].options.map((o) => o.id)).toEqual(['a', 'c']);
  });

  it('returns both a grouped and an ungrouped section for a mixed list', () => {
    const sections = groupSelectionOptions([option('a', 'Trailers'), option('b')]);
    expect(sections.map((s) => s.name)).toEqual(['Trailers', null]);
  });

  it('treats an empty-string group as no group', () => {
    // An empty label would draw a header with no name on it, so it buckets with
    // the group-less options instead.
    const sections = groupSelectionOptions([option('a', ''), option('b')]);
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBeNull();
  });

  it('an empty list is no sections, not one empty section', () => {
    expect(groupSelectionOptions([])).toEqual([]);
  });
});

describe('initialExpandedGroups', () => {
  it('seeds nothing for a flat list', () => {
    expect(initialExpandedGroups([option('a'), option('b')]).size).toBe(0);
  });

  it('seeds every real group, deduplicated, so grouped sections start open', () => {
    const seeded = initialExpandedGroups([
      option('a', 'Trailers'),
      option('b', 'Trailers'),
      option('c', 'Rigid trucks'),
    ]);
    expect([...seeded].sort()).toEqual(['Rigid trucks', 'Trailers']);
  });

  it('what it seeds opens exactly the sections that were grouped', () => {
    // The two halves have to agree: a section `groupSelectionOptions` names is
    // one `initialExpandedGroups` must have seeded, or it renders collapsed with
    // no way to open it. That disagreement WAS the bug.
    const options = [option('a', 'Trailers'), option('b')];
    const expanded = initialExpandedGroups(options);
    for (const section of groupSelectionOptions(options)) {
      expect(isSectionOpen(section.name, expanded)).toBe(true);
    }
  });
});
