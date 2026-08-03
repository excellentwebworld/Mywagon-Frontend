/** Languages for Profile dropdown + Settings.
 * PDS-937: at least English + Greek. Shipper currently ships only en/el locale files.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', tag: 'GB', dir: 'ltr' },
  { code: 'el', label: 'Greek', nativeLabel: 'Ελληνικά', tag: 'GR', dir: 'ltr' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const ROLES = {
  shipper: {
    key: 'shipper',
    labelKey: 'roles.shipper',
    label: 'Shipper',
    icon: '📦',
  },
} as const;
