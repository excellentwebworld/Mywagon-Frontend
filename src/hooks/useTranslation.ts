import { useEffect, useCallback } from 'react';
import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export function useTranslation() {
  const { lang } = useApp();
  const { t: rawT, i18n } = useReactI18nextTranslation();

  useEffect(() => {
    const current = String(i18n.language || '')
      .toLowerCase()
      .split(/[-_]/)[0];
    if (current !== lang) {
      void i18n.changeLanguage(lang);
    }
  }, [lang, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps -- i18n instance is stable; language string is enough

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
