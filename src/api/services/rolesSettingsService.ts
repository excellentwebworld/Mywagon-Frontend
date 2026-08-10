import { apiDelete, apiGet, apiPost, apiPut } from '../client';

export type PermissionCatalogItem = {
  name: string;
  label: string;
  legacy_id: number;
};

export type PermissionCatalogGroup = {
  key: string;
  label: string;
  permissions: PermissionCatalogItem[];
};

export type SettingsRole = {
  id: string;
  key: string;
  name: string;
  label: string;
  color: string;
  is_system: boolean;
  isSystem: boolean;
  description: string;
  permissions: string[] | null;
  permission_names: string[];
  user_count: number;
  userCount: number;
};

export type RolesPayload = {
  roles: SettingsRole[];
  groups: PermissionCatalogGroup[];
};

export type CreateRoleBody = {
  name: string;
  color?: string;
  description?: string;
  key?: string;
  permissions?: string[];
};

export type UpdateRoleBody = {
  name?: string;
  color?: string;
  description?: string;
  permissions?: string[];
};

export const rolesSettingsService = {
  async list(): Promise<RolesPayload> {
    const res = await apiGet<RolesPayload>('/settings/roles');
    return res.data;
  },

  async create(body: CreateRoleBody): Promise<RolesPayload> {
    const res = await apiPost<RolesPayload>('/settings/roles', body);
    return res.data;
  },

  async update(name: string, body: UpdateRoleBody | string[]): Promise<RolesPayload> {
    const payload = Array.isArray(body) ? { permissions: body } : body;
    const res = await apiPut<RolesPayload>(`/settings/roles/${name}`, payload);
    return res.data;
  },

  async destroy(name: string): Promise<RolesPayload> {
    const res = await apiDelete<RolesPayload>(`/settings/roles/${name}`);
    return res.data;
  },

  async permissionsCatalog(): Promise<{ groups: PermissionCatalogGroup[] }> {
    const res = await apiGet<{ groups: PermissionCatalogGroup[] }>('/settings/permissions');
    return res.data;
  },
};
