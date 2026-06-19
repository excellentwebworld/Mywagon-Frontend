import { useApp } from '../context/AppContext';
import en from '../../locale/en.json';
import el from '../../locale/el.json';

const translations: Record<string, Record<string, string>> = {
  en,
  el,
};

export function useTranslation() {
  const { lang } = useApp();

  const t = (key: string): string => {
    const currentDict = translations[lang] || translations['en'];
    return currentDict[key] || key;
  };

  return { t, i18n: { language: lang } };
}
