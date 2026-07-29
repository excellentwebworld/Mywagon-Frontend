/** Languages for Profile dropdown + Settings (shipper ships en/el; list matches reference UI) */
export const LANGUAGES = [
  { code: 'en', label: 'GB English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'es', label: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'pt', label: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  { code: 'ro', label: 'Română', flag: '🇷🇴', dir: 'ltr' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺', dir: 'ltr' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿', dir: 'ltr' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰', dir: 'ltr' },
  { code: 'bg', label: 'Български', flag: '🇧🇬', dir: 'ltr' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷', dir: 'ltr' },
  { code: 'sl', label: 'Slovenščina', flag: '🇸🇮', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'he', label: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  { code: 'zh', label: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
] as const;

export const ROLES = {
  shipper: {
    key: 'shipper',
    labelKey: 'roles.shipper',
    label: 'Shipper',
    icon: '📦',
  },
} as const;
