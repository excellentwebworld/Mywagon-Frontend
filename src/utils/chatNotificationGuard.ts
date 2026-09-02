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

export function shouldSuppressChatForegroundNotification(
  type: string,
  fcmData?: Record<string, string>
): boolean {
  if (!activeChatPartner) return false;

  const normalizedType = type.toLowerCase();
  if (normalizedType !== 'message') return false;

  const meta = parseChatMetaFromFcmData(fcmData);
  if (!meta) return false;

  return isMessageFromPartner(
    meta.senderId,
    meta.senderType,
    activeChatPartner.partnerId,
    activeChatPartner.partnerType
  );
}
