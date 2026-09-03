export function parsePartnerId(value: unknown): number {
  return parseInt(String(value || '0').replace(/\D/g, ''), 10);
}

/** Digits from a shipment id string. Do not use this to turn auto_id (SID-90828) into a primary key. */
export function extractShipmentDbId(sid?: string | null): string | undefined {
  if (!sid) return undefined;
  const numeric = String(sid).replace(/\D/g, '');
  return numeric || undefined;
}

/** True when the value is a shipments.auto_id (SID-xxxxx), not a numeric primary key. */
export function isShipmentAutoId(value?: string | null): boolean {
  return /^SID-/i.test(String(value || '').trim());
}

/**
 * Display shipments.auto_id everywhere in chat.
 * Bare numbers are primary keys and must not be shown as SID-{id}.
 */
export function formatShipmentAutoId(value?: string | null): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (isShipmentAutoId(trimmed)) {
    return `SID-${trimmed.replace(/^SID-/i, '')}`;
  }
  if (/^\d+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Query params from shipment detail: `sid` is shipments.id, `autoId` is shipments.auto_id.
 * A SID- prefixed `sid` is treated as auto_id, never as a primary key.
 */
export function resolveNavigatedShipmentIds(
  targetSid?: string | null,
  targetAutoId?: string | null
): { primaryId: string | null; autoId: string | null } {
  const sid = String(targetSid || '').trim();
  const autoFromParam = formatShipmentAutoId(targetAutoId);
  const autoFromSid = isShipmentAutoId(sid) ? formatShipmentAutoId(sid) : null;

  return {
    primaryId: /^\d+$/.test(sid) ? sid : null,
    autoId: autoFromParam || autoFromSid,
  };
}

/**
 * Filter-by options for the open chat.
 * From load detail (sid/autoId in the URL) only that load's auto_id is listed —
 * other SIDs in the same thread belong to different loads.
 */
export function buildChatFilterSids(options: {
  loadScopedAutoId?: string | null;
  messageSids?: Array<string | number | null | undefined>;
  currentFilter?: string | null;
}): string[] {
  const seen = new Set<string>();
  const sids: string[] = [];
  const push = (raw?: string | number | null) => {
    if (raw == null || raw === '' || raw === 'all') return;
    const display = formatShipmentAutoId(String(raw));
    if (!display) return;
    const key = display.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    sids.push(display);
  };

  if (options.loadScopedAutoId) {
    push(options.loadScopedAutoId);
    return sids;
  }

  for (const sid of options.messageSids || []) {
    push(sid);
  }
  if (options.currentFilter && options.currentFilter !== 'all') {
    push(options.currentFilter);
  }
  return sids;
}

/** Normalize partner types for comparisons (socket, API, UI labels). */
export function normalizePartnerType(userType?: string | null): 'carrier' | 'driver' | 'admin' | string {
  const t = (userType || 'carrier').toLowerCase();
  if (t === 'admin') return 'admin';
  if (t === 'driver' || t === 'freelancer' || t === 'company_driver') return 'driver';
  if (t === 'carrier' || t === 'company') return 'carrier';
  return t;
}

/** Socket room type — must be carrier, driver, or admin (never freelancer/company). */
export function normalizeSocketUserType(userType?: string | null): 'carrier' | 'driver' | 'admin' {
  return normalizePartnerType(userType) as 'carrier' | 'driver' | 'admin';
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
  voiceLabel = 'Voice note',
  photoLabel = 'Photo'
): string {
  const isVoice =
    messagesType === 'voice' ||
    (message && (message.includes('chat-voices') || /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(message)));

  if (isVoice) return `🎙️ ${voiceLabel}`;

  const isImage =
    messagesType === 'image' ||
    (messagesType === 'media' && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(message || '')) ||
    /\.(jpe?g|png|gif|webp)(\?|$)/i.test(message || '');

  if (isImage) return `📷 ${photoLabel}`;
  if (messagesType === 'media' || /^https?:\/\//i.test(message || '')) {
    return `📎 ${message?.split('/').pop() || 'Attachment'}`;
  }
  return message || '';
}

export function isChatImageUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('blob:')) return true;
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export function isChatImageMessage(
  messagesType?: string | null,
  text?: string | null,
  imageUrl?: string | null
): boolean {
  if (messagesType === 'image') return true;
  if (imageUrl && isChatImageUrl(imageUrl)) return true;
  if (messagesType === 'media' && isChatImageUrl(text)) return true;
  if (isChatImageUrl(text) && /^https?:\/\//i.test(text || '')) return true;
  return false;
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

  return normalizePartnerType(senderType) === normalizePartnerType(partnerType);
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
