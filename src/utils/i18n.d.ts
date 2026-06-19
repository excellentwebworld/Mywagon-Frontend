import 'i18next';
import en from '../locale/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
      common: typeof en;
      auth: typeof en;
      product: typeof en;
    };
  }
}
