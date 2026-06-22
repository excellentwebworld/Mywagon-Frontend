import { useEffect } from 'react';
import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export function useTranslation() {
  const { lang } = useApp();
  const { t, i18n } = useReactI18nextTranslation();

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  return { t, lang, i18n };
}
