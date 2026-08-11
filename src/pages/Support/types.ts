export type SupportSectionId = 'kb' | 'requests' | 'call';

export type SupportRequestTab = 'create' | 'myRequests';

export type SupportCallType = 'onboarding' | 'technical' | 'billing' | 'feedback';

export interface SupportAccess {
  allowed: boolean;
  upgradeUrl: string;
}

export type SupportSectionOpenState = Record<SupportSectionId, boolean>;

export interface KbCategory {
  id: string;
  name: string;
  icon: string;
  icon_bg: string;
  article_count: number;
}

export interface KbArticleSummary {
  id: string;
  title: string;
  tags: string[];
  category_id: string;
}

export interface KbArticleDetail extends KbArticleSummary {
  body_html: string;
}

export interface SupportFormOption {
  id: number;
  name_en: string;
  name_el: string;
}

export interface SupportFormOptions {
  appReference: string;
  types: SupportFormOption[];
  categories: SupportFormOption[];
}

export interface CreateSupportRequestPayload {
  type: string;
  category: string;
  title: string;
  description: string;
  attachments?: string[];
}

export interface CreateSupportRequestResult {
  ticketNumber: string;
  id: number;
}

export interface RequestAttachmentPreview {
  id: string;
  file: File;
  previewUrl: string;
}

export type SupportRequestStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_approval'
  | 'done';

export interface SupportRequestSummary {
  ticket_number: string;
  type: string;
  title: string;
  status: SupportRequestStatus;
  status_label: string;
  created_at: string;
  updated_at: string;
}

export interface SupportRequestAttachment {
  url: string;
}

export interface SupportRequestThreadMessage {
  id: number | 'initial';
  author_type: 'shipper' | 'admin';
  author_label: string;
  body: string;
  created_at: string;
}

export interface SupportRequestDetail extends SupportRequestSummary {
  category: string;
  description: string;
  attachments: SupportRequestAttachment[];
  thread: SupportRequestThreadMessage[];
  can_reply: boolean;
}

export interface SupportRequestsMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface SupportMeetingCallType {
  id: SupportCallType;
  meeting_url: string;
}

export interface SupportMeetingPrefill {
  email: string;
  first_name: string;
  last_name: string;
}

export interface SupportMeetingOptions {
  callTypes: SupportMeetingCallType[];
  prefill: SupportMeetingPrefill;
}
