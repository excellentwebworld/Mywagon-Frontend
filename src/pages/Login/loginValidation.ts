export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

type Translate = (key: string) => string;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginEmail(email: string, t: Translate): string | undefined {
  const value = email.trim();

  if (!value) return t('loginEmailRequired');
  if (value.length < 2) return t('loginEmailMinLength');
  if (value.length > 50) return t('loginEmailMaxLength');
  if (!EMAIL_PATTERN.test(value)) return t('loginEmailInvalid');

  return undefined;
}

export function validateLoginPassword(password: string, t: Translate): string | undefined {
  if (!password) return t('loginPasswordRequired');
  return undefined;
}

export function validateLoginForm(
  email: string,
  password: string,
  t: Translate,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const emailError = validateLoginEmail(email, t);
  const passwordError = validateLoginPassword(password, t);

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return errors;
}
