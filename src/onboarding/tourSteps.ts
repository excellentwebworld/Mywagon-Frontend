import type { DriveStep } from 'driver.js';

export type TourTranslate = (key: string, fallback?: string) => string;

function tipHtml(text: string): string {
  if (!text.trim()) return '';
  return `<p class="mv-tour-tip">${text}</p>`;
}

export function buildOnboardingSteps(t: TourTranslate): DriveStep[] {
  const desc = (bodyKey: string, bodyFallback: string, tipKey?: string, tipFallback?: string) => {
    const body = t(bodyKey, bodyFallback);
    const tip = tipKey ? tipHtml(t(tipKey, tipFallback || '')) : '';
    return `<p class="mv-tour-body">${body}</p>${tip}`;
  };

  const welcomeDescription = () => {
    const heading = t('tour.welcome.getStarted', "Let's Get You Started");
    const body = t(
      'tour.welcome.description',
      'This short tour shows you the essential steps to set up MYVAGON and start shipping.',
    );
    return `<div class="mv-tour-welcome-inner"><h3 class="mv-tour-get-started">${heading}</h3><p class="mv-tour-body">${body}</p></div>`;
  };

  return [
    {
      popover: {
        title: t('tour.welcome.title', 'Welcome to MYVAGON'),
        description: welcomeDescription(),
        align: 'center',
        popoverClass: 'mv-tour-popover mv-tour-welcome',
        // First step: Start + Skip only (no Back)
        showButtons: ['next', 'close'],
        nextBtnText: t('tour.controls.start', 'Start'),
      },
    },
    {
      element: '[data-tour="dashboard-overview"]',
      popover: {
        title: t('tour.dashboard.title', 'Your Dashboard'),
        description: desc(
          'tour.dashboard.description',
          'Track KPIs, today’s schedule, live map, and your shipment board from one place.',
        ),
        side: 'bottom',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="address-book"]',
      popover: {
        title: t('tour.addresses.title', 'Set Up Addresses'),
        description: desc(
          'tour.addresses.description',
          'Add the pickup locations you use most often and the customer addresses typically used for deliveries.',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="products"]',
      popover: {
        title: t('tour.products.title', 'Create Products'),
        description: desc(
          'tour.products.description',
          'Create your product master by organizing what you ship by product category and product type, so they can be reused across shipments.',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="partners"]',
      popover: {
        title: t('tour.partners.title', 'Invite Your Partners'),
        description: desc(
          'tour.partners.description',
          'Invite your existing carrier and driver partners to MYVAGON to digitize your dispatching and send them private shipment offers.',
          'tour.partners.tip',
          'Tip: Get started quickly by inviting just one carrier and assigning your first shipment digitally!',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="price-lists"]',
      popover: {
        title: t('tour.priceLists.title', 'Price Lists'),
        description: desc(
          'tour.priceLists.description',
          'Manage carrier and route pricing so you can apply rates quickly when creating shipment offers.',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="erp-orders"]',
      popover: {
        title: t('tour.erpOrders.title', 'ERP Orders'),
        description: desc(
          'tour.erpOrders.description',
          'Import or sync orders from your ERP into MYVAGON to create shipments faster.',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="create-shipment"]',
      popover: {
        title: t('tour.createShipment.title', 'Create Your Shipment'),
        description: desc(
          'tour.createShipment.description',
          'Create a shipment by selecting products, pickup and delivery locations, then send the load offer to your carrier or driver partners.',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="manage-shipments"]',
      popover: {
        title: t('tour.manageShipments.title', 'Manage shipments'),
        description: desc(
          'tour.manageShipments.description',
          'Track, edit, and monitor all your shipments in one place as they move from creation to delivery.',
        ),
        side: 'right',
        align: 'start',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      element: '[data-tour="tutorials"]',
      popover: {
        title: t('tour.tutorials.title', 'Video Guides'),
        description: desc(
          'tour.tutorials.description',
          'Access short video tutorials anytime to learn how to use features or refresh your knowledge.',
        ),
        side: 'right',
        align: 'end',
        popoverClass: 'mv-tour-popover',
        showButtons: ['next', 'previous', 'close'],
      },
    },
    {
      popover: {
        title: t('tour.finish.title', "You're All Set"),
        description: desc(
          'tour.finish.description',
          'You can restart this tour anytime from Settings if you need a quick refresher.',
        ),
        align: 'center',
        popoverClass: 'mv-tour-popover mv-tour-finish',
        // Last step: Back + Finish only (no Skip / no Next label)
        showButtons: ['previous', 'next'],
        doneBtnText: t('tour.controls.finish', 'Finish'),
        showProgress: true,
      },
    },
  ];
}
