import { apiGet, ApiError, AUTH_TOKEN_KEY } from '../client';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export type KycStatus = 'not_started' | 'pending' | 'accepted' | 'rejected' | string;

export type KycSettingsPayload = {
  vat_number: string | null;
  kyc_status: KycStatus;
  kyc_current_rejected_reason: string | null;
  kyc_update_date_time: string | null;
  certificate: {
    url: string | null;
    file_name: string | null;
  };
  can_edit: boolean;
  needs_attention: boolean;
};

export const kycSettingsService = {
  async get(): Promise<KycSettingsPayload> {
    const res = await apiGet<KycSettingsPayload>('/settings/kyc');
    return res.data;
  },

  async submit(vatNumber: string, certificate?: File | null): Promise<KycSettingsPayload> {
    const formData = new FormData();
    formData.append('vat_number', vatNumber);
    if (certificate) {
      formData.append('kyc_certificate', certificate);
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const response = await fetch(`${API_BASE}/settings/kyc`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json();
    if (!response.ok || json.success === false) {
      throw new ApiError(json.message ?? 'KYC submit failed', response.status, json.errors, json.data);
    }
    return json.data as KycSettingsPayload;
  },
};
