import { apiGet, apiPost, apiPut } from '../client';

export type SeatMeta = {
  used: number;
  total: number;
  remaining: number;
  can_invite: boolean;
  plan: string | null;
};

export type SettingsUser = {
  id: string;
  first_name: string;
  last_name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  job_title?: string | null;
  jobTitle?: string | null;
  role: 'admin' | 'dispatcher' | string;
  status: 'active' | 'deactivated' | 'invited' | 'suspended' | string;
  is_owner: boolean;
  isOwner: boolean;
  direct_permissions: string[] | null;
  directPermissions: string[] | null;
  permissions: string[] | null;
  has_custom_permissions: boolean;
  last_active: string | null;
  lastActive: string | null;
  created: string | null;
  created_at?: string | null;
  avatar_url?: string | null;
  permission_names?: string[];
};

export type UsersListPayload = {
  users: SettingsUser[];
  seats: SeatMeta;
};

export type InviteUserBody = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  country_code?: string | null;
  role: string;
  permissions?: string[];
};

export type UpdateUserBody = {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  job_title?: string | null;
  role?: string;
  permissions?: string[] | null;
  reset_to_role?: boolean;
};

export const usersSettingsService = {
  async list(): Promise<UsersListPayload> {
    const res = await apiGet<UsersListPayload>('/settings/users');
    return res.data;
  },

  async get(id: string | number): Promise<SettingsUser> {
    const res = await apiGet<SettingsUser>(`/settings/users/${id}`);
    return res.data;
  },

  async invite(body: InviteUserBody): Promise<SettingsUser> {
    const res = await apiPost<SettingsUser>('/settings/users/invite', body);
    return res.data;
  },

  async update(id: string | number, body: UpdateUserBody): Promise<SettingsUser> {
    const res = await apiPut<SettingsUser>(`/settings/users/${id}`, body);
    return res.data;
  },

  async deactivate(id: string | number): Promise<SettingsUser> {
    const res = await apiPost<SettingsUser>(`/settings/users/${id}/deactivate`);
    return res.data;
  },

  async reactivate(id: string | number): Promise<SettingsUser> {
    const res = await apiPost<SettingsUser>(`/settings/users/${id}/reactivate`);
    return res.data;
  },

  async resendInvite(id: string | number): Promise<SettingsUser> {
    const res = await apiPost<SettingsUser>(`/settings/users/${id}/resend-invite`);
    return res.data;
  },

  async forceSignOut(id: string | number): Promise<SettingsUser> {
    const res = await apiPost<SettingsUser>(`/settings/users/${id}/force-signout`);
    return res.data;
  },
};
