import { describe, expect, it } from 'vitest';
import {
  resolveLaravelStylePushRoute,
  resolveNotificationActionId,
  resolveNotificationPath,
} from './notificationNavigation';

describe('resolveNotificationActionId', () => {
  it('prefers action_id over SID chip (same as Laravel type_id)', () => {
    expect(
      resolveNotificationActionId({
        action_type: 'viewBids',
        action_id: '10511',
        chips: ['SID-248826'],
      }),
    ).toBe('10511');
  });

  it('falls back to SID chip digits only when action_id is missing', () => {
    expect(
      resolveNotificationActionId({
        action_type: 'viewBids',
        action_id: '',
        chips: ['SID-248826'],
      }),
    ).toBe('248826');
  });
});

describe('resolveLaravelStylePushRoute (parity with Blade firebase-push-handler)', () => {
  it('routes shipment type with type_id to shipment detail', () => {
    expect(
      resolveLaravelStylePushRoute({ type: 'shipment', type_id: '10511' }),
    ).toBe('/shipments/10511');
  });

  it('routes cancel_shipment like manage-shipment.show', () => {
    expect(
      resolveLaravelStylePushRoute({ type: 'cancel_shipment', type_id: '9' }),
    ).toBe('/shipments/9');
  });

  it('routes availability to search trucks', () => {
    expect(resolveLaravelStylePushRoute({ type: 'availibility' })).toBe('/search-trucks');
    expect(resolveLaravelStylePushRoute({ type: 'truck_availability' })).toBe('/search-trucks');
  });

  it('routes partner / message / invoice / kyc like Laravel', () => {
    expect(resolveLaravelStylePushRoute({ type: 'partner_request' })).toBe('/partners');
    expect(resolveLaravelStylePushRoute({ type: 'message' })).toBe('/messages');
    expect(resolveLaravelStylePushRoute({ type: 'invoice' })).toBe('/billing');
    expect(resolveLaravelStylePushRoute({ type: 'invoice', type_id: '99' })).toBe('/billing?invoice=99');
    expect(resolveLaravelStylePushRoute({ type: 'kyc_accepted' })).toBe('/settings/compliance');
    expect(resolveLaravelStylePushRoute({ type: 'terms_and_conditions' })).toBe('/settings/terms');
  });

  it('routes viewInvoice with action_id to billing invoice deep link', () => {
    expect(
      resolveNotificationPath({ action_type: 'viewInvoice', action_id: '55', chips: [] }),
    ).toBe('/billing?invoice=55');
  });
});

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

  it('routes viewBids using action_id even when SID chip differs', () => {
    expect(
      resolveNotificationPath({
        action_type: 'viewBids',
        action_id: '10511',
        chips: ['SID-248826'],
      }),
    ).toBe('/shipments/10511?focus=bids');
  });

  it('routes viewLoad with action_id (not SID chip)', () => {
    expect(
      resolveNotificationPath({
        action_type: 'viewLoad',
        action_id: '99',
        chips: ['SID-111'],
      }),
    ).toBe('/shipments/99');
  });

  it('routes openChat with partner id', () => {
    expect(resolveNotificationPath({ action_type: 'openChat', action_id: '99', chips: [] })).toBe(
      '/messages?userId=99',
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
