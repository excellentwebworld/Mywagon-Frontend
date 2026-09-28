/**
 * Translation for Vagon AI's pure helpers.
 *
 * The draft modules (`createShipmentDraft`, `createLocationDraft`, ...) build
 * the messages the cards show, and they are plain functions tested without
 * React - so they cannot call `useTranslation`. They take a `Tr` instead, and
 * default to English: every existing caller and every test keeps working
 * unchanged, and a card passes `useTr()` to get the shipper's language.
 *
 * The English text is written at the call site as the fallback, so a key missing
 * from a locale file still reads as a sentence rather than as `vagonai.x.y`.
 */
import { useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export type TrParams = Record<string, string | number>;

/** `(key, english, params?) => text in the shipper's language`. */
export type Tr = (key: string, en: string, params?: TrParams) => string;

/** `{{name}}` interpolation, the same syntax i18next uses. */
export function interpolate(text: string, params?: TrParams): string {
  if (!params) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** The default for pure helpers: the English fallback, interpolated. */
export const englishTr: Tr = (_key, en, params) => interpolate(en, params);

/** A `Tr` bound to the current locale, for components to hand to the helpers. */
export function useTr(): Tr {
  const { t } = useTranslation();
  return useCallback<Tr>((key, en, params) => t(key, { defaultValue: en, ...(params ?? {}) }), [t]);
}
