import { apiGet, apiPut } from '../client';

export interface NotificationToggle {
  label: string;
  slug: string;
  value: boolean;
}

export interface NotificationSettingsPayload {
  push: NotificationToggle[];
  email: NotificationToggle[];
}

export type NotificationSettingsUpdateBody = {
  push?: Record<string, boolean>;
  email?: Record<string, boolean>;
};

export const notificationSettingsService = {
  async get(): Promise<NotificationSettingsPayload> {
    const res = await apiGet<NotificationSettingsPayload>('/settings/notifications');
    return res.data;
  },

  async update(body: NotificationSettingsUpdateBody): Promise<NotificationSettingsPayload> {
    const res = await apiPut<NotificationSettingsPayload>('/settings/notifications', body);
    return res.data;
  },
};
