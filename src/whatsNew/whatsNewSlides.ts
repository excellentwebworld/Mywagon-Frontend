export interface WhatsNewSlide {
  id: string;
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
  ctaKey: string;
  ctaFallback: string;
  route: string;
}

export const WHATS_NEW_VERSION = 'ui_revamp_v1';

export const WHATS_NEW_SLIDES: WhatsNewSlide[] = [
  {
    id: 'vagon-ai',
    titleKey: 'whatsNew.slides.vagonAi.title',
    titleFallback: 'Vagon AI',
    bodyKey: 'whatsNew.slides.vagonAi.body',
    bodyFallback: 'Ask Vagon AI to draft loads, summarize activity, and speed up everyday shipping work.',
    ctaKey: 'whatsNew.slides.vagonAi.cta',
    ctaFallback: 'Open Vagon AI',
    route: '/vagonai',
  },
  {
    id: 'orders',
    titleKey: 'whatsNew.slides.orders.title',
    titleFallback: 'Orders module',
    bodyKey: 'whatsNew.slides.orders.body',
    bodyFallback: 'Manage ERP and manual orders in one place with filters, details, and bulk actions.',
    ctaKey: 'whatsNew.slides.orders.cta',
    ctaFallback: 'Go to Orders',
    route: '/erp-orders',
  },
  {
    id: 'price-lists',
    titleKey: 'whatsNew.slides.priceLists.title',
    titleFallback: 'Price lists',
    bodyKey: 'whatsNew.slides.priceLists.body',
    bodyFallback: 'Build lane price lists, import CSV, and keep contracted rates ready for pricing.',
    ctaKey: 'whatsNew.slides.priceLists.cta',
    ctaFallback: 'Open Price Lists',
    route: '/pricing',
  },
  {
    id: 'orders-to-loads',
    titleKey: 'whatsNew.slides.ordersToLoads.title',
    titleFallback: 'Create loads from Orders',
    bodyKey: 'whatsNew.slides.ordersToLoads.body',
    bodyFallback: 'Select orders and turn them into shipments without retyping itinerary or cargo details.',
    ctaKey: 'whatsNew.slides.ordersToLoads.cta',
    ctaFallback: 'Try from Orders',
    route: '/erp-orders',
  },
  {
    id: 'security-2fa',
    titleKey: 'whatsNew.slides.security.title',
    titleFallback: 'Security (2FA)',
    bodyKey: 'whatsNew.slides.security.body',
    bodyFallback: 'Protect your account with authenticator or email two-factor authentication.',
    ctaKey: 'whatsNew.slides.security.cta',
    ctaFallback: 'Open Security settings',
    route: '/settings/trustCenter',
  },
  {
    id: 'dark-mode',
    titleKey: 'whatsNew.slides.darkMode.title',
    titleFallback: 'Dark mode',
    bodyKey: 'whatsNew.slides.darkMode.body',
    bodyFallback: 'Switch between light and dark themes from your profile menu or Settings.',
    ctaKey: 'whatsNew.slides.darkMode.cta',
    ctaFallback: 'Open Settings',
    route: '/settings',
  },
  {
    id: 'analytics',
    titleKey: 'whatsNew.slides.analytics.title',
    titleFallback: 'Analytics module',
    bodyKey: 'whatsNew.slides.analytics.body',
    bodyFallback: 'Review weekly performance reports and share insights with your team.',
    ctaKey: 'whatsNew.slides.analytics.cta',
    ctaFallback: 'Open Analytics',
    route: '/analytics/weekly-reports',
  },
  {
    id: 'customization',
    titleKey: 'whatsNew.slides.customization.title',
    titleFallback: 'User customization',
    bodyKey: 'whatsNew.slides.customization.body',
    bodyFallback: 'Personalize navigation, language, and workspace preferences to match how you work.',
    ctaKey: 'whatsNew.slides.customization.cta',
    ctaFallback: 'Customize workspace',
    route: '/settings',
  },
];
