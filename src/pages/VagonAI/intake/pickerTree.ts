/**
 * The tree behind every grouped picker of the intake (locations by company, products by Category › Type › SKU,
 * orders by customer, partners): R4 groups → nodes → the rows that are on screen for the open groups and the search.
 *
 * Collapsed by default (MS3-396): a group is open only when the shipper opened it, or when a search matched something
 * inside it. Counts are the server's TRUE counts (MS3-394), never the number of rows that happen to be loaded.
 * Pure: no React; the widgets own `expanded` and `query` as state.
 */
import type { OptionGroup, OptionItem } from './contract';

export interface PickNode {
  /** Unique in the tree. */
  key: string;
  /** The record id for an option; the group's id for a group (a selectable group — a product TYPE — answers with it). */
  id: string;
  label: string; subtitle?: string; badges?: string[];
  /** A group's TRUE count. */
  count?: number;
  disabled?: boolean; reason?: string;
  kind: 'group' | 'option';
  itemKind?: 'sku' | 'type';
  selectable: boolean;
  /** A selectable GROUP answers with this id, never with its own: a product TYPE is answered by the id of the shipper's own type row
   *  (§20.5), which the gateway sends as the group's first option (`kind:'type'`). Absent on options (they answer with `id`). */
  pickId?: string;
  /** The type row exists but is `disabled:true` (the shipper has no generic row): shown, not pressable, never an id fallback. */
  typeDisabled?: boolean;
  /** A group the server counts rows for but has not sent them (`collapsed`): they are fetched with `group=<id>` when it opens. */
  lazy?: boolean;
  children: PickNode[];
}

export interface TreeOptions {
  /** Depth at which a GROUP is itself a choice (products: 1 = the Type level). */
  selectableDepth?: number;
}

const optionNode = (o: OptionItem): PickNode => ({
  key: `o:${o.id}`, id: o.id, label: o.title, ...(o.subtitle ? { subtitle: o.subtitle } : {}),
  ...(o.badges && o.badges.length > 0 ? { badges: o.badges } : {}),
  ...(o.disabled ? { disabled: true } : {}), ...(o.reason ? { reason: o.reason } : {}),
  kind: 'option', ...(o.kind ? { itemKind: o.kind } : {}), selectable: !o.disabled, children: [],
});

export function nodesOfItems(items: readonly OptionItem[]): PickNode[] {
  return items.map(optionNode);
}

/** What a node answers with: a type group its type row's id (§20.5), an option its own id. */
export const answerIdOf = (n: PickNode): string => n.pickId ?? n.id;

export function nodesOfGroups(groups: readonly OptionGroup[], opts: TreeOptions = {}, depth = 0): PickNode[] {
  return groups.map((g) => {
    const asType = opts.selectableDepth === depth;
    const own = g.options ?? [];
    // The type row is the group's choice, not one of its SKUs: it is lifted out of the rows (so the SKU list and its count stay true).
    const typeRow = asType ? own.find((o) => o.kind === 'type') : undefined;
    const rest = typeRow ? own.filter((o) => o !== typeRow) : own;
    const children = [...nodesOfGroups(g.children ?? [], opts, depth + 1), ...nodesOfItems(rest)];
    const pickable = typeRow !== undefined && typeRow.disabled !== true;
    return {
      key: `g:${g.id}`, id: g.id, label: g.label, count: g.count, kind: 'group' as const,
      selectable: pickable, ...(pickable ? { pickId: typeRow!.id } : {}),
      ...(typeRow && typeRow.disabled === true ? { typeDisabled: true, ...(typeRow.reason ? { reason: typeRow.reason } : {}) } : {}),
      lazy: children.length === 0 && g.count > 0, children,
    };
  });
}

/** Groups when the response has them, else its flat list. */
export function nodesOfResponse(res: { groups: OptionGroup[]; flat?: OptionItem[] }, opts: TreeOptions = {}): PickNode[] {
  return res.groups.length > 0 ? nodesOfGroups(res.groups, opts) : nodesOfItems(res.flat ?? []);
}

/** The loaded rows of a lazy group arrive (`group=<id>`): fills it and clears `lazy`. */
export function fillGroup(nodes: readonly PickNode[], groupId: string, items: readonly OptionItem[]): PickNode[] {
  return nodes.map((n) => {
    if (n.kind !== 'group') return n;
    if (n.id === groupId) return { ...n, lazy: false, children: [...n.children.filter((c) => c.kind === 'group'), ...nodesOfItems(items)] };
    return n.children.length > 0 ? { ...n, children: fillGroup(n.children, groupId, items) } : n;
  });
}

/** How many choosable rows are loaded under these nodes. */
export function loadedCount(nodes: readonly PickNode[]): number {
  return nodes.reduce((n, x) => n + (x.kind === 'option' ? 1 : loadedCount(x.children)), 0);
}

/** A group's true count: the server's, else what is loaded. */
export const countOf = (n: PickNode): number => (n.kind === 'group' ? n.count ?? loadedCount(n.children) : 1);

const fold = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const haystack = (n: PickNode): string => fold([n.label, n.subtitle, ...(n.badges ?? [])].filter(Boolean).join(' '));

/** Every word typed must be in the row's text (title, subtitle, badges), accents and case ignored (Greek tonos). */
export function matches(n: PickNode, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const h = haystack(n);
  return words.every((w) => h.includes(w));
}

export interface Row { node: PickNode; depth: number; open: boolean }

/**
 * The rows to draw. No query: the roots, plus the children of every group the shipper opened. With a query: the rows that
 * match and the groups that contain one (open, so the match is visible); a group that matches by its own name stays
 * closed — its count says how much is in it.
 */
export function visibleRows(nodes: readonly PickNode[], expanded: ReadonlySet<string>, query: string): Row[] {
  const searching = query.trim() !== '';
  const out: Row[] = [];
  const hasMatch = (n: PickNode): boolean => matches(n, query) || n.children.some(hasMatch);
  const walk = (list: readonly PickNode[], depth: number, all: boolean) => {
    for (const n of list) {
      if (n.kind === 'option') {
        if (!searching || all || matches(n, query)) out.push({ node: n, depth, open: false });
        continue;
      }
      if (searching && !all && !hasMatch(n)) continue;
      const inside = searching && !all && n.children.some(hasMatch);
      const open = expanded.has(n.key) || inside;
      out.push({ node: n, depth, open });
      // Once a group matched by its own name, everything under it is shown when it is opened.
      if (open) walk(n.children, depth + 1, all || (searching && matches(n, query)));
    }
  };
  walk(nodes, 0, false);
  return out;
}

/** Toggles a group key in an expanded list (state is kept as an array, which a test can compare). */
export const toggled = (expanded: readonly string[], key: string): string[] =>
  (expanded.includes(key) ? expanded.filter((k) => k !== key) : [...expanded, key]);

/** A lazily loaded group arrives WITH its own children (a category fetched with `group=<id>` answers with its types): replaces it. */
export function replaceGroup(nodes: readonly PickNode[], groupId: string, group: OptionGroup, opts: TreeOptions = {}, depth = 0): PickNode[] {
  return nodes.map((n) => {
    if (n.kind !== 'group') return n;
    if (n.id === groupId) {
      const [fresh] = nodesOfGroups([group], opts, depth);
      return fresh ? { ...fresh, key: n.key, lazy: false } : n;
    }
    return n.children.length > 0 ? { ...n, children: replaceGroup(n.children, groupId, group, opts, depth + 1) } : n;
  });
}
