import { describe, it, expect } from 'vitest';
import {
  buildChatFilterSids,
  formatShipmentAutoId,
  isShipmentAutoId,
  resolveNavigatedShipmentIds,
} from './chatPartnerUtils';

describe('shipment auto_id display helpers', () => {
  it('treats SID- values as auto_id and leaves bare primary ids undisplayed', () => {
    expect(isShipmentAutoId('SID-90828')).toBe(true);
    expect(isShipmentAutoId('10111')).toBe(false);
    expect(formatShipmentAutoId('SID-90828')).toBe('SID-90828');
    expect(formatShipmentAutoId('sid-90828')).toBe('SID-90828');
    expect(formatShipmentAutoId('10111')).toBeNull();
    expect(formatShipmentAutoId('')).toBeNull();
  });

  it('uses query sid as primary id and autoId as the display value', () => {
    expect(resolveNavigatedShipmentIds('10111', 'SID-90828')).toEqual({
      primaryId: '10111',
      autoId: 'SID-90828',
    });
  });

  it('does not treat SID-90828 as a primary key', () => {
    expect(resolveNavigatedShipmentIds('SID-90828', '')).toEqual({
      primaryId: null,
      autoId: 'SID-90828',
    });
  });

  it('keeps Filter by scoped to the load opened from shipment detail', () => {
    expect(
      buildChatFilterSids({
        loadScopedAutoId: 'SID-387137',
        messageSids: ['SID-88658', 'SID-387137'],
        currentFilter: 'SID-387137',
      })
    ).toEqual(['SID-387137']);
  });

  it('lists this thread auto_ids when chat is not load-scoped', () => {
    expect(
      buildChatFilterSids({
        messageSids: ['SID-88658', 10299, 'SID-387137'],
        currentFilter: 'all',
      })
    ).toEqual(['SID-88658', 'SID-387137']);
  });
});
