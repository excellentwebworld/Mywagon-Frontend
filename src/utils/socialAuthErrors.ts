/**
 * Map known English backend social-auth validation messages to i18n keys.
 * OAuth callback returns the message in the URL; panel language may differ
 * from whatever locale the backend used when building that redirect.
 */
const SOCIAL_ERROR_KEYS: Record<string, string> = {
  'A company with this email domain is already registered in MYVAGON. Please contact your company admin to join the existing account.':
    'socialAuth.companyDomainRegistered',
  'This email is already registered in MYVAGON. Please log in instead.':
    'socialAuth.emailAlreadyRegistered',
  'This email is already registered with another account type.':
    'socialAuth.emailRegisteredOtherType',
  'Social sign-in session expired. Please try again.': 'socialAuth.sessionExpired',
  'Social sign-in failed. Please try again.': 'socialAuth.failed',
  'Social sign-in was cancelled.': 'socialAuth.cancelled',
  'Invalid social sign-in response.': 'socialAuth.invalidResponse',
  'Social sign-in failed.': 'socialAuth.failed',
};

export function localizeSocialAuthError(
  message: string | null | undefined,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const raw = (message || '').trim();
  if (!raw) {
    return t('socialAuth.failed', {
      defaultValue: 'Social sign-in failed. Please try again.',
    });
  }

  const key = SOCIAL_ERROR_KEYS[raw];
  if (key) {
    return t(key, { defaultValue: raw });
  }

  return raw;
}

export function panelLangFromStorage(): 'en' | 'el' {
  const current =
    localStorage.getItem('app_locale') ||
    localStorage.getItem('shipment-lang') ||
    localStorage.getItem('i18nextLng') ||
    'en';
  return current.toLowerCase().startsWith('el') ? 'el' : 'en';
}
