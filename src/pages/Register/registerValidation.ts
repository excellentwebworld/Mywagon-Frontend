export type RegisterFieldErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  email?: string;
  otp?: string;
  password?: string;
  password_confirmation?: string;
};

type Translate = (key: string, fallbackOrOptions?: string | Record<string, unknown>) => string;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function validateFirstName(value: string, t: Translate): string | undefined {
  const v = value.trim();
  if (!v) return t('registerFirstNameRequired', 'Please enter first name');
  if (v.length > 255) return t('registerNameMaxLength', 'Name must not exceed 255 characters');
  return undefined;
}

export function validateLastName(value: string, t: Translate): string | undefined {
  const v = value.trim();
  if (!v) return t('registerLastNameRequired', 'Please enter last name');
  if (v.length > 255) return t('registerNameMaxLength', 'Name must not exceed 255 characters');
  return undefined;
}

export function validateNameStep(
  firstName: string,
  lastName: string,
  t: Translate
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const fn = validateFirstName(firstName, t);
  const ln = validateLastName(lastName, t);
  if (fn) errors.first_name = fn;
  if (ln) errors.last_name = ln;
  return errors;
}

export function validatePhone(phone: string, t: Translate): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return t('registerPhoneRequired', 'Please enter mobile phone');
  if (!/^\d+$/.test(digits)) return t('registerPhoneInvalid', 'Please enter valid phone number');
  if (digits.length < 8) return t('registerPhoneMinLength', 'Please enter minimum 8 digits');
  if (digits.length > 10) return t('registerPhoneMaxLength', 'Phone must not exceed 10 digits');
  return undefined;
}

export function validateCountryCode(code: string, t: Translate): string | undefined {
  if (!code?.trim()) return t('registerCountryCodeRequired', 'Please select country code');
  return undefined;
}

export function validatePhoneStep(
  countryCode: string,
  phone: string,
  t: Translate
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const cc = validateCountryCode(countryCode, t);
  const ph = validatePhone(phone, t);
  if (cc) errors.country_code = cc;
  if (ph) errors.phone = ph;
  return errors;
}

export function validateEmail(email: string, t: Translate): string | undefined {
  const value = email.trim();
  if (!value) return t('registerEmailRequired', 'Please enter work email');
  if (!EMAIL_PATTERN.test(value)) return t('registerEmailInvalid', 'Please enter valid email address.');
  return undefined;
}

export function validateEmailStep(email: string, t: Translate): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const em = validateEmail(email, t);
  if (em) errors.email = em;
  return errors;
}

export function validateOtp(otp: string, t: Translate): string | undefined {
  if (!otp || otp.length !== 6) return t('registerOtpRequired', 'Enter OTP');
  if (!/^\d{6}$/.test(otp)) return t('registerOtpInvalid', 'Enter valid OTP');
  return undefined;
}

export function validatePassword(password: string, t: Translate): string | undefined {
  if (!password) return t('registerPasswordRequired', 'Please enter password');
  if (password.length < 8) return t('registerPasswordMinLength', 'Password must be at least 8 characters');
  if (!PASSWORD_PATTERN.test(password)) {
    return t(
      'registerPasswordComplexity',
      'Min 8 characters · 1 uppercase · 1 number · 1 special'
    );
  }
  return undefined;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
  t: Translate
): string | undefined {
  if (!confirm) return t('registerPasswordConfirmRequired', 'Please confirm password');
  if (password !== confirm) return t('registerPasswordMismatch', 'Passwords do not match');
  return undefined;
}

export function validatePasswordStep(
  password: string,
  confirm: string,
  t: Translate
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const pw = validatePassword(password, t);
  const cp = validatePasswordConfirm(password, confirm, t);
  if (pw) errors.password = pw;
  if (cp) errors.password_confirmation = cp;
  return errors;
}

export function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
