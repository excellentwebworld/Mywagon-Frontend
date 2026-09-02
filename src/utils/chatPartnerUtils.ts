export function parsePartnerId(value: unknown): number {
  return parseInt(String(value || '0').replace(/\D/g, ''), 10);
}

export function resolveActivePartnerType(conv: { partnerType?: string; type?: string } | null): string {
  if (!conv) return 'carrier';
  return (conv.partnerType || (conv.type === 'company' ? 'carrier' : conv.type) || 'carrier').toLowerCase();
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
    (incoming === 'company' && active === 'carrier')
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
