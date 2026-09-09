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
  | 'vf'
  | 'done';

/** Active wizard steps (`done` is post-submit success). */
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
  'vf',
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
  /** Step index into REGISTER_STEPS, or REGISTER_STEPS.length for done */
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

function isPhase2Complete(draft: SignupDraft): boolean {
  return Boolean(
    draft.company_name.trim() &&
      draft.street_address.trim() &&
      draft.postal_code.trim() &&
      draft.city.trim() &&
      draft.address_country.trim() &&
      draft.terms
  );
}

/**
 * Normalize step index across Phase 1–3 draft versions.
 * Old Phase 2 hold was index 9 (after mk) — maps to `vf` (also index 9 now).
 */
export function normalizeStepIndex(raw: number | undefined, draft: SignupDraft): number {
  const maxDone = REGISTER_STEPS.length;
  let index = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  index = Math.min(Math.max(index, 0), maxDone);

  const coIndex = REGISTER_STEPS.indexOf('co');
  const vfIndex = REGISTER_STEPS.indexOf('vf');

  if (index >= coIndex) {
    if (!draft.phoneVerified || !draft.emailVerified || !draft.password) {
      if (!draft.password) return REGISTER_STEPS.indexOf('pw');
      if (!draft.emailVerified) return REGISTER_STEPS.indexOf('em');
      if (!draft.phoneVerified) return REGISTER_STEPS.indexOf('ph');
      return REGISTER_STEPS.indexOf('pw');
    }
  }

  if (index >= vfIndex && !isPhase2Complete(draft)) {
    if (!draft.terms || !draft.hear_about_us_shipper) return REGISTER_STEPS.indexOf('mk');
    if (!draft.street_address || !draft.city) return REGISTER_STEPS.indexOf('ad');
    if (!draft.company_name) return REGISTER_STEPS.indexOf('co');
    return REGISTER_STEPS.indexOf('mk');
  }

  // Never restore into `done` from storage (submit must succeed again if needed)
  if (index >= maxDone) {
    return vfIndex;
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

export function clearSignupDraft(): void {
  try {
    sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
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
