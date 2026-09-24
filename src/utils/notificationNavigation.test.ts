import { describe, expect, it } from 'vitest';
import { resolveNotificationPath } from './notificationNavigation';

describe('resolveNotificationPath', () => {
  it('routes searchTrucks to /search-trucks', () => {
    expect(resolveNotificationPath({ action_type: 'searchTrucks', action_id: '', chips: [] })).toBe(
      '/search-trucks',
    );
  });

  it('routes viewBids with action_id to shipment bids focus', () => {
    expect(
      resolveNotificationPath({ action_type: 'viewBids', action_id: '42', chips: [] }),
    ).toBe('/shipments/42?focus=bids');
  });

  it('routes viewProducts to /products (not /product-master)', () => {
    expect(resolveNotificationPath({ action_type: 'viewProducts', action_id: '', chips: [] })).toBe(
      '/products',
    );
  });

  it('routes openChat to /messages', () => {
    expect(resolveNotificationPath({ action_type: 'openChat', action_id: '', chips: [] })).toBe(
      '/messages',
    );
  });

  it('routes openChat with partner id', () => {
    expect(resolveNotificationPath({ action_type: 'openChat', action_id: '99', chips: [] })).toBe(
      '/messages?userId=99',
    );
  });

  it('routes viewTerms to settings terms', () => {
    expect(resolveNotificationPath({ action_type: 'viewTerms', action_id: '', chips: [] })).toBe(
      '/settings/terms',
    );
  });

  it('returns null for external_url (caller opens new tab)', () => {
    expect(
      resolveNotificationPath({
        action_type: null,
        action_id: '',
        chips: [],
        external_url: 'https://example.com',
      }),
    ).toBeNull();
  });
});
