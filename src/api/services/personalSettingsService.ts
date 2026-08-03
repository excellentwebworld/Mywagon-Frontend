import { apiGet, apiPut, ApiError, AUTH_TOKEN_KEY } from '../client';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export type PersonalMainUseOption = {
  value: string;
  label: string;
};

export type PersonalActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  at: string;
};

export type PersonalSettingsPayload = {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    phone_locked: boolean;
    main_use: string | null;
    main_use_locked: boolean;
    avatar_url: string | null;
  };
  account: {
    member_since: string | null;
    last_active_at: string | null;
  };
  activity?: PersonalActivityItem[];
  main_use_options: PersonalMainUseOption[];
};

export type PersonalUpdateBody = {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  main_use?: string | null;
};

export const personalSettingsService = {
  async get(): Promise<PersonalSettingsPayload> {
    const res = await apiGet<PersonalSettingsPayload>('/settings/personal');
    return res.data;
  },

  async update(body: PersonalUpdateBody): Promise<PersonalSettingsPayload> {
    const res = await apiPut<PersonalSettingsPayload>('/settings/personal', body);
    return res.data;
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string | null; profile: PersonalSettingsPayload['profile'] }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/settings/personal/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new ApiError(json.message ?? 'Avatar upload failed', response.status, json.data);
    }
    return json.data as { avatar_url: string | null; profile: PersonalSettingsPayload['profile'] };
  },
};
