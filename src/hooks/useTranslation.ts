import { useApp } from '../context/AppContext';
import en from '../locale/en.json';
import el from '../locale/el.json';

const translations: Record<string, Record<string, string>> = {
  en,
  el,
};

export function useTranslation() {
  const { lang } = useApp();

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const currentDict = translations[lang] || translations.en;
    let text = currentDict[key] || key;
    if (vars) {
      for (const [varKey, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, 'g'), String(value));
      }
    }
    return text;
  };

  return { t, lang, i18n: { language: lang } };
}
