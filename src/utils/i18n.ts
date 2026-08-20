import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locale/en.json";
import el from "../locale/el.json";
import { safeLocalGet } from "./safeStorage";

const locale = safeLocalGet("i18nextLng") || "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
        common: en,
        auth: en,
        product: en,
      },
      el: {
        translation: el,
        common: el,
        auth: el,
        product: el,
      },
    },
    lng: locale,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["querystring", "navigator"],
      caches: [],
    },
  });

export default i18n;
