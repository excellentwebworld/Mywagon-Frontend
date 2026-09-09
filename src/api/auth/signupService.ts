import axios from 'axios';
import { axiosInstance } from '../client';
import type {
  CheckCompanyPayload,
  CheckDuplicatePayload,
  RegisterShipperFields,
  SendEmailOtpPayload,
  SendPhoneOtpPayload,
  SignupReferenceData,
  SignupReferenceResponse,
  SignupStatusResponse,
  VerifyPhoneOtpPayload,
  VerifyVatResponse,
} from './signupTypes';

async function signupRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: '',
    ...options.headers,
  };

  try {
    const response = await axiosInstance({
      url: path,
      method: options.method || 'GET',
      data: options.body,
      headers,
    });
    return response.data as T;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data;
      const statusText = err.response?.statusText || err.message;
      const errPayload = data as { message?: string; errors?: Record<string, string[]> };
      const firstFieldError = errPayload?.errors
        ? Object.values(errPayload.errors).flat()[0]
        : undefined;
      const message = firstFieldError || errPayload?.message || statusText || 'Request failed';
      throw new Error(message);
    }
    throw err;
  }
}

function assertOk(res: SignupStatusResponse, fallback: string): void {
  if (res.status === false || res.success === false) {
    throw new Error(res.message || fallback);
  }
}

function toSignupFormData(fields: RegisterShipperFields): FormData {
  const formData = new FormData();
  const entries: Array<[string, string | File | null | undefined | boolean | number]> = [
    ['first_name', fields.first_name],
    ['last_name', fields.last_name],
    ['company_name', fields.company_name],
    ['email', fields.email],
    ['country_code', fields.country_code],
    ['phone', fields.phone],
    ['password', fields.password],
    ['password_confirmation', fields.password_confirmation],
    ['kyc_vat_number_shipper', fields.kyc_vat_number_shipper],
    ['shipper_certificate', fields.shipper_certificate],
    ['street_address', fields.street_address],
    ['address_line_2', fields.address_line_2],
    ['city', fields.city],
    ['address_country', fields.address_country],
    ['postal_code', fields.postal_code],
    ['lat', fields.lat],
    ['lng', fields.lng],
    ['hear_about_us_shipper', fields.hear_about_us_shipper],
    ['hear_about_us_other_shipper', fields.hear_about_us_other_shipper],
    ['referral_code', fields.referral_code],
    ['terms', fields.terms === true || fields.terms === 1 ? '1' : String(fields.terms)],
  ];

  for (const [key, value] of entries) {
    if (value === null || value === undefined || value === '') continue;
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}

export const signupService = {
  async signup(fields: RegisterShipperFields | FormData): Promise<SignupStatusResponse> {
    const body = fields instanceof FormData ? fields : toSignupFormData(fields);
    const res = await signupRequest<SignupStatusResponse>('/auth/signup', {
      method: 'POST',
      body,
    });
    assertOk(res, 'Signup failed');
    return res;
  },

  async sendEmailOtp(payload: SendEmailOtpPayload): Promise<SignupStatusResponse> {
    const res = await signupRequest<SignupStatusResponse>('/auth/email/otp', {
      method: 'POST',
      body: { user_type: 'shipper', ...payload },
    });
    assertOk(res, 'Could not send email OTP');
    return res;
  },

  async sendPhoneOtp(payload: SendPhoneOtpPayload): Promise<SignupStatusResponse> {
    const res = await signupRequest<SignupStatusResponse>('/auth/phone/otp', {
      method: 'POST',
      body: { user_type: 'shipper', ...payload },
    });
    assertOk(res, 'Could not send phone OTP');
    return res;
  },

  async verifyPhoneOtp(payload: VerifyPhoneOtpPayload): Promise<SignupStatusResponse> {
    const res = await signupRequest<SignupStatusResponse>('/auth/phone/otp/verify', {
      method: 'POST',
      body: payload,
    });
    assertOk(res, 'Invalid OTP');
    return res;
  },

  async checkDuplicate(payload: CheckDuplicatePayload): Promise<SignupStatusResponse> {
    const res = await signupRequest<SignupStatusResponse>('/auth/check-duplicate', {
      method: 'POST',
      body: payload,
    });
    return res;
  },

  async checkCompany(payload: CheckCompanyPayload): Promise<SignupStatusResponse> {
    const res = await signupRequest<SignupStatusResponse>('/auth/check-company', {
      method: 'POST',
      body: payload,
    });
    return res;
  },

  async verifyVat(vat: string): Promise<VerifyVatResponse> {
    const encoded = encodeURIComponent(vat.trim());
    return signupRequest<VerifyVatResponse>(`/auth/verify-vat/${encoded}`);
  },

  async getReference(): Promise<SignupReferenceData> {
    const res = await signupRequest<SignupReferenceResponse>('/auth/signup/reference');
    if (!res.status || !res.data) {
      throw new Error(res.message || 'Could not load signup reference data');
    }
    return res.data;
  },
};
