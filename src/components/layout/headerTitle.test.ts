import { describe, expect, it } from 'vitest';
import { getHeaderPageTitle } from './Header';

describe('getHeaderPageTitle (BUG-10)', () => {
  const dummyT = (key: string, fallback?: string) => {
    const translations: Record<string, string> = {
      dashboard: 'Dashboard',
      notifications: 'Notifications',
      navMessages: 'Messages',
      createShipment: 'Create Shipment',
      manageShipments: 'Shipments',
      satPageTitle: 'Search Trucks',
      truckAvailability: 'Search Trucks',
      addressBook: 'Address Book',
      products: 'Product Master',
      partners: 'Partners',
      'priceLists.title': 'Price Lists',
      priceLists: 'Price Lists',
      erpOrders: 'ERP Orders',
      'settings.securityTrust': 'Security & Trust',
      'settings.title': 'Settings',
      'sidebar.billing': 'Billing',
      billing: 'Billing',
      'sidebar.subscription': 'Subscription',
      navSubscription: 'Subscription',
      'sidebar.support': 'Support & Feedback',
      support: 'Support & Feedback',
      'tutorials.pageTitle': 'Tutorials',
      tutorial: 'Tutorials',
      weeklyReports: 'Weekly Reports',
      navWeeklyReports: 'Weekly Reports',
    };
    return translations[key] || fallback || key;
  };

  it('returns "Price Lists" for /pricing', () => {
    expect(getHeaderPageTitle('/pricing', dummyT)).toBe('Price Lists');
  });

  it('returns "Price Lists" for /price-lists', () => {
    expect(getHeaderPageTitle('/price-lists', dummyT)).toBe('Price Lists');
  });

  it('returns "Dashboard" for /dashboard', () => {
    expect(getHeaderPageTitle('/dashboard', dummyT)).toBe('Dashboard');
  });

  it('returns "Address Book" for /address-book', () => {
    expect(getHeaderPageTitle('/address-book', dummyT)).toBe('Address Book');
  });

  it('returns "Product Master" for /products', () => {
    expect(getHeaderPageTitle('/products', dummyT)).toBe('Product Master');
  });

  it('returns "ERP Orders" for /erp-orders', () => {
    expect(getHeaderPageTitle('/erp-orders', dummyT)).toBe('ERP Orders');
  });

  it('returns "Partners" for /partners', () => {
    expect(getHeaderPageTitle('/partners', dummyT)).toBe('Partners');
  });

  it('returns "Search Trucks" for /search-trucks', () => {
    expect(getHeaderPageTitle('/search-trucks', dummyT)).toBe('Search Trucks');
  });

  it('returns "Shipments" for /shipments', () => {
    expect(getHeaderPageTitle('/shipments', dummyT)).toBe('Shipments');
  });

  it('returns "Create Shipment" for /shipments/create', () => {
    expect(getHeaderPageTitle('/shipments/create', dummyT)).toBe('Create Shipment');
  });

  it('returns "Messages" for /messages and /chat', () => {
    expect(getHeaderPageTitle('/messages', dummyT)).toBe('Messages');
    expect(getHeaderPageTitle('/chat', dummyT)).toBe('Messages');
  });

  it('returns "Settings" for /settings', () => {
    expect(getHeaderPageTitle('/settings', dummyT)).toBe('Settings');
  });

  it('returns "Billing" for /billing', () => {
    expect(getHeaderPageTitle('/billing', dummyT)).toBe('Billing');
  });

  it('returns "Subscription" for /subscription', () => {
    expect(getHeaderPageTitle('/subscription', dummyT)).toBe('Subscription');
  });

  it('returns "Support & Feedback" for /support', () => {
    expect(getHeaderPageTitle('/support', dummyT)).toBe('Support & Feedback');
  });

  it('returns "Tutorials" for /tutorials', () => {
    expect(getHeaderPageTitle('/tutorials', dummyT)).toBe('Tutorials');
  });

  it('returns "Weekly Reports" for /analytics and /analytics/weekly-reports', () => {
    expect(getHeaderPageTitle('/analytics', dummyT)).toBe('Weekly Reports');
    expect(getHeaderPageTitle('/analytics/weekly-reports', dummyT)).toBe('Weekly Reports');
  });
});
