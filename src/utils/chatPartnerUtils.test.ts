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

  describe('document chat helpers', () => {
    it('detects document URLs accurately', async () => {
      const { isChatDocumentUrl, isChatDocumentMessage, getDocumentDisplayName, getChatMessagePreview } = await import('./chatPartnerUtils');
      expect(isChatDocumentUrl('https://s3.amazonaws.com/chat-attachments/waybill.pdf')).toBe(true);
      expect(isChatDocumentUrl('https://s3.amazonaws.com/chat-attachments/invoice.docx')).toBe(true);
      expect(isChatDocumentUrl('https://s3.amazonaws.com/chat-attachments/rates.xlsx')).toBe(true);
      expect(isChatDocumentUrl('https://s3.amazonaws.com/chat-attachments/manifest.csv')).toBe(true);
      expect(isChatDocumentUrl('https://s3.amazonaws.com/chat-attachments/photo.jpg')).toBe(false);

      expect(isChatDocumentMessage('document', 'https://s3/doc.pdf')).toBe(true);
      expect(isChatDocumentMessage('text', 'https://s3/doc.pdf')).toBe(true);
      expect(isChatDocumentMessage('text', 'Hello there')).toBe(false);

      expect(getDocumentDisplayName('https://s3/chat-attachments/Bill_of_Lading.pdf?v=1')).toBe('Bill_of_Lading.pdf');
      expect(getChatMessagePreview('https://s3/Waybill.pdf', 'document')).toBe('📄 Waybill.pdf');
    });

    it('ignores failed messages when resolving last preview', async () => {
      const { getLastNonFailedMessagePreview } = await import('./chatPartnerUtils');
      const messages = [
        { id: 1, type: 'received', text: 'Nns' },
        { id: 2, type: 'sent', text: 'ji' },
        { id: 3, type: 'sent', text: 'blob:...', messages_type: 'document', fileName: 'INV-03268_line_items.csv', isFailed: true },
      ];

      expect(getLastNonFailedMessagePreview(messages, 'No messages')).toBe('ji');
    });

    it('extracts server validation errors accurately', async () => {
      const { extractChatErrorMessage } = await import('./chatPartnerUtils');

      const serverErr = {
        response: {
          data: {
            success: false,
            message: 'The file must be a file of type: jpg, jpeg, png, gif, webp.',
            errors: {
              file: ['The file must be a file of type: jpg, jpeg, png, gif, webp.'],
            },
          },
        },
      };

      expect(extractChatErrorMessage(serverErr, 'Fallback message')).toBe(
        'The file must be a file of type: jpg, jpeg, png, gif, webp.'
      );
    });
  });
});
