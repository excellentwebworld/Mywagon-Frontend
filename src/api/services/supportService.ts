import { apiGet, apiPost } from '../client';
import type {
  SupportAccess,
  KbCategory,
  KbArticleSummary,
  KbArticleDetail,
  SupportFormOptions,
  CreateSupportRequestPayload,
  CreateSupportRequestResult,
  SupportRequestSummary,
  SupportRequestDetail,
  SupportRequestsMeta,
  SupportMeetingOptions,
  SupportMeetingPrefill,
  SupportCallType,
  SupportRequestThreadMessage,
} from '../../pages/Support/types';

interface SupportAccessApiData {
  allowed: boolean;
  upgrade_url?: string;
}

interface SupportFormOptionsApiData {
  app_reference: string;
  types: Array<{ id: number; name_en: string; name_el: string }>;
  categories: Array<{ id: number; name_en: string; name_el: string }>;
}

interface CreateSupportRequestApiData {
  ticket_number: string;
  id: number;
}

interface SupportRequestSummaryApi {
  ticket_number: string;
  type: string;
  title: string;
  status: SupportRequestSummary['status'];
  status_label: string;
  created_at: string;
  updated_at: string;
}

interface SupportRequestDetailApi extends SupportRequestSummaryApi {
  category: string;
  description: string;
  attachments: Array<{ url: string }>;
  thread?: SupportRequestThreadMessage[];
  can_reply?: boolean;
}

interface SupportRequestReplyApi {
  id: number;
  author_type: SupportRequestThreadMessage['author_type'];
  author_label: string;
  body: string;
  created_at: string;
}

interface SupportRequestsMetaApi {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface SupportMeetingOptionsApiData {
  call_types: Array<{ id: SupportCallType; meeting_url: string }>;
  prefill: SupportMeetingPrefill;
}

function buildLangQuery(lang: string, extra: Record<string, string | boolean | undefined> = {}): string {
  const params = new URLSearchParams({ lang });
  Object.entries(extra).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
  });
  return params.toString();
}

function mapFormOptions(data: SupportFormOptionsApiData): SupportFormOptions {
  return {
    appReference: data.app_reference,
    types: data.types ?? [],
    categories: data.categories ?? [],
  };
}

export const supportService = {
  async getAccess(): Promise<SupportAccess> {
    const res = await apiGet<SupportAccessApiData>('/support/access');
    const data = res.data;
    return {
      allowed: Boolean(data?.allowed),
      upgradeUrl: data?.upgrade_url || '/subscription',
    };
  },

  async getKbCategories(lang: string): Promise<KbCategory[]> {
    const res = await apiGet<KbCategory[]>(`/support/kb/categories?${buildLangQuery(lang)}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getKbArticles(options: {
    lang: string;
    category?: string;
    q?: string;
    popular?: boolean;
  }): Promise<KbArticleSummary[]> {
    const qs = buildLangQuery(options.lang, {
      category: options.category,
      q: options.q,
      popular: options.popular,
    });
    const res = await apiGet<KbArticleSummary[]>(`/support/kb/articles?${qs}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getKbArticle(id: string, lang: string): Promise<KbArticleDetail | null> {
    const res = await apiGet<KbArticleDetail>(`/support/kb/articles/${encodeURIComponent(id)}?${buildLangQuery(lang)}`);
    return res.data ?? null;
  },

  async getFormOptions(): Promise<SupportFormOptions> {
    const res = await apiGet<SupportFormOptionsApiData>('/support/form-options');
    return mapFormOptions(res.data ?? { app_reference: '', types: [], categories: [] });
  },

  async createRequest(payload: CreateSupportRequestPayload): Promise<CreateSupportRequestResult> {
    const res = await apiPost<CreateSupportRequestApiData>('/support/requests', payload);
    const data = res.data;
    return {
      ticketNumber: data?.ticket_number ?? '',
      id: data?.id ?? 0,
    };
  },

  async getRequests(options: {
    lang: string;
    page?: number;
    perPage?: number;
  }): Promise<{ requests: SupportRequestSummary[]; meta: SupportRequestsMeta }> {
    const params = new URLSearchParams({ lang: options.lang });
    if (options.page) params.set('page', String(options.page));
    if (options.perPage) params.set('per_page', String(options.perPage));

    const res = await apiGet<SupportRequestSummaryApi[]>(`/support/requests?${params.toString()}`);
    const meta = (res.meta ?? {}) as SupportRequestsMetaApi;

    return {
      requests: Array.isArray(res.data) ? res.data : [],
      meta: {
        currentPage: meta.current_page ?? 1,
        perPage: meta.per_page ?? 15,
        total: meta.total ?? 0,
        lastPage: meta.last_page ?? 1,
      },
    };
  },

  async getRequest(ticketNumber: string, lang: string): Promise<SupportRequestDetail | null> {
    const res = await apiGet<SupportRequestDetailApi>(
      `/support/requests/${encodeURIComponent(ticketNumber)}?${buildLangQuery(lang)}`
    );
    const data = res.data;
    if (!data) return null;

    return {
      ...data,
      thread: Array.isArray(data.thread) ? data.thread : [],
      can_reply: Boolean(data.can_reply),
    };
  },

  async postRequestReply(ticketNumber: string, lang: string, body: string): Promise<SupportRequestThreadMessage> {
    const res = await apiPost<SupportRequestReplyApi>(
      `/support/requests/${encodeURIComponent(ticketNumber)}/replies?${buildLangQuery(lang)}`,
      { body }
    );
    const data = res.data;
    return {
      id: data?.id ?? 0,
      author_type: data?.author_type ?? 'shipper',
      author_label: data?.author_label ?? '',
      body: data?.body ?? body,
      created_at: data?.created_at ?? new Date().toISOString(),
    };
  },

  async getMeetingOptions(): Promise<SupportMeetingOptions> {
    const res = await apiGet<SupportMeetingOptionsApiData>('/support/meeting-options');
    const data = res.data ?? { call_types: [], prefill: { email: '', first_name: '', last_name: '' } };

    return {
      callTypes: Array.isArray(data.call_types) ? data.call_types : [],
      prefill: {
        email: data.prefill?.email ?? '',
        first_name: data.prefill?.first_name ?? '',
        last_name: data.prefill?.last_name ?? '',
      },
    };
  },
};
