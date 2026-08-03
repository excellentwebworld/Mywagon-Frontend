import { apiGet, apiPut, ApiError, AUTH_TOKEN_KEY } from '../client';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export type OrgFieldMeta = {
  key: string;
  category: string;
  type: 'single' | 'multi';
  input_type?: string | null;
  label: string;
  required: boolean;
  options: Array<{ value: string; label: string }>;
};

export type OrganizationSettingsPayload = {
  account_type: string;
  legal: {
    legal_name: string | null;
    trade_name: string | null;
    vat_number: string | null;
    registration_number: string | null;
    billing_address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    invoice_emails: string[];
    kyc_status: string | null;
    kyc_locked: boolean;
    kyc_locked_fields: string[];
  };
  operations: Record<string, unknown>;
  operations_meta: { fields: OrgFieldMeta[] };
  branding: {
    logo_url: string | null;
    public_profile: boolean;
    company_description: string | null;
  };
  completion: {
    operations_percentage: number;
    is_mandatory_completed: boolean;
    is_extended_completed: boolean;
    answered_questions: number;
    total_questions: number;
    mandatory_answered: number;
    mandatory_total: number;
  };
};

export type OrganizationUpdateBody = {
  legal?: Partial<{
    legal_name: string | null;
    trade_name: string | null;
    vat_number: string | null;
    registration_number: string | null;
    billing_address: string | null;
    city: string | null;
    postal_code: string | null;
    invoice_emails: string[];
  }>;
  operations?: Record<string, unknown>;
  branding?: Partial<{
    public_profile: boolean;
    company_description: string | null;
  }>;
};

export const organizationSettingsService = {
  async get(): Promise<OrganizationSettingsPayload> {
    const res = await apiGet<OrganizationSettingsPayload>('/settings/organization');
    return res.data;
  },

  async update(body: OrganizationUpdateBody): Promise<OrganizationSettingsPayload> {
    const res = await apiPut<OrganizationSettingsPayload>('/settings/organization', body);
    return res.data;
  },

  async uploadLogo(file: File): Promise<OrganizationSettingsPayload['branding']> {
    const formData = new FormData();
    formData.append('logo', file);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/settings/organization/logo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new ApiError(json.message ?? 'Logo upload failed', response.status, json.data);
    }
    return (json.data?.branding ?? json.data) as OrganizationSettingsPayload['branding'];
  },
};
