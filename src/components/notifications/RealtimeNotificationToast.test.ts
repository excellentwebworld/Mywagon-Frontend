import { describe, expect, it } from 'vitest';
import { resolveNotificationConfig } from './RealtimeNotificationToast';

describe('resolveNotificationConfig (FCM toast deep links)', () => {
  it('routes product payloads to /products', () => {
    const cfg = resolveNotificationConfig({ title: 't', body: 'b', type: 'product' });
    expect(cfg.route).toBe('/products');
  });

  it('routes availability to search trucks', () => {
    const cfg = resolveNotificationConfig({ title: 't', body: 'b', type: 'availability' });
    expect(cfg.route).toBe('/search-trucks');
  });

  it('routes message type to chat', () => {
    const cfg = resolveNotificationConfig({
      title: 't',
      body: 'b',
      type: 'message',
      chat_partner_id: '12',
      chat_partner_type: 'carrier',
    });
    expect(cfg.route).toContain('/messages');
    expect(cfg.route).toContain('userId=12');
  });

  it('routes shipment with id to load detail', () => {
    const cfg = resolveNotificationConfig({
      title: 't',
      body: 'b',
      type: 'shipment',
      type_id: '55',
    });
    expect(cfg.route).toBe('/shipments/55');
  });

  it('routes kyc to compliance settings', () => {
    const cfg = resolveNotificationConfig({ title: 't', body: 'b', type: 'kyc' });
    expect(cfg.route).toBe('/settings/compliance');
  });
});
