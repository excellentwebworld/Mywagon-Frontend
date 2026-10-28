/**
 * Text rendering for the intake host — the one place that turns a `Txt` or a `LocalisableText` into a string.
 *
 * Rules (CONTRACT.md §8.2, §11):
 *  - A live event's `Txt.text` is already rendered by the gateway in the shipper's locale, and may contain
 *    nouns (product / truck / site names) that a template cannot carry — so it is shown AS IS.
 *  - A history answer is a stored snapshot (`LocalisableText`). It is re-rendered from `key` + `params`
 *    with THIS app's locale JSON so it follows a language switch; if the key is unknown here, or the
 *    template needs a param the snapshot did not store, `fallbackText` (the snapshot) is shown instead.
 *
 * Kept free of React so it can be tested, and so the history shape (still moving, C4) changes in one file.
 */
import type { HistoryItem, LocalisableText, Txt } from './contract';

/** Where the widget chrome and history answers live in en.json / el.json. */
export const INTAKE_I18N_ROOT = 'vagonai.shipment.intake';

/** The translator the pages already use (`useTranslation().t`): `t(key, options)`. */
export type TFn = (key: string, fallbackOrOptions?: string | Record<string, unknown>, options?: Record<string, unknown>) => string;
/** Optional: does this locale JSON have the key? (`i18n.exists`). Without it, a miss is detected by the echoed key. */
export type ExistsFn = (key: string) => boolean;

/**
 * Gateway copy keys are dotted paths and some are both a sentence and a parent of another sentence
 * (`error.stale` / `error.stale.fix`), which nested JSON cannot hold. The client stores the child as a
 * camel-cased sibling: `error.stale.fix` → `error.staleFix`. [QUESTION FOR ARCHITECT: make the gateway keys
 * collision-free, or confirm this rule.]
 */
export function feKey(key: string): string {
  return key.replace(/\.(fix|warn|noSuggest)$/, (_m, leaf: string) => leaf.charAt(0).toUpperCase() + leaf.slice(1));
}

export const intakeKey = (key: string): string => `${INTAKE_I18N_ROOT}.${feKey(key)}`;

/** Gateway templates use `{name}`; the client JSON uses i18next's `{{name}}`. The same params fill both. */
export function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{\{?\s*([A-Za-z0-9_]+)\s*\}?\}/g, (whole, name: string) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole
  ));
}

const hasUnfilledSlot = (s: string): boolean => /\{\{?\s*[A-Za-z0-9_]+\s*\}?\}/.test(s);

/** A live event's text: shown as the gateway wrote it. */
export function renderTxt(txt: Txt | null | undefined): string {
  if (!txt) return '';
  return txt.text;
}

/** A stored answer: this app's locale first, the snapshot when that cannot be done honestly. */
export function renderLocalisable(
  t: TFn,
  item: LocalisableText | null | undefined,
  exists?: ExistsFn,
): string {
  if (!item) return '';
  const full = intakeKey(item.key);
  const known = exists ? exists(full) : true;
  if (!known) return item.fallbackText;
  // Ask i18next for the template with no interpolation, then fill it ourselves — so a missing param is
  // detectable (and falls back) instead of printing "{{name}}" in a chat bubble.
  const raw = t(full, { defaultValue: '', skipInterpolation: true, interpolation: { skipOnVariables: true } });
  const template = typeof raw === 'string' ? raw : '';
  if (!template || template === full) return item.fallbackText;
  const filled = interpolate(template, item.params);
  return hasUnfilledSlot(filled) ? item.fallbackText : filled;
}

/** The shipper's answer in a history row, whatever shape the item arrives in. */
export function historyText(t: TFn, item: HistoryItem, exists?: ExistsFn): string {
  return renderLocalisable(t, item.answer, exists);
}
