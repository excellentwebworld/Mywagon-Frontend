export function localTermsPath(type: 'shipper' | 'carrier' | 'driver' = 'shipper', lang: string = 'en'): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/terms-condition/terms_and_conditions/${type}/${lang}`;
}

export function localPrivacyPath(type: 'shipper' | 'carrier' | 'driver' = 'shipper', lang: string = 'en'): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/privacy-policy/privacy_policy/${type}/${lang}`;
}

export function toLocalUrl(url: string | undefined | null, fallbackPath: string): string {
  if (!url) return fallbackPath;
  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      return `${base}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* ignore */
  }
  return url || fallbackPath;
}

export function termsUrl(type: 'shipper' | 'carrier' | 'driver' = 'shipper', lang: string = 'en'): string {
  return localTermsPath(type, lang);
}

export function privacyUrl(type: 'shipper' | 'carrier' | 'driver' = 'shipper', lang: string = 'en'): string {
  return localPrivacyPath(type, lang);
}

export function resolveTermsUrl(
  links?: Record<string, string | undefined> | null,
  lang: string = 'en',
  type: 'shipper' | 'carrier' | 'driver' = 'shipper'
): string {
  const fallback = localTermsPath(type, lang);
  if (links) {
    if (lang === 'el' && links.terms_and_conditions_el) {
      return toLocalUrl(links.terms_and_conditions_el, fallback);
    }
    if (lang === 'en' && links.terms_and_conditions_en) {
      return toLocalUrl(links.terms_and_conditions_en, fallback);
    }
    if (links.terms_and_conditions) {
      return toLocalUrl(links.terms_and_conditions, fallback);
    }
  }
  return fallback;
}

export function resolvePrivacyUrl(
  links?: Record<string, string | undefined> | null,
  lang: string = 'en',
  type: 'shipper' | 'carrier' | 'driver' = 'shipper'
): string {
  const fallback = localPrivacyPath(type, lang);
  if (links) {
    if (lang === 'el' && links.privacy_policy_el) {
      return toLocalUrl(links.privacy_policy_el, fallback);
    }
    if (lang === 'en' && links.privacy_policy_en) {
      return toLocalUrl(links.privacy_policy_en, fallback);
    }
    if (links.privacy_policy) {
      return toLocalUrl(links.privacy_policy, fallback);
    }
  }
  return fallback;
}

/** Local React public asset (not staging/Laravel URL). */
export function localSampleDocUrl(): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return `${base}docs/sample_documents.pdf`;
}

/** @deprecated Prefer localSampleDocUrl() for the register instructions link. */
export function sampleDocUrl(): string {
  return localSampleDocUrl();
}

export function signupVideoUrl(variant: 'shipper' | 'carrier' = 'shipper'): string {
  const aws = (import.meta.env.VITE_AWS_URL as string | undefined)?.replace(/\/$/, '');
  if (!aws) return '';
  if (variant === 'carrier') {
    return `${aws}/stock-videosign-up-carrier-no-mockup.mp4`;
  }
  return `${aws}/stock-video-sign-up-shipper-no-mockup.mp4`;
}
