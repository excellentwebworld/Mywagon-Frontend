import { useEffect, useCallback } from 'react';
import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export function useTranslation() {
  const { lang } = useApp();
  const { t: rawT, i18n } = useReactI18nextTranslation();

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

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
