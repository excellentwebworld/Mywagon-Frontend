export function parsePartnerId(value: unknown): number {
  return parseInt(String(value || '0').replace(/\D/g, ''), 10);
}

/** Laravel ChatController strips non-digits before storing shipment_id. */
export function extractShipmentDbId(sid?: string | null): string | undefined {
  if (!sid) return undefined;
  const numeric = String(sid).replace(/\D/g, '');
  return numeric || undefined;
}

/** Socket room type — must be carrier, driver, or admin (never freelancer/company). */
export function normalizeSocketUserType(userType?: string | null): 'carrier' | 'driver' | 'admin' {
  const t = (userType || 'carrier').toLowerCase();
  if (t === 'admin') return 'admin';
  if (t === 'driver' || t === 'freelancer' || t === 'company_driver') return 'driver';
  return 'carrier';
}

export function resolveSocketReceiverType(conv: { partnerType?: string; type?: string } | null): 'carrier' | 'driver' | 'admin' {
  if (!conv) return 'carrier';
  if (conv.partnerType) {
    return normalizeSocketUserType(conv.partnerType);
  }
  if (conv.type === 'company') return 'carrier';
  if (conv.type === 'freelancer' || conv.type === 'driver') return 'driver';
  return 'carrier';
}

export function resolveActivePartnerType(conv: { partnerType?: string; type?: string } | null): string {
  return resolveSocketReceiverType(conv);
}

/** Laravel shipper panel socket `request_data` shape (chat_history.js). */
export interface LaravelChatRequestData {
  sender_id: string | number;
  sender_name: string;
  sender_type: string;
  sender_img: string;
  receiverable_token: string;
  senderable_token: string;
  type: 'message';
}

export function buildLaravelChatRequestData(params: {
  senderId: string | number;
  senderName: string;
  senderType: string;
  senderImg: string;
  receiverableToken?: string;
  senderableToken?: string;
}): LaravelChatRequestData {
  return {
    sender_id: params.senderId,
    sender_name: params.senderName,
    sender_type: params.senderType,
    sender_img: params.senderImg,
    receiverable_token: params.receiverableToken || '',
    senderable_token: params.senderableToken || '',
    type: 'message',
  };
}

/** Shipper FCM token stored by useFcm — sent as senderable_token like Laravel blade chat. */
export function getShipperDeviceToken(): string {
  try {
    return sessionStorage.getItem('mv_fcm_token') || '';
  } catch {
    return '';
  }
}

export function isIncomingChatToShipper(
  incoming: { receiver_id?: number | string; receiver_type?: string; sender_type?: string },
  shipperId: number
): boolean {
  if (shipperId <= 0) return false;

  const receiverId = parsePartnerId(incoming.receiver_id);
  const receiverType = (incoming.receiver_type || '').toLowerCase();
  const senderType = (incoming.sender_type || '').toLowerCase();

  if (receiverType !== 'shipper' || receiverId !== shipperId) return false;
  if (senderType === 'shipper') return false;

  return true;
}

export function getChatMessagePreview(
  message: string,
  messagesType?: string | null,
  voiceLabel = 'Voice note'
): string {
  const isVoice =
    messagesType === 'voice' ||
    (message && (message.includes('chat-voices') || /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(message)));

  if (isVoice) return `🎙️ ${voiceLabel}`;
  if (messagesType === 'media' || /^https?:\/\//i.test(message || '')) return `📎 ${message?.split('/').pop() || 'Attachment'}`;
  return message || '';
}

export function isMessageFromPartner(
  senderId: number,
  senderType: string,
  partnerId: number,
  partnerType: string
): boolean {
  if (partnerId <= 0 || senderId <= 0 || senderId !== partnerId) {
    return false;
  }

  const incoming = senderType.toLowerCase();
  const active = partnerType.toLowerCase();

  return (
    incoming === active ||
    (incoming === 'carrier' && active === 'company') ||
    (incoming === 'company' && active === 'carrier') ||
    (incoming === 'driver' && active === 'freelancer') ||
    (incoming === 'freelancer' && active === 'driver')
  );
}

export interface ChatFcmMeta {
  senderId: number;
  senderType: string;
}

export function parseChatMetaFromFcmData(data: Record<string, string> | undefined): ChatFcmMeta | null {
  if (!data) return null;

  let meta: Record<string, unknown> = {};
  try {
    if (data.data) {
      meta = JSON.parse(data.data) as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  const senderId = parsePartnerId(meta.sender_id ?? meta.carrier_id);
  const senderType = String(meta.sender_type || meta.chat_type || 'carrier').toLowerCase();

  if (senderId <= 0) return null;

  return { senderId, senderType };
}
