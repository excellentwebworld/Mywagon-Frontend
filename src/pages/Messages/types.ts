export type PartnerRole = 'company' | 'freelancer' | 'driver' | 'admin';

export type MessageFilterType = 'all' | 'unread' | 'carrier' | 'freelancer' | 'partner';

export interface ChatAttachment {
  name: string;
  size: string;
  url?: string;
  type?: string;
}

export interface ChatMessage {
  id?: string | number;
  type: 'sent' | 'received' | 'system' | 'date';
  sender?: string;
  initials?: string;
  time?: string;
  text?: string;
  key?: string;
  variant?: 'warning' | 'success' | 'info' | '';
  customText?: string;
  textEN?: string;
  textEL?: string;
  status?: 'delivered' | 'read' | 'sending' | 'failed';
  attachments?: ChatAttachment[];
  shipmentId?: string;
  shipment_id?: string | number;
  messages_type?: 'text' | 'voice' | 'media' | 'image' | 'document' | 'system';
  voiceUrl?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  duration?: string;
  created_at?: string | Date;
  isFailed?: boolean;
}

export type ChatContextMode = 'direct' | 'shipment';

export interface ChatContext {
  mode: ChatContextMode;
  shipmentId: string | null;
  shipmentDbId: string | null;
  shipmentLabel: string | null;
}

export interface Conversation {
  id: number | string;
  partnerId?: number;
  partnerType?: 'carrier' | 'driver' | 'admin';
  name: string;
  initials: string;
  type: PartnerRole;
  avatarClass: 'carrier' | 'freelancer' | 'driver';
  avatarUrl?: string | null;
  online: boolean;
  lastSeen?: 'timeToday' | 'timeYesterday' | 'timeDaysAgo' | 'timeWeekAgo' | 'timeWeeksAgo' | '';
  lastSeenDetail?: string;
  unread: number;
  lastMsg: string;
  lastTime: string;
  lastTimestamp?: number;
  chips: string[];
  latestSid?: string;
  /** shipments.id for the latest linked load (storage / API lookup). */
  latestShipmentDbId?: string | number | null;
  isPartner?: boolean;
  hasAction?: boolean;
  phone?: string;
  email?: string;
  role?: string;
  rating?: string;
  tripsCount?: number;
  activeShipmentId?: string;
  /** FCM device token of the partner for Firebase push notifications */
  device_token?: string;
}

export interface ShipmentStopItem {
  id: number;
  num: number;
  type: 'pickup' | 'delivery';
  address: string;
  time: string;
}

export interface ActionLogEntry {
  id: string | number;
  type: 'req' | 'upd' | 'inc' | 'done';
  textKey: string;
  defaultText: string;
  time: string;
}

export interface ShipmentContextInfo {
  sid: string;
  primaryId?: number | string | null;
  autoId?: string | null;
  status: 'transit' | 'delivered' | 'pending' | 'issue';
  statusLabel: string;
  origin: string;
  destination: string;
  pickupTime: string;
  deliveryTime: string;
  eta: string;
  etaStatus: 'ok' | 'risk';
  risk: string;
  riskStatus: 'ok' | 'risk';
  cmrStatus: 'received' | 'missing';
  podStatus: 'received' | 'missing';
  stops: ShipmentStopItem[];
  actionLog: ActionLogEntry[];
}

export interface QuickTemplate {
  id: number;
  nameKey: string;
  descKey: string;
  textKey: string;
  iconType: 'clock' | 'alert' | 'file' | 'calendar' | 'camera' | 'truck';
}
