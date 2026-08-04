import { apiGet } from '../client';

export type PolicyItem = {
  id: string;
  path: string;
  title_key: 'privacy' | 'tos' | string;
  title: string;
  html: string | null;
  updated_at: string | null;
  available: boolean;
};

export type PoliciesSettingsPayload = {
  language: string;
  policies: PolicyItem[];
};

export const policiesSettingsService = {
  async list(lang?: string): Promise<PoliciesSettingsPayload> {
    const res = await apiGet<PoliciesSettingsPayload>(
      '/settings/policies',
      lang ? { lang } : undefined,
    );
    return res.data;
  },

  async get(key: string, lang?: string): Promise<PolicyItem & { language?: string }> {
    const res = await apiGet<PolicyItem & { language?: string }>(
      `/settings/policies/${key}`,
      lang ? { lang } : undefined,
    );
    return res.data;
  },
};
