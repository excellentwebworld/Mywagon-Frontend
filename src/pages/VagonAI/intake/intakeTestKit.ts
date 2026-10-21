/**
 * Test helpers for the intake widgets (imported by the *.test.ts files only; the app never imports this).
 *
 * The repo's vitest runs in `node` with no DOM and no testing-library, so widgets are "rendered" by walking the
 * React element tree: function components are called (with a stand-in hook dispatcher, so the two widgets that hold a
 * little state can be driven), host elements are kept as `{ type, props, children }`.
 */
import * as React from 'react';
import en from '../../../locale/en.json';
import el from '../../../locale/el.json';
import { resolveTheme } from '../../../utils/themes';
import type { ExistsFn, TFn } from './intakeCopy';
import type { IntakeUi } from './intakeUi';

export type Lang = 'en' | 'el';
export const LOCALES = { en, el } as const;

const lookup = (lang: Lang, key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), LOCALES[lang]);

/** A translator that behaves like i18next for what the intake code uses: defaultValue, {{x}}, skipInterpolation. */
export function makeT(lang: Lang): TFn {
  return (key, a, b) => {
    const opts = (typeof a === 'object' && a ? a : b ?? {}) as Record<string, unknown>;
    const dflt = typeof a === 'string' ? a : (opts.defaultValue as string | undefined);
    const v = lookup(lang, key);
    if (typeof v !== 'string') return dflt ?? key;
    if (opts.skipInterpolation) return v;
    return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (w, n: string) => (n in opts ? String(opts[n]) : w));
  };
}
export const makeExists = (lang: Lang): ExistsFn => (key) => typeof lookup(lang, key) === 'string';
export const makeUi = (lang: Lang = 'en'): IntakeUi => ({ T: resolveTheme('amethyst', false), t: makeT(lang) });

/* ── element-tree walking ── */

export interface Host { type: string; props: Record<string, unknown>; children: Node[] }
export type Node = Host | string;

interface Internals { H: unknown }
const internals = (): Internals => (React as unknown as Record<string, Internals>).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE!;

/** `states[i]` is what the i-th `useState` of the widget returns as its value (setter calls are recorded in `setCalls`). */
export interface Rendered { tree: Node[]; setCalls: { index: number; value: unknown }[] }

export function render(root: React.ReactNode, states: unknown[] = []): Rendered {
  const setCalls: { index: number; value: unknown }[] = [];
  let hook = 0;
  const dispatcher = {
    useState: (init: unknown) => {
      const i = hook++;
      const v = i < states.length ? states[i] : (typeof init === 'function' ? (init as () => unknown)() : init);
      return [v, (x: unknown) => { setCalls.push({ index: i, value: x }); }];
    },
    useRef: (v: unknown) => ({ current: v }),
    useMemo: (f: () => unknown) => f(),
    useCallback: (f: unknown) => f,
    useEffect: () => undefined,
    useLayoutEffect: () => undefined,
    useId: () => 'id',
    useContext: (c: { _currentValue?: unknown }) => c._currentValue,
  };
  const walk = (n: React.ReactNode): Node[] => {
    if (n === null || n === undefined || typeof n === 'boolean') return [];
    if (typeof n === 'string' || typeof n === 'number') return [String(n)];
    if (Array.isArray(n)) return n.flatMap(walk);
    const el = n as React.ReactElement<Record<string, unknown>>;
    const type = el.type as unknown;
    if (type === React.Fragment) return walk(el.props.children as React.ReactNode);
    if (typeof type === 'string') return [{ type, props: el.props, children: walk(el.props.children as React.ReactNode) }];
    if (typeof type === 'function') {
      const prev = internals().H;
      internals().H = dispatcher;
      hook = 0;
      let out: React.ReactNode;
      try { out = (type as (p: unknown) => React.ReactNode)(el.props); } finally { internals().H = prev; }
      return walk(out);
    }
    return []; // forwardRef / memo objects (icons): opaque
  };
  return { tree: walk(root), setCalls };
}

export const textOf = (nodes: Node[]): string =>
  nodes.map((n) => (typeof n === 'string' ? n : textOf(n.children))).join('');

export function findAll(nodes: Node[], pred: (h: Host) => boolean): Host[] {
  const out: Host[] = [];
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    if (pred(n)) out.push(n);
    out.push(...findAll(n.children, pred));
  }
  return out;
}
export const byTestId = (nodes: Node[], id: string): Host | undefined => findAll(nodes, (h) => h.props['data-testid'] === id)[0];
export const allTestIds = (nodes: Node[]): string[] => findAll(nodes, (h) => typeof h.props['data-testid'] === 'string').map((h) => h.props['data-testid'] as string);
export const isDisabled = (h: Host | undefined): boolean => !!h && h.props.disabled === true;
/** A click like a browser's: a disabled control does nothing. */
export function click(h: Host | undefined): void {
  if (!h) throw new Error('element not found');
  if (h.props.disabled === true) return;
  (h.props.onClick as (() => void) | undefined)?.();
}
