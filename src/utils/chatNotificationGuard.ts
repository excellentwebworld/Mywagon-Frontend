import { isMessageFromPartner, parseChatMetaFromFcmData } from './chatPartnerUtils';

export interface ActiveChatPartner {
  partnerId: number;
  partnerType: string;
}

let activeChatPartner: ActiveChatPartner | null = null;

export function setActiveChatPartner(partner: ActiveChatPartner | null): void {
  activeChatPartner = partner;
}

export function getActiveChatPartner(): ActiveChatPartner | null {
  return activeChatPartner;
}

/** True while the shipper is on the messages screen. */
export function isOnChatScreen(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  return path.startsWith('/messages') || path.startsWith('/chat');
}

export function shouldSuppressChatForegroundNotification(
  type: string,
  fcmData?: Record<string, string>
): boolean {
  const normalizedType = type.toLowerCase();
  if (normalizedType !== 'message') return false;

  // Already looking at chat — do not raise a message push on top of it.
  if (isOnChatScreen()) return true;

  if (!activeChatPartner) return false;

  const meta = parseChatMetaFromFcmData(fcmData);
  if (!meta) return false;

  return isMessageFromPartner(
    meta.senderId,
    meta.senderType,
    activeChatPartner.partnerId,
    activeChatPartner.partnerType
  );
}
