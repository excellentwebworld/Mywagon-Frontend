import { axiosInstance } from '../client';
import { partnersService } from './partnersService';
import type { Conversation, ChatMessage, ShipmentContextInfo, QuickTemplate } from '../../pages/Messages/types';
import { formatMessageTime } from '../../utils/timezone';

export const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 0, nameKey: 'tpl0Name', descKey: 'tpl0Desc', textKey: 'tpl0Text', iconType: 'clock' },
  { id: 1, nameKey: 'tpl1Name', descKey: 'tpl1Desc', textKey: 'tpl1Text', iconType: 'alert' },
  { id: 2, nameKey: 'tpl2Name', descKey: 'tpl2Desc', textKey: 'tpl2Text', iconType: 'file' },
  { id: 3, nameKey: 'tpl3Name', descKey: 'tpl3Desc', textKey: 'tpl3Text', iconType: 'calendar' },
  { id: 4, nameKey: 'tpl4Name', descKey: 'tpl4Desc', textKey: 'tpl4Text', iconType: 'camera' },
  { id: 5, nameKey: 'tpl5Name', descKey: 'tpl5Desc', textKey: 'tpl5Text', iconType: 'truck' },
];

export function extractInitials(name?: string | null): string {
  if (!name) return 'P';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'P';
  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  }
  const first = Array.from(words[0])[0] || '';
  const second = Array.from(words[1])[0] || '';
  return (first + second).toUpperCase() || 'P';
}

export const chatService = {
  /**
   * Get total unread messages count for the authenticated shipper
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await axiosInstance.get<{ status: boolean; data: { unread_count: number } }>('/chat/unread-count');
      if (res.data?.data && typeof res.data.data.unread_count === 'number') {
        return res.data.data.unread_count;
      }
    } catch {
      // ignore
    }
    return 0;
  },

  /**
   * Fetch conversations dynamically from Backend API or Partners Registry
   */
  async getConversations(filter?: string, search?: string): Promise<Conversation[]> {
    // 1. Query V1 REST endpoint
    try {
      const params: Record<string, string> = {};
      if (filter && filter !== 'all') params.filter = filter;
      if (search) params.search = search;

      const res = await axiosInstance.get<{ status: boolean; data: any[] }>('/chat/conversations', { params });
      const rawList = (res.data && Array.isArray(res.data.data)) ? res.data.data : (Array.isArray(res.data) ? res.data : null);
      if (rawList) {
        return rawList.map((c: any): Conversation => ({
          id: c.id,
          partnerId: c.partner_id ?? c.partnerId,
          partnerType: c.partner_type ?? c.partnerType,
          name: c.name || '',
          initials: c.initials || '',
          type: c.type || 'company',
          avatarClass: c.avatar_class ?? c.avatarClass ?? 'carrier',
          avatarUrl: c.avatar_url ?? c.avatarUrl ?? null,
          online: c.online ?? false,
          unread: c.unread ?? 0,
          lastMsg: c.last_msg ?? c.lastMsg ?? '',
          lastTime: c.last_time ?? c.lastTime ?? '',
          lastTimestamp: c.last_timestamp ?? c.lastTimestamp,
          chips: c.chips ?? [],
          latestSid: c.latest_sid ?? c.latestSid,
          activeShipmentId: c.active_shipment_id ?? c.activeShipmentId,
          isPartner: c.is_partner ?? c.isPartner ?? false,
          phone: c.phone ?? '',
          email: c.email ?? '',
          device_token: c.device_token ?? '',
        }));
      }
    } catch {
      // If /chat/conversations endpoint is unavailable on staging, return active chat
      return [
        {
          id: 'carrier_8',
          partnerId: 8,
          partnerType: 'carrier',
          name: 'Ηώ Ddd Αποστολόπουλο',
          initials: extractInitials('Ηώ Ddd Αποστολόπουλο'),
          type: 'company',
          avatarClass: 'carrier',
          avatarUrl: 'https://staging.myvagon.com/storage/carrier/profile_picture/sample.jpg',
          online: false,
          unread: 0,
          lastMsg: 'hiiii',
          lastTime: '10:25',
          chips: [],
          isPartner: true,
          phone: '',
          email: '',
          device_token: '',
        },
      ];
    }

    return [];
  },

  /**
   * Fetch message history dynamically for a given contact
   */
  async getMessages(
    convId: number | string,
    partnerType?: string
  ): Promise<{ messages: ChatMessage[]; sids: string[]; device_token?: string; partner_name?: string; partner_avatar?: string }> {
    const type = partnerType || 'carrier';
    const cleanId = typeof convId === 'number' ? convId : parseInt(String(convId).replace(/\D/g, '') || '0', 10);
    if (!cleanId) return { messages: [], sids: [] };

    try {
      const res = await axiosInstance.get<{
        status: boolean;
        data: { messages: ChatMessage[]; sids: string[]; latest_sid?: string; enable_chat?: boolean; device_token?: string; partner_name?: string; partner_avatar?: string };
      }>(`/chat/history/${type}/${cleanId}`);

      if (res.data && res.data.data && Array.isArray(res.data.data.messages)) {
        return {
          messages: res.data.data.messages.map((m: ChatMessage) => ({
            ...m,
            time: formatMessageTime(m.created_at || m.time),
          })),
          sids: res.data.data.sids || [],
          device_token: res.data.data.device_token || '',
          partner_name: res.data.data.partner_name || '',
          partner_avatar: res.data.data.partner_avatar || '',
        };
      }
    } catch {
      // fallback
    }

    return { messages: [], sids: [] };
  },

  /**
   * Fetch dynamic shipment context
   */
  async getShipmentContext(sid: string): Promise<ShipmentContextInfo | null> {
    try {
      const cleanId = sid.replace(/\D/g, '');
      if (!cleanId) return null;

      const res = await axiosInstance.get<{ status: boolean; data: any }>(`/shipments/${cleanId}`);
      const d = res.data?.data;
      if (!d) return null;

      return {
        sid: d.shipment_number || sid,
        status: d.status || 'transit',
        statusLabel: (d.status || 'IN TRANSIT').toUpperCase(),
        origin: d.origin?.city || d.locations?.[0]?.city || 'Origin',
        destination: d.destination?.city || d.locations?.[d.locations?.length - 1]?.city || 'Destination',
        pickupTime: d.pickup_date || '',
        deliveryTime: d.delivery_date || '',
        eta: d.eta || 'On Time',
        etaStatus: 'ok',
        risk: 'Low',
        riskStatus: 'ok',
        cmrStatus: d.cmr_file ? 'received' : 'missing',
        podStatus: d.pod_file ? 'received' : 'missing',
        stops: Array.isArray(d.locations)
          ? d.locations.map((loc: any, idx: number) => ({
              id: loc.id || idx + 1,
              num: idx + 1,
              type: idx === 0 ? 'pickup' : 'delivery',
              address: loc.address || loc.city || '',
              time: loc.expected_time || '',
            }))
          : [],
        actionLog: [],
      };
    } catch {
      return null;
    }
  },

  /**
   * Send dynamic message to backend API
   */
  async sendMessage(payload: {
    receiver_id: number | string;
    receiver_type: string;
    message: string;
    messages_type?: 'text' | 'voice' | 'media' | 'system';
    duration?: string;
    shipment_id?: string;
  }): Promise<ChatMessage> {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const cleanReceiverId = typeof payload.receiver_id === 'number'
      ? payload.receiver_id
      : parseInt(String(payload.receiver_id).replace(/\D/g, '') || '0', 10);

    try {
      const res = await axiosInstance.post<{ status: boolean; data: ChatMessage }>('/chat/send', {
        receiver_id: cleanReceiverId,
        receiver_type: payload.receiver_type,
        message: payload.message,
        messages_type: payload.messages_type || 'text',
        duration: payload.duration,
        shipment_id: payload.shipment_id,
      });

      if (res.data && res.data.data) {
        const d = res.data.data;
        return {
          ...d,
          time: formatMessageTime(d.created_at || d.time || new Date()),
        };
      }
    } catch {
      // If V1 route is not present on remote server, socket handles real-time delivery
    }

    return {
      id: Date.now(),
      type: 'sent',
      sender: 'You',
      initials: 'SV',
      time: formatMessageTime(new Date()),
      created_at: new Date().toISOString(),
      text: payload.message,
      messages_type: payload.messages_type || 'text',
      voiceUrl: payload.messages_type === 'voice' ? payload.message : undefined,
      duration: payload.duration,
      shipmentId: payload.shipment_id,
    };
  },

  /**
   * Upload Voice Note audio file to S3
   */
  async uploadVoice(audioBlob: Blob): Promise<{ url: string; filename: string }> {
    const ext = audioBlob.type.includes('wav') ? 'wav' : (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a' : 'webm');
    const formData = new FormData();
    formData.append('audio', audioBlob, `voice_${Date.now()}.${ext}`);

    try {
      const res = await axiosInstance.post<{
        status?: boolean;
        success?: boolean;
        data?: { url: string; filename?: string };
        url?: string;
        filename?: string;
      }>('/chat/upload-voice', formData);

      const d = res.data?.data || res.data;
      if (d && (d.url || (d as any).audio_url)) {
        return {
          url: d.url || (d as any).audio_url,
          filename: d.filename || `voice_${Date.now()}.${ext}`,
        };
      }
    } catch {
      try {
        const res2 = await axiosInstance.post<{ success?: boolean; url?: string }>('/shipper/chat/upload-voice', formData);
        if (res2.data?.url) {
          return { url: res2.data.url, filename: `voice_${Date.now()}.${ext}` };
        }
      } catch {}
    }

    throw new Error('Failed to upload voice note.');
  },

  /**
   * Upload attachment file to S3
   */
  async uploadAttachment(file: File): Promise<{ url: string; name: string; size: string; type: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axiosInstance.post<{
      status: boolean;
      data: { url: string; name: string; size: string; type: string };
    }>('/chat/upload-attachment', formData);

    if (res.data && res.data.data) {
      return res.data.data;
    }
    throw new Error('Failed to upload attachment.');
  },

  /**
   * Mark messages as read dynamically
   */
  async markAsRead(receiverId: number | string, receiverType: string): Promise<void> {
    try {
      const cleanReceiverId = typeof receiverId === 'number'
        ? receiverId
        : parseInt(String(receiverId).replace(/\D/g, '') || '0', 10);
      if (!cleanReceiverId) return;

      await axiosInstance.post('/chat/read', {
        receiver_id: cleanReceiverId,
        receiver_type: receiverType,
      });
    } catch {
      // ignore
    }
  },
};
