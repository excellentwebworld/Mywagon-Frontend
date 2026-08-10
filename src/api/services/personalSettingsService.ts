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

export type PersonalRatingItem = {
  id: number;
  rating: number | null;
  review: string | null;
  created_at: string | null;
  rater_type: string | null;
  rater_name: string | null;
  rater_avatar_url: string | null;
};

export type PersonalModuleAccessGroup = {
  group: string;
  permissions: string[];
};

export type PersonalRoleAccess = {
  role_key: string;
  role_name: string;
  role_color: string;
  assigned_by: string;
  since: string | null;
  module_access: PersonalModuleAccessGroup[];
  has_custom_permissions: boolean;
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
  performance?: {
    cancellation_rate_pct: number | null;
    avg_loading_wait_minutes: number | null;
    rating_average?: number | null;
    rating_count?: number;
  };
  activity?: PersonalActivityItem[];
  role_access?: PersonalRoleAccess;
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

  async getRatings(page = 1, perPage = 15): Promise<{
    items: PersonalRatingItem[];
    meta: { current_page: number; per_page: number; total: number; last_page: number };
  }> {
    const res = await apiGet<PersonalRatingItem[]>('/settings/personal/ratings', {
      page,
      per_page: perPage,
    });
    const meta = res.meta ?? {
      current_page: page,
      per_page: perPage,
      total: Array.isArray(res.data) ? res.data.length : 0,
      last_page: page,
    };
    return {
      items: Array.isArray(res.data) ? res.data : [],
      meta: {
        current_page: meta.current_page,
        per_page: meta.per_page,
        total: meta.total,
        last_page: meta.last_page ?? Math.max(1, Math.ceil(meta.total / meta.per_page)),
      },
    };
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
