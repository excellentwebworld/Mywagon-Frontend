import { apiGet, apiPost } from '../client';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Categories produced by the backend NotificationsController. */
export type NotificationCategory =
  | 'New Availability'
  | 'Booking Bidding'
  | 'Shipment Progress'
  | 'Cancellation'
  | 'Docs'
  | 'Orders'
  | 'Billing'
  | 'Partners'
  | 'System'
  | 'Shipment'
  | 'Bids'
  | 'Execution';


/** Severity level produced by the backend. */
export type NotificationSeverity = 'Critical' | 'Warning' | 'Info';

/** Action types the React UI can handle. */
export type NotificationAction =
  | 'viewLoad'
  | 'manageShipments'
  | 'viewBids'
  | 'viewInvoice'
  | 'viewDocs'
  | 'viewOrder'
  | 'searchTrucks'
  | 'viewPartners'
  | 'viewSubscription'
  | 'openSupport'
  | 'viewProfile'
  | 'viewUsers'
  | 'viewAddressBook'
  | 'viewProducts'
  | 'viewTutorials'
  | 'viewDashboard'
  | 'createShipment'
  | 'viewNotifications'
  | 'viewPrivacy'
  | 'viewTerms'
  | 'viewOrganization'
  | 'openLink'
  | 'viewDetails'
  | null;






/** Shape of a single notification as returned by the API. */
export interface ApiNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  chips: string[];
  action_type: NotificationAction;
  action_id: string;
  external_url?: string | null;
  redirect_slug?: string | null;
  read: boolean;
  archived: boolean;
  created_at: string;
  relative_time: string;
}


/** Pagination meta returned alongside the notification list. */
export interface NotificationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  unread_count: number;
  inbox_count?: number;
  all_count?: number;
  archived_count?: number;
  system_count?: number;
}


/** Tabs available in the Notifications Center. */
export type NotificationTab = 'inbox' | 'all' | 'archived' | 'system';

export interface NotificationListParams {
  tab?: NotificationTab;
  category?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

// ─── Service ───────────────────────────────────────────────────────────────

export const notificationService = {
  /**
   * Fetch paginated notifications.
   * Returns `{ data: ApiNotification[], meta: NotificationMeta }`.
   */
  async list(params: NotificationListParams = {}): Promise<{
    data: ApiNotification[];
    meta: NotificationMeta;
  }> {
    const query: Record<string, string | number> = {};
    if (params.tab)       query['tab']      = params.tab;
    if (params.category && params.category !== 'All') query['category'] = params.category;
    if (params.search)    query['search']   = params.search;
    if (params.page)      query['page']     = params.page;
    if (params.per_page)  query['per_page'] = params.per_page;

    const res = await apiGet<ApiNotification[]>('/notifications', query);

    return {
      data: res.data ?? [],
      meta: (res as unknown as { meta: NotificationMeta }).meta ?? {
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 20,
        unread_count: 0,
      },
    };
  },

  /** Get the current unread notification count for the header badge. */
  async unreadCount(): Promise<number> {
    const res = await apiGet<{ count: number }>('/notifications/unread-count');
    return res.data?.count ?? 0;
  },

  /** Mark all unread notifications as read. */
  async markAllRead(): Promise<void> {
    await apiPost('/notifications/mark-all-read');
  },

  /** Mark a single notification as read by UUID. */
  async markRead(id: string): Promise<ApiNotification> {
    const res = await apiPost<ApiNotification>(`/notifications/${id}/read`);
    return res.data!;
  },

  /**
   * Toggle archive state for a notification.
   * First call: archives. Second call: unarchives.
   */
  async archive(id: string): Promise<ApiNotification> {
    const res = await apiPost<ApiNotification>(`/notifications/${id}/archive`);
    return res.data!;
  },

  /**
   * Idempotently register (or clear) the FCM device token.
   * Called by the `useFcm` hook after permission is granted and a token is resolved.
   *
   * @param token - FCM registration token, or null to clear it.
   */
  async updateDeviceToken(token: string | null): Promise<void> {
    await apiPost('/auth/device-token', { device_token: token });
  },
};
