/**
 * Typed numbers, read the way the shipper's own keyboard writes them (QA-1: a Greek user types `1.234,50`).
 *
 * A number may carry a thousands separator and a decimal mark, in either order of convention:
 *   `1.234,50`  `1,234.50`  `1 234,5`  `12,5`  `12.5`  `1234`  `1.234.567`  `1,234,567`
 * Rules (the same for every number the intake parses — prices, order value, quantity, weight):
 *   • Spaces, non-breaking spaces and `€` are ignored. Anything else that is not a digit, `.` or `,` is refused.
 *   • BOTH marks present ⇒ the one that comes LAST is the decimal mark, the other is a thousands mark and must sit in
 *     proper groups of three (`1.234,50` ok; `1,2.3`, `12.34,5` refused).
 *   • ONE mark, repeated ⇒ it can only be a thousands mark (`1.234.567`); a repeated mark in a wrong grouping is refused.
 *   • ONE mark, once, and AMBIGUOUS (`1.234` / `1,234`: a single group of exactly three digits after 1–3 leading digits,
 *     not starting with 0): the shipper's LANGUAGE decides. The mark that is the language's decimal mark is a decimal
 *     (`1.234` in English is 1.234); the other is a thousands mark (`1,234` in English, `1.234` in Greek, is 1234).
 *     So a thousands separator is never silently read as a decimal in the shipper's own convention, and a value that
 *     the rule limits to 2 decimals (`1.234` in English, `1,234` in Greek) is refused rather than guessed.
 *   • ONE mark, once, anything else (`12,5`, `12.5`, `1234,5`, `0,123`) ⇒ that mark is the decimal mark, in both languages.
 * Pure: no React, no i18n. The language arrives as a `NumberLocale`.
 */

/** Which mark is the language's decimal mark (`.` in English, `,` in Greek). */
export interface NumberLocale { decimal: '.' | ',' }
export const EN_NUMBERS: NumberLocale = { decimal: '.' };
export const EL_NUMBERS: NumberLocale = { decimal: ',' };

export interface NumberRules {
  /** Integer digits allowed (7 ⇒ up to 9,999,999). */
  maxIntDigits: number;
  /** Decimal digits allowed. */
  decimals: number;
  /** `false` ⇒ the value must be above zero. */
  allowZero?: boolean;
}
export type NumberParse = { ok: true; value: number } | { ok: false; reason: 'empty' | 'invalid' };

const other = (m: '.' | ','): '.' | ',' => (m === '.' ? ',' : '.');
const esc = (m: string): string => `\\${m}`;
const count = (s: string, ch: string): number => s.split(ch).length - 1;

/** Splits a cleaned string into `[integerDigits, decimalDigits]`, or null when its separators make no sense. */
function split(s: string, loc: NumberLocale): [string, string] | null {
  const dots = count(s, '.');
  const commas = count(s, ',');
  if (dots === 0 && commas === 0) return [s, ''];
  if (dots > 0 && commas > 0) {
    const decimal: '.' | ',' = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const group = other(decimal);
    if (count(s, decimal) !== 1) return null;
    const [int, dec] = s.split(decimal) as [string, string];
    if (!new RegExp(`^\\d{1,3}(${esc(group)}\\d{3})+$`).test(int) || !/^\d+$/.test(dec)) return null;
    return [int.split(group).join(''), dec];
  }
  const mark: '.' | ',' = dots > 0 ? '.' : ',';
  const n = dots > 0 ? dots : commas;
  if (n >= 2) {
    return new RegExp(`^\\d{1,3}(${esc(mark)}\\d{3}){2,}$`).test(s) ? [s.split(mark).join(''), ''] : null;
  }
  const [int, dec] = s.split(mark) as [string, string];
  if (!/^\d+$/.test(int) || !/^\d+$/.test(dec)) return null;
  const looksGrouped = dec.length === 3 && /^[1-9]\d{0,2}$/.test(int);
  if (looksGrouped && mark !== loc.decimal) return [int + dec, ''];
  return [int, dec];
}

export function parseNumber(raw: string, rules: NumberRules, loc: NumberLocale = EN_NUMBERS): NumberParse {
  const s = raw.replace(/[\s\u00a0\u202f€]/g, '');
  if (s === '') return { ok: false, reason: 'empty' };
  if (!/^\d[\d.,]*$/.test(s) || !/\d$/.test(s)) return { ok: false, reason: 'invalid' };
  const parts = split(s, loc);
  if (!parts) return { ok: false, reason: 'invalid' };
  const int = parts[0].replace(/^0+(?=\d)/, '');
  const dec = parts[1];
  if (int.length > rules.maxIntDigits || dec.length > rules.decimals) return { ok: false, reason: 'invalid' };
  const value = Number(`${int}.${dec || '0'}`);
  if (!Number.isFinite(value) || (value <= 0 && rules.allowZero !== true)) return { ok: false, reason: 'invalid' };
  return { ok: true, value };
}

/** `1234.5` → `1,234.50` (English) / `1.234,50` (Greek): what is SHOWN (notes, totals). Always `decimals` digits. */
export function formatMoney(n: number, loc: NumberLocale = EN_NUMBERS, decimals = 2): string {
  const fixed = (Math.round(n * 10 ** decimals) / 10 ** decimals).toFixed(decimals);
  const [int, dec] = fixed.split('.') as [string, string | undefined];
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, other(loc.decimal));
  return dec ? `${grouped}${loc.decimal}${dec}` : grouped;
}

/** `1280.5` → `1280.5` / `1280,5`: what goes back INTO a box — no grouping, no trailing zeros, the language's decimal mark. */
export function formatInput(n: number, loc: NumberLocale = EN_NUMBERS, decimals = 2): string {
  const s = String(Math.round(n * 10 ** decimals) / 10 ** decimals);
  return loc.decimal === ',' ? s.replace('.', ',') : s;
}
