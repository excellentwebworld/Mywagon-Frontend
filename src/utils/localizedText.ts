import { getUiLocale } from './locale';

/**
 * Turn an API value into something React can render.
 * Localized labels arrive as `{ en, el, label }` and crash (React #31) if
 * interpolated directly. Strings and numbers pass through.
 */
export function localizedText(value: unknown, locale?: 'en' | 'el'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => localizedText(item, locale))
      .filter((part) => part.trim().length > 0)
      .join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const lang = locale ?? getUiLocale();
    const preferred = record[lang];
    if (typeof preferred === 'string' && preferred.trim()) return preferred;
    if (typeof record.label === 'string' && record.label.trim()) return record.label;
    if (record.label && typeof record.label === 'object') {
      const nested = localizedText(record.label, locale);
      if (nested.trim()) return nested;
    }
    if (typeof record.en === 'string' && record.en.trim()) return record.en;
    if (typeof record.el === 'string' && record.el.trim()) return record.el;
    if (typeof record.name === 'string' && record.name.trim()) return record.name;
    return '';
  }
  return '';
}

export function localizedList(value: unknown, locale?: 'en' | 'el'): string[] {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => localizedText(item, locale)).filter((part) => part.trim().length > 0);
}