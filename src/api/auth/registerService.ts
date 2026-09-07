import axios from 'axios';
import { getBrowserTimezone } from '../../utils/timezone';

export type RegisterUserType = 'shipper' | 'carrier' | 'driver' | 'freelancer';

export type CountryCodeOption = { code: string; label: string };
export type CountryDomicileOption = { value: string; label: string };
export type IdNameOption = { id: number | string; name: string };

export type SignupReference = {
  vehicle_types: IdNameOption[];
  country_codes: CountryCodeOption[];
  countries_domicile: CountryDomicileOption[];
  videos?: {
    shipper?: string;
    carrier?: string;
  };
};

export type SignupResult = {
  status: boolean;
  message: string;
  redirect_url?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

function langHeaders(lang?: string): Record<string, string> {
  if (!lang) return {};
  return { 'Accept-Language': lang };
}

async function registerRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    lang?: string;
  } = {},
): Promise<T> {
  try {
    const response = await axios({
      baseURL: API_BASE,
      url: path,
      method: options.method || 'GET',
      data: options.body,
      headers: {
        Accept: 'application/json',
        'X-Client-Timezone': getBrowserTimezone(),
        ...langHeaders(options.lang),
        ...options.headers,
      },
    });
    return response.data as T;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      const firstFieldError = data?.errors
        ? Object.values(data.errors).flat()[0]
        : undefined;
      throw new Error(firstFieldError || data?.message || err.message || 'Request failed');
    }
    throw err;
  }
}

export const registerService = {
  getReference(lang?: string) {
    return registerRequest<{ status: boolean; data: SignupReference }>('/auth/signup/reference', {
      lang,
    });
  },

  async fetchCargoTypes(truckType: string | number, lang?: string) {
    return registerRequest<{ status: boolean; data: IdNameOption[] }>(
      `/auth/signup/cargo-types?truck_type=${encodeURIComponent(String(truckType))}`,
      { lang },
    );
  },

  async fetchCargoSpecifications(
    truckType: string | number,
    cargoType: string | number,
    lang?: string,
  ) {
    const qs = new URLSearchParams({
      truck_type: String(truckType),
      cargo_type: String(cargoType),
    });
    return registerRequest<{ status: boolean; data: IdNameOption[] }>(
      `/auth/signup/cargo-specifications?${qs.toString()}`,
      { lang },
    );
  },

  sendEmailOtp(email: string, userType: RegisterUserType, lang?: string) {
    return registerRequest<{ status: boolean; message: string; otp?: number }>('/auth/email/otp', {
      method: 'POST',
      body: { email, user_type: userType },
      lang,
    });
  },

  sendPhoneOtp(countryCode: string, phone: string, lang?: string) {
    return registerRequest<{
      status: boolean;
      message: string;
      data?: { otp?: string };
    }>('/auth/phone/otp', {
      method: 'POST',
      body: { country_code: countryCode, phone },
      lang,
    });
  },

  verifyPhoneOtp(countryCode: string, phone: string, otp: string, lang?: string) {
    return registerRequest<{ status: boolean; message: string }>('/auth/phone/otp/verify', {
      method: 'POST',
      body: { country_code: countryCode, phone, otp },
      lang,
    });
  },

  checkDuplicate(
    payload: {
      table_name: 'shippers' | 'carriers' | 'drivers';
      field_name: 'email' | 'phone' | 'company_name';
      new_value: string;
      old_value?: string;
    },
    lang?: string,
  ) {
    return registerRequest<{ status: boolean; success: boolean; message?: string }>(
      '/auth/check-duplicate',
      { method: 'POST', body: payload, lang },
    );
  },

  checkCompany(
    payload: {
      table_name: 'shippers' | 'carriers' | 'drivers';
      field_name: string;
      new_value: string;
      old_value?: string;
    },
    lang?: string,
  ) {
    return registerRequest<{ status: boolean; success: boolean; message?: string }>(
      '/auth/check-company',
      { method: 'POST', body: payload, lang },
    );
  },

  verifyVat(vat: string, lang?: string) {
    return registerRequest<{ status: boolean; message?: string }>(
      `/auth/verify-vat/${encodeURIComponent(vat)}`,
      { lang },
    );
  },

  signupShipper(formData: FormData, lang?: string) {
    return registerRequest<SignupResult>('/auth/signup', {
      method: 'POST',
      body: formData,
      lang,
    });
  },

  signupCarrier(formData: FormData, lang?: string) {
    return registerRequest<SignupResult>('/auth/signup/carrier', {
      method: 'POST',
      body: formData,
      lang,
    });
  },

  signupDriver(formData: FormData, lang?: string) {
    return registerRequest<SignupResult>('/auth/signup/driver', {
      method: 'POST',
      body: formData,
      lang,
    });
  },
};
