import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SelectionRequest } from '../../hooks/useChat';
import {
  SHOW_LIST_KINDS, chosenSelectionOptions, filterSelectionOptions, groupSelectionOptions, initialExpandedGroups,
  isSectionOpen, selectionListCount, showListKey,
} from './selectionGroups';

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

describe('filterSelectionOptions — the filter box on a long list', () => {
  const book = [
    { kind: 'record' as const, title: 'thiva location', subtitle: 'Beta Company', lines: ['Avlidos 29', 'Thiva'] },
    { kind: 'record' as const, title: 'Kalivia location', subtitle: 'IR Logistic', lines: ['Kalivia Thorikou'] },
    { kind: 'record' as const, title: 'Iraklio', lines: ['Makedonias 17', 'Iraklio'] },
    { kind: 'action' as const, title: 'None of these - add a new location' },
  ];

  it('returns the list untouched for an empty or blank query', () => {
    expect(filterSelectionOptions(book, '')).toBe(book);
    expect(filterSelectionOptions(book, '   ')).toBe(book);
  });

  it('matches title, subtitle and address lines, ignoring case', () => {
    expect(filterSelectionOptions(book, 'KALIVIA').map((o) => o.title)).toContain('Kalivia location');
    expect(filterSelectionOptions(book, 'beta').map((o) => o.title)).toContain('thiva location');
    expect(filterSelectionOptions(book, 'makedonias').map((o) => o.title)).toContain('Iraklio');
  });

  it('always keeps the action card, so "add a new location" survives a miss', () => {
    const left = filterSelectionOptions(book, 'nowhere');
    expect(left).toHaveLength(1);
    expect(left[0]!.kind).toBe('action');
  });
});

/**
 * MS3-396: every option list starts collapsed behind a "Show 12 sites" row, so
 * the message above it stays readable. What the row says is decided here.
 */
describe('collapsed list toggle', () => {
  const record = (id: string) => ({ id, kind: 'record' as const, title: id });
  const action = (id: string) => ({ id, kind: 'action' as const, title: id });

  it('counts the records, not the "add a new one" card', () => {
    expect(selectionListCount([record('a'), record('b'), record('c'), action('new')])).toBe(3);
  });

  it('counts the cards of a list that holds only actions, rather than saying 0', () => {
    expect(selectionListCount([action('x'), action('y')])).toBe(2);
  });

  it('names the kind of thing in the list, and falls back to "options"', () => {
    expect(showListKey('location')).toBe('vagonai.select.show.location');
    expect(showListKey('erp_order')).toBe('vagonai.select.show.erp_order');
    expect(showListKey('something_new')).toBe('vagonai.select.show.option');
    expect(showListKey(undefined)).toBe('vagonai.select.show.option');
  });

  it('has a wording for every list kind the gateway sends', () => {
    type Unlabelled = Exclude<SelectionRequest['kind'], (typeof SHOW_LIST_KINDS)[number]>;
    const everyKindLabelled: [Unlabelled] extends [never] ? true : false = true;
    expect(everyKindLabelled).toBe(true);
  });

  it('has the singular and plural of every label, and the hide label, in English and Greek', () => {
    for (const lang of ['en', 'el'] as const) {
      const select = JSON.parse(readFileSync(`src/locale/${lang}.json`, 'utf-8')).vagonai.select;
      for (const kind of [...SHOW_LIST_KINDS, 'option']) {
        for (const form of ['one', 'other']) {
          const text: unknown = select.show?.[`${kind}_${form}`];
          expect(typeof text, `${lang} ${kind}_${form}`).toBe('string');
          expect(text as string).toContain('{{count}}');
        }
      }
      expect(typeof select.hide).toBe('string');
    }
  });

  it('the Greek labels are Greek letters, not double-encoded bytes', () => {
    const select = JSON.parse(readFileSync('src/locale/el.json', 'utf-8')).vagonai.select;
    const greek = '[\\u0370-\\u03FF ]+';
    expect(select.show.location_other).toMatch(new RegExp(`^${greek}\\{\\{count\\}\\}${greek}$`));
    expect(select.hide).toBe('Απόκρυψη λίστας');
  });

  it('picks out what an answered list chose, in list order, for the compact summary', () => {
    const options = [record('a'), record('b'), record('c')];
    expect(chosenSelectionOptions(options, ['c', 'a']).map((option) => option.id)).toEqual(['a', 'c']);
    expect(chosenSelectionOptions(options, [])).toEqual([]);
    expect(chosenSelectionOptions(options, undefined)).toEqual([]);
  });
});
