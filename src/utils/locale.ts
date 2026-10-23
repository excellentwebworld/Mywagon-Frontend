import { safeLocalGet } from './safeStorage';

/** Where AppContext persists the shipper's chosen UI language. */
export const LANG_STORAGE_KEY = 'shipment-lang';

/**
 * Normalizes a language value to one of the two languages the app and the
 * backends actually support. Anything unrecognized falls back to 'en' rather
 * than being passed through — callers send this to services that reject values
 * outside their supported set.
 */
export function normalizeLocale(lang?: string | null): 'en' | 'el' {
  return lang === 'el' ? 'el' : 'en';
}

/**
 * The shipper's UI language as a single, well-formed BCP-47 tag, for use as an
 * `Accept-Language` request header.
 *
 * Left alone, the browser attaches its own header — `en-US,en;q=0.9` — to every
 * XHR/fetch. The API canonicalizes that value as if the whole string were one
 * locale (PHP's `Locale::canonicalize()` rewrites the hyphen to an underscore),
 * then rejects the result: `Invalid "en_US,en;q=0.9" locale.` Overriding the
 * header with exactly one tag avoids that, and is the behaviour we want anyway
 * — the API should answer in the language picked in the app, not the one the
 * shipper's browser happens to be configured for.
 *
 * Read straight from storage rather than from AppContext: axios interceptors run
 * outside React, and this must apply to pre-login calls too.
 */
export function getUiLocale(): 'en' | 'el' {
  return normalizeLocale(safeLocalGet(LANG_STORAGE_KEY));
}
