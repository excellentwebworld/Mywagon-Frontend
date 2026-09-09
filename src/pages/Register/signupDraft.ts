/** Persist referral / invite query for later signup phases. */
export const SIGNUP_QUERY_STORAGE_KEY = 'shipper_signup_query';

export const SIGNUP_DRAFT_STORAGE_KEY = 'shipper_signup_draft';

export type RegisterStepKey =
  | 'nm'
  | 'ph'
  | 'phOtp'
  | 'em'
  | 'emOtp'
  | 'pw'
  | 'co'
  | 'ad'
  | 'mk'
  | 'hold';

/** Active wizard steps (hold is post-Phase-2). */
export const REGISTER_STEPS: RegisterStepKey[] = [
  'nm',
  'ph',
  'phOtp',
  'em',
  'emOtp',
  'pw',
  'co',
  'ad',
  'mk',
];

/** @deprecated Use REGISTER_STEPS */
export const PHASE1_STEPS = REGISTER_STEPS.slice(0, 6);

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
  terms: boolean;
  /** Step index into REGISTER_STEPS, or REGISTER_STEPS.length for hold */
  stepIndex: number;
};

export const HEAR_ABOUT_OPTIONS = [
  'Facebook Ad',
  'Instagram Ad',
  'Linkedin Ad',
  'Google Search',
  'Email Marketing',
  'Friend/Colleague Word of Mouth',
  'Carrier Partner',
  'Shipper Colleague',
  'Other',
] as const;

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
    terms: false,
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

/**
 * Normalize step index from older Phase 1 drafts.
 * Phase 1 hold was index 6 with only 6 steps — that now maps to `co` (also index 6).
 */
export function normalizeStepIndex(raw: number | undefined, draft: SignupDraft): number {
  const maxHold = REGISTER_STEPS.length;
  let index = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  index = Math.min(Math.max(index, 0), maxHold);

  const coIndex = REGISTER_STEPS.indexOf('co');
  if (index >= coIndex) {
    if (!draft.phoneVerified || !draft.emailVerified || !draft.password) {
      if (!draft.password) return REGISTER_STEPS.indexOf('pw');
      if (!draft.emailVerified) return REGISTER_STEPS.indexOf('em');
      if (!draft.phoneVerified) return REGISTER_STEPS.indexOf('ph');
      return REGISTER_STEPS.indexOf('pw');
    }
  }

  return index;
}

export function loadSignupDraft(): SignupDraft {
  const referral = referralFromStoredQuery();
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) {
      return createEmptyDraft(referral ? { referral_code: referral } : undefined);
    }
    const parsed = JSON.parse(raw) as Partial<SignupDraft>;
    const draft = createEmptyDraft({
      ...parsed,
      terms: Boolean(parsed.terms),
      referral_code: parsed.referral_code || referral || '',
    });
    draft.stepIndex = normalizeStepIndex(parsed.stepIndex, draft);
    return draft;
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
