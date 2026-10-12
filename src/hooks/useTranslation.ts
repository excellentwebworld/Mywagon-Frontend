import { useContext, useEffect, useCallback } from 'react';
import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import { AppContext } from '../context/AppContext';

function readStoredLang(): 'en' | 'el' {
  try {
    const stored =
      localStorage.getItem('shipment-lang') || localStorage.getItem('app_locale') || 'en';
    return stored === 'el' ? 'el' : 'en';
  } catch {
    return 'en';
  }
}

function resolveLang(
  appLang: 'en' | 'el' | undefined,
  i18nLanguage: string | undefined,
): 'en' | 'el' {
  if (appLang === 'en' || appLang === 'el') return appLang;
  const fromI18n = String(i18nLanguage || '')
    .toLowerCase()
    .split(/[-_]/)[0];
  if (fromI18n === 'el') return 'el';
  if (fromI18n === 'en') return 'en';
  return readStoredLang();
}

/**
 * App-locale-aware t(). Safe outside AppProvider (falls back to i18n / localStorage)
 * so shared UI like DatePicker can render on public/auth/error trees.
 */
export function useTranslation() {
  const app = useContext(AppContext);
  const { t: rawT, i18n } = useReactI18nextTranslation();
  const lang = resolveLang(app?.lang, i18n.language);

  useEffect(() => {
    // Only sync i18n from AppProvider when available — avoid fighting other trees.
    if (!app?.lang) return;
    const current = String(i18n.language || '')
      .toLowerCase()
      .split(/[-_]/)[0];
    if (current !== app.lang) {
      void i18n.changeLanguage(app.lang);
    }
  }, [app?.lang, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps -- i18n instance is stable; language string is enough

  const t = useCallback(
    (key: string, fallbackOrOptions?: string | Record<string, any>, options?: Record<string, any>): string => {
      if (typeof fallbackOrOptions === 'string') {
        return rawT(key, { defaultValue: fallbackOrOptions, ...options });
      }
      return (rawT as any)(key, fallbackOrOptions);
    },
    [rawT]
  );

  return { t, lang, i18n };
}
