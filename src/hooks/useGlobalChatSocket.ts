import { useEffect, useRef } from 'react';
import { socketService, type SocketMessagePayload } from '../services/socketService';
import {
  getActiveChatPartner,
  type ActiveChatPartner,
} from '../utils/chatNotificationGuard';
import {
  getChatMessagePreview,
  isIncomingChatToShipper,
  isMessageFromPartner,
  parsePartnerId,
} from '../utils/chatPartnerUtils';
import type { FcmNotificationPayload } from './useFcm';

export const CHAT_MESSAGE_RECEIVED_EVENT = 'shipper:chat-message-received';

export interface IncomingChatNotification {
  incoming: SocketMessagePayload;
  senderId: number;
  senderType: string;
  senderName: string;
  preview: string;
  toast: FcmNotificationPayload;
}

function shouldSuppressForActiveThread(senderId: number, senderType: string): boolean {
  const active: ActiveChatPartner | null = getActiveChatPartner();
  if (!active) return false;

  return isMessageFromPartner(senderId, senderType, active.partnerId, active.partnerType);
}

function buildIncomingChatNotification(
  incoming: SocketMessagePayload,
  voiceLabel: string,
  photoLabel = 'Photo'
): IncomingChatNotification | null {
  const senderId = parsePartnerId(incoming.sender_id || (incoming as { senderable_id?: number }).senderable_id);
  const senderType = (incoming.sender_type || (incoming as { senderable_type?: string }).senderable_type || 'carrier').toLowerCase();
  const senderName =
    incoming.request_data?.sender_name ||
    incoming.request_data?.carrier_name ||
    'New message';
  const preview = getChatMessagePreview(incoming.message || '', incoming.messages_type, voiceLabel, photoLabel);
  const body =
    (incoming as { notification_body?: string }).notification_body ||
    preview ||
    incoming.message ||
    'New message';

  return {
    incoming,
    senderId,
    senderType,
    senderName,
    preview,
    toast: {
      title: senderName,
      body,
      type: 'message',
      chat_partner_id: String(senderId),
      chat_partner_type: senderType,
    },
  };
}

interface UseGlobalChatSocketOptions {
  userId?: number | string;
  voiceLabel?: string;
  photoLabel?: string;
  onIncomingMessage?: (notification: IncomingChatNotification) => void;
}

/**
 * Keeps the shipper joined to their socket room app-wide and surfaces
 * incoming chat messages (same socket path as the Laravel panel).
 */
export function useGlobalChatSocket({
  userId,
  voiceLabel = 'Voice note',
  photoLabel = 'Photo',
  onIncomingMessage,
}: UseGlobalChatSocketOptions): void {
  const onIncomingRef = useRef(onIncomingMessage);
  onIncomingRef.current = onIncomingMessage;

  useEffect(() => {
    if (!userId) return;

    socketService.setUserId(userId);

    const unsubscribe = socketService.onMessage((incoming: SocketMessagePayload) => {
      const shipperId = parsePartnerId(userId);
      if (!isIncomingChatToShipper(incoming, shipperId)) return;

      const notification = buildIncomingChatNotification(incoming, voiceLabel, photoLabel);
      if (!notification) return;

      if (shouldSuppressForActiveThread(notification.senderId, notification.senderType)) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent<IncomingChatNotification>(CHAT_MESSAGE_RECEIVED_EVENT, {
          detail: notification,
        })
      );

      onIncomingRef.current?.(notification);
    });

    return unsubscribe;
  }, [userId, voiceLabel, photoLabel]);
}
