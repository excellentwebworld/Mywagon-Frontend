import { apiDownload, apiGet } from '../client';
import type { ApiListMeta } from '../types/addressBook';

export type PlatformAuditEntry = {
  id: string;
  ts: string;
  category: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
  target: string;
  details: string;
  actor: {
    name: string | null;
    email: string | null;
    role: string | null;
    ip?: string | null;
    device?: string | null;
    city?: string | null;
    country?: string | null;
  };
  changes: Array<{ field: string; from: string; to: string }> | null;
};

export type UserAuditEntry = {
  id: string;
  ts: string;
  actor: string;
  actorId: string | null;
  target: string;
  targetId: string | null;
  action: string;
  summary: string;
};

export type AuditListResult<T> = {
  items: T[];
  meta: ApiListMeta & { last_page: number };
};

function buildQuery(params: Record<string, string | number | boolean | undefined | string[]>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(`${key}[]`, v));
    } else {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function parseList<T>(path: string): Promise<AuditListResult<T>> {
  const res = await apiGet<T[]>(path);
  const meta = res.meta ?? { current_page: 1, per_page: 20, total: 0, last_page: 1 };
  return {
    items: Array.isArray(res.data) ? res.data : [],
    meta: {
      current_page: meta.current_page,
      per_page: meta.per_page,
      total: meta.total,
      last_page: meta.last_page ?? 1,
    },
  };
}

export const auditSettingsService = {
  async listPlatformAudit(params: {
    search?: string;
    category?: string[];
    severity?: string;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<AuditListResult<PlatformAuditEntry>> {
    const qs = buildQuery({
      search: params.search,
      category: params.category,
      severity: params.severity,
      from: params.from,
      to: params.to,
      page: params.page,
      per_page: params.per_page,
    });
    return parseList<PlatformAuditEntry>(`/settings/audit${qs}`);
  },

  async listUserAudit(params: {
    search?: string;
    action_type?: string[];
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<AuditListResult<UserAuditEntry>> {
    const qs = buildQuery({
      search: params.search,
      action_type: params.action_type,
      from: params.from,
      to: params.to,
      page: params.page,
      per_page: params.per_page,
    });
    return parseList<UserAuditEntry>(`/settings/users/audit${qs}`);
  },

  async exportPlatformAudit(params: {
    search?: string;
    category?: string[];
    severity?: string;
    from?: string;
    to?: string;
  } = {}): Promise<{ filename: string; truncated: boolean }> {
    return apiDownload('/settings/audit/export', 'audit-log.csv', {
      search: params.search,
      category: params.category,
      severity: params.severity !== 'all' ? params.severity : undefined,
      from: params.from,
      to: params.to,
    });
  },

  async exportUserAudit(params: {
    search?: string;
    action_type?: string[];
    from?: string;
    to?: string;
  } = {}): Promise<{ filename: string; truncated: boolean }> {
    return apiDownload('/settings/users/audit/export', 'user-audit-log.csv', {
      search: params.search,
      action_type: params.action_type,
      from: params.from,
      to: params.to,
    });
  },
};
