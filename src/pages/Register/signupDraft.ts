/** Persist referral / invite query for later signup phases. */
export const SIGNUP_QUERY_STORAGE_KEY = 'shipper_signup_query';

export const SIGNUP_DRAFT_STORAGE_KEY = 'shipper_signup_draft';

export type Phase1StepKey = 'nm' | 'ph' | 'phOtp' | 'em' | 'emOtp' | 'pw' | 'hold';

/** Active wizard steps (hold is post-Phase-1). */
export const PHASE1_STEPS: Phase1StepKey[] = ['nm', 'ph', 'phOtp', 'em', 'emOtp', 'pw'];

export type SignupDraft = {
  first_name: string;
  last_name: string;
  country_code: string;
  phone: string;
  phoneVerified: boolean;
  email: string;
  emailVerified: boolean;
  password: string;
  password_confirmation: string;
  /** Phase 2 placeholders */
  company_name: string;
  street_address: string;
  address_line_2: string;
  city: string;
  address_country: string;
  postal_code: string;
  lat: string;
  lng: string;
  kyc_vat_number_shipper: string;
  hear_about_us_shipper: string;
  hear_about_us_other_shipper: string;
  referral_code: string;
  /** Last completed Phase 1 step index (0–5), or 6 for hold */
  stepIndex: number;
};

export function createEmptyDraft(defaults?: Partial<SignupDraft>): SignupDraft {
  return {
    first_name: '',
    last_name: '',
    country_code: '+30',
    phone: '',
    phoneVerified: false,
    email: '',
    emailVerified: false,
    password: '',
    password_confirmation: '',
    company_name: '',
    street_address: '',
    address_line_2: '',
    city: '',
    address_country: '',
    postal_code: '',
    lat: '',
    lng: '',
    kyc_vat_number_shipper: '',
    hear_about_us_shipper: '',
    hear_about_us_other_shipper: '',
    referral_code: '',
    stepIndex: 0,
    ...defaults,
  };
}

function referralFromStoredQuery(): string {
  try {
    const qs = sessionStorage.getItem(SIGNUP_QUERY_STORAGE_KEY);
    if (!qs) return '';
    const params = new URLSearchParams(qs);
    return (
      params.get('referral_code') ||
      params.get('referral') ||
      params.get('ref') ||
      params.get('code') ||
      ''
    );
  } catch {
    return '';
  }
}

export function loadSignupDraft(): SignupDraft {
  const referral = referralFromStoredQuery();
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) {
      return createEmptyDraft(referral ? { referral_code: referral } : undefined);
    }
    const parsed = JSON.parse(raw) as Partial<SignupDraft>;
    return createEmptyDraft({
      ...parsed,
      referral_code: parsed.referral_code || referral || '',
    });
  } catch {
    return createEmptyDraft(referral ? { referral_code: referral } : undefined);
  }
}

export function saveSignupDraft(draft: SignupDraft): void {
  try {
    sessionStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function patchSignupDraft(
  current: SignupDraft,
  patch: Partial<SignupDraft>
): SignupDraft {
  const next = { ...current, ...patch };
  saveSignupDraft(next);
  return next;
}
