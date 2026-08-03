import { apiGet, apiPut } from '../client';

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

export const rolesSettingsService = {
  async list(): Promise<RolesPayload> {
    const res = await apiGet<RolesPayload>('/settings/roles');
    return res.data;
  },

  async update(name: string, permissions: string[]): Promise<RolesPayload> {
    const res = await apiPut<RolesPayload>(`/settings/roles/${name}`, { permissions });
    return res.data;
  },

  async permissionsCatalog(): Promise<{ groups: PermissionCatalogGroup[] }> {
    const res = await apiGet<{ groups: PermissionCatalogGroup[] }>('/settings/permissions');
    return res.data;
  },
};
