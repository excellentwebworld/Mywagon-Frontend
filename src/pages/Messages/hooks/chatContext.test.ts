import { describe, it, expect } from 'vitest';
import {
  isMatchingShipment,
  filterMessagesByShipmentContext,
} from './useMessages';
import type { ChatMessage } from '../types';

describe('Chat Context & Message Filtering by Shipment', () => {
  describe('isMatchingShipment', () => {
    it('returns true when target filter is "all"', () => {
      const msg: ChatMessage = { type: 'sent', text: 'Hello', shipmentId: 'SID-100' };
      expect(isMatchingShipment(msg, 'all')).toBe(true);
    });

    it('matches when shipmentId is formatted as SID-123 and target is 123', () => {
      const msg: ChatMessage = { type: 'sent', text: 'On my way', shipmentId: 'SID-123' };
      expect(isMatchingShipment(msg, '123')).toBe(true);
    });

    it('matches when shipmentId is formatted as SID-123 and target is SID-123', () => {
      const msg: ChatMessage = { type: 'sent', text: 'On my way', shipmentId: 'SID-123' };
      expect(isMatchingShipment(msg, 'SID-123')).toBe(true);
    });

    it('matches when msg has shipment_id numeric field', () => {
      const msg: ChatMessage = { type: 'sent', text: 'On my way', shipment_id: 123 };
      expect(isMatchingShipment(msg, '123')).toBe(true);
      expect(isMatchingShipment(msg, 'SID-123')).toBe(true);
    });

    it('matches when target is autoId but message has primaryId in shipment_id and contextDbId is passed', () => {
      // Primary ID in DB is 10248, autoId displayed is SID-90828
      const msg: ChatMessage = { type: 'sent', text: 'On route', shipment_id: 10248 };
      expect(isMatchingShipment(msg, 'SID-90828', 10248)).toBe(true);
    });

    it('does not treat contextDbId as a match when filtering a different auto_id', () => {
      const msg: ChatMessage = { type: 'sent', text: 'On route', shipment_id: 10248 };
      expect(isMatchingShipment(msg, 'SID-200', 10248, 'SID-90828')).toBe(false);
    });

    it('does not match messages with no shipment when filtering by a specific shipment', () => {
      const msg: ChatMessage = { type: 'sent', text: 'Direct message without shipment' };
      expect(isMatchingShipment(msg, '123')).toBe(false);
    });
  });

  describe('filterMessagesByShipmentContext', () => {
    const mockMessages: ChatMessage[] = [
      { type: 'date', textEN: 'Monday' },
      { id: 1, type: 'sent', text: 'Direct msg 1' },
      { id: 2, type: 'received', text: 'Shipment 100 msg', shipmentId: 'SID-100' },
      { type: 'date', textEN: 'Tuesday' },
      { id: 3, type: 'sent', text: 'Shipment 200 msg', shipmentId: 'SID-200' },
      { id: 4, type: 'received', text: 'Shipment 100 msg 2', shipment_id: 100 },
      { type: 'date', textEN: 'Wednesday' },
      { id: 5, type: 'sent', text: 'Shipment 300 msg', shipmentId: 'SID-300' },
      { id: 6, type: 'sent', text: 'Shipment with primary ID in DB', shipment_id: 10248 },
    ];

    it('returns all messages when filter is "all" (Direct Chat)', () => {
      const filtered = filterMessagesByShipmentContext(mockMessages, 'all');
      expect(filtered.length).toBe(mockMessages.length);
    });

    it('filters strictly by shipment ID and cleans orphan date separators', () => {
      const filtered = filterMessagesByShipmentContext(mockMessages, '100');

      // Monday has msg id:2 and Tuesday has msg id:4
      // Wednesday should be omitted because it has no shipment 100 messages!
      const ids = filtered.filter((m) => m.type !== 'date').map((m) => m.id);
      expect(ids).toEqual([2, 4]);

      const dateHeaders = filtered.filter((m) => m.type === 'date').map((m) => m.textEN);
      expect(dateHeaders).toEqual(['Monday', 'Tuesday']);
      expect(dateHeaders).not.toContain('Wednesday');
    });

    it('filters by autoId when contextDbId matches the DB primary id', () => {
      const filtered = filterMessagesByShipmentContext(mockMessages, 'SID-90828', 10248, 'SID-90828');
      const ids = filtered.filter((m) => m.type !== 'date').map((m) => m.id);
      expect(ids).toEqual([6]);
    });

    it('does not include the context shipment when filtering another SID', () => {
      const filtered = filterMessagesByShipmentContext(mockMessages, 'SID-200', 10248, 'SID-90828');
      const ids = filtered.filter((m) => m.type !== 'date').map((m) => m.id);
      expect(ids).toEqual([3]);
    });

    it('returns only shipment 200 messages with only its date header', () => {
      const filtered = filterMessagesByShipmentContext(mockMessages, 'SID-200');

      const ids = filtered.filter((m) => m.type !== 'date').map((m) => m.id);
      expect(ids).toEqual([3]);

      const dateHeaders = filtered.filter((m) => m.type === 'date').map((m) => m.textEN);
      expect(dateHeaders).toEqual(['Tuesday']);
    });

    it('returns empty list when no messages match the shipment', () => {
      const filtered = filterMessagesByShipmentContext(mockMessages, '999');
      expect(filtered).toEqual([]);
    });
  });
});
