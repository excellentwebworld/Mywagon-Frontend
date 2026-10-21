/**
 * Pure helpers for R4 (`options/:kind`, CONTRACT.md §6.6): merging pages, collecting a whole list, flattening groups.
 * No React, no network — the caller injects the page fetcher, so this is tested with fixtures.
 */
import type { OptionGroup, OptionItem, OptionsKind, OptionsOk, OptionsQuery, OptionsResponse } from './contract';

/** The most pages `collectAll` walks: 5 × 100 rows. A list beyond that keeps its `nextCursor` and the UI offers "load more". */
export const MAX_AUTO_PAGES = 5;

function mergeGroup(a: OptionGroup, b: OptionGroup): OptionGroup {
  const seen = new Set(a.options.map((o) => o.id));
  const children = mergeGroups(a.children ?? [], b.children ?? []);
  return {
    ...a, count: Math.max(a.count, b.count),
    options: [...a.options, ...b.options.filter((o) => !seen.has(o.id))],
    ...(children.length > 0 ? { children } : {}),
  };
}
/** Groups with the same id are one group; order is first-seen. */
export function mergeGroups(a: OptionGroup[], b: OptionGroup[]): OptionGroup[] {
  const out = a.map((g) => ({ ...g }));
  for (const g of b) {
    const i = out.findIndex((x) => x.id === g.id);
    if (i < 0) out.push(g); else out[i] = mergeGroup(out[i]!, g);
  }
  return out;
}

/** Page `b` follows page `a` of the same list: groups merge by id, the cursor and the TRUE total are the later page's. */
export function mergePages(a: OptionsOk, b: OptionsOk): OptionsOk {
  const flat = a.flat || b.flat ? [...(a.flat ?? []), ...(b.flat ?? []).filter((o) => !(a.flat ?? []).some((x) => x.id === o.id))] : undefined;
  return {
    ...a, total: b.total, nextCursor: b.nextCursor, defaultTab: a.defaultTab ?? b.defaultTab,
    groups: mergeGroups(a.groups, b.groups), ...(flat ? { flat } : {}),
  };
}

/**
 * Walks `nextCursor` until the list is whole or `maxPages` is reached. The first page failing is a failure (returned as is);
 * a later page failing keeps what was loaded (with its cursor, so the UI can say there is more).
 */
export async function collectAll(
  fetchPage: (cursor?: string) => Promise<OptionsResponse>,
  maxPages: number = MAX_AUTO_PAGES,
): Promise<OptionsResponse> {
  const first = await fetchPage();
  if (!first.ok) return first;
  let acc = first;
  for (let n = 1; n < maxPages && acc.nextCursor; n += 1) {
    let next: OptionsResponse;
    try { next = await fetchPage(acc.nextCursor); } catch { break; }
    if (!next.ok) break;
    acc = mergePages(acc, next);
  }
  return acc;
}

/** Every option of a response, groups flattened (children first), `flat` first when the server sent one. */
export function itemsOf(res: Pick<OptionsOk, 'groups' | 'flat'>): OptionItem[] {
  const out: OptionItem[] = [...(res.flat ?? [])];
  const walk = (gs: OptionGroup[]) => { for (const g of gs) { if (g.children) walk(g.children); out.push(...g.options); } };
  walk(res.groups ?? []);
  const seen = new Set<string>();
  return out.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}

/**
 * The options a `group=<id>` call returned, wherever the server put them (§6.6 does not say whether they come as `flat`,
 * as that group's `options`, or as a one-group response — open question Q-group-expand). Reads all three.
 */
export function itemsForGroup(res: OptionsOk, groupId: string): OptionItem[] {
  if (res.flat && res.flat.length > 0) return res.flat;
  const find = (gs: OptionGroup[]): OptionGroup | null => {
    for (const g of gs) { if (g.id === groupId) return g; const c = g.children ? find(g.children) : null; if (c) return c; }
    return null;
  };
  const g = find(res.groups ?? []);
  return g ? g.options : itemsOf(res);
}

/** Whether the list on screen is the whole list: the true total is more than what has been loaded. */
export const isPartial = (res: Pick<OptionsOk, 'total' | 'nextCursor'>, loaded: number): boolean => res.nextCursor !== null || res.total > loaded;

/** The group `id` anywhere in a response — what a `group=<id>` call returns for a category or a type (open question Q-group-expand). */
export function findGroup(res: Pick<OptionsOk, 'groups'>, id: string): OptionGroup | null {
  for (const g of res.groups ?? []) {
    if (g.id === id) return g;
    const inner = g.children ? findGroup({ groups: g.children }, id) : null;
    if (inner) return inner;
  }
  return null;
}

/** A `group=<id>` response as one group: the server's own when it sent it, else one made of whatever options came back. */
export function groupFromResponse(res: OptionsOk, id: string, label = ''): OptionGroup {
  const g = findGroup(res, id);
  if (g) return g;
  const options = itemsOf(res);
  return { id, label, count: options.length, options };
}

/* ── QA-1: the orders step before it has a list ── */

/** What the orders step shows: `loading` (asking / waiting), `empty` (nothing to pick from), `error` (could not ask), `ready` (a list). */
export type OrdersPhase = 'loading' | 'empty' | 'error' | 'ready';

/** An R4 `orders` first page said as a phase: no rows at all is `empty`, whatever its `total` claims. */
export function ordersPhaseOf(res: OptionsOk | null, wait: 'loading' | 'error'): OrdersPhase {
  if (!res) return wait;
  const rows = res.groups.reduce((n, g) => n + g.count, 0) + (res.flat?.length ?? 0);
  return res.total > 0 || rows > 0 ? 'ready' : 'empty';
}

/**
 * Asks R4 `orders` for the first page (§6.6) — the only way a step that arrived without `orders` can get its list (the import
 * may still be running; the route may not be served yet). Never throws: a failure is `{ok:false}` → the widget says so and offers Try again.
 */
export async function loadFirstOrders(
  load: (kind: OptionsKind, query: OptionsQuery) => Promise<OptionsResponse>,
): Promise<{ ok: true; orders: OptionsOk } | { ok: false }> {
  try {
    const res = await load('orders', {});
    return res.ok ? { ok: true, orders: res } : { ok: false };
  } catch {
    return { ok: false };
  }
}
