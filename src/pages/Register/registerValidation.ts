export type RegisterFieldErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  email?: string;
  otp?: string;
  password?: string;
  password_confirmation?: string;
  company_name?: string;
  street_address?: string;
  postal_code?: string;
  city?: string;
  address_country?: string;
  hear_about_us_shipper?: string;
  hear_about_us_other_shipper?: string;
  referral_code?: string;
  terms?: string;
  kyc_vat_number_shipper?: string;
  shipper_certificate?: string;
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

export function validateCompanyName(value: string, t: Translate): string | undefined {
  const v = value.trim();
  if (!v) return t('registerCompanyRequired', 'Please enter company name');
  if (v.length < 2) return t('registerCompanyMinLength', 'Please enter minimum 2 characters in company name');
  if (v.length > 50) return t('registerCompanyMaxLength', 'Company name must not exceed 50 characters');
  return undefined;
}

export function validateCompanyStep(companyName: string, t: Translate): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const err = validateCompanyName(companyName, t);
  if (err) errors.company_name = err;
  return errors;
}

export function validateAddressStep(
  fields: {
    street_address: string;
    postal_code: string;
    city: string;
    address_country: string;
  },
  t: Translate
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!fields.street_address.trim()) {
    errors.street_address = t('registerStreetRequired', 'Address is required');
  }
  if (!fields.postal_code.trim()) {
    errors.postal_code = t('registerPostalRequired', 'Postal Code is required');
  }
  if (!fields.city.trim()) {
    errors.city = t('registerCityRequired', 'City is required');
  }
  if (!fields.address_country.trim()) {
    errors.address_country = t('registerCountryRequired', 'Country is required');
  }
  return errors;
}

export function validateMarketingTermsStep(
  fields: {
    hear_about_us_shipper: string;
    hear_about_us_other_shipper: string;
    referral_code: string;
    terms: boolean;
  },
  t: Translate
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!fields.hear_about_us_shipper.trim()) {
    errors.hear_about_us_shipper = t(
      'registerHearAboutRequired',
      'Please select how did you hear about us'
    );
  }
  if (fields.hear_about_us_shipper === 'Other') {
    const other = fields.hear_about_us_other_shipper.trim();
    if (!other || other.length < 2) {
      errors.hear_about_us_other_shipper = t(
        'registerHearAboutOtherMin',
        'Please enter minimum 2 characters'
      );
    }
  }
  if (fields.referral_code && fields.referral_code.length > 35) {
    errors.referral_code = t('registerReferralMaxLength', 'Referral code must not exceed 35 characters');
  }
  if (!fields.terms) {
    errors.terms = t(
      'registerTermsRequired',
      'You must agree to the terms and policies to continue.'
    );
  }
  return errors;
}

const CERT_MAX_BYTES = 2 * 1024 * 1024;
const CERT_MIME = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const CERT_EXT = /\.(pdf|jpe?g|png)$/i;

export function validateVatNumber(value: string, t: Translate): string | undefined {
  const v = value.trim();
  if (!v) return t('registerVatRequired', 'Company V.A.T Number is required');
  if (v.length < 2) return t('registerVatMinLength', 'Minimum 2 characters are required');
  if (v.length > 16) return t('registerVatMaxLength', 'VAT number must not exceed 16 characters');
  return undefined;
}

export function validateCertificateFile(file: File | null, t: Translate): string | undefined {
  if (!file) return t('registerCertRequired', 'Please upload your certificate');
  const typeOk = CERT_MIME.has(file.type) || CERT_EXT.test(file.name);
  if (!typeOk) {
    return t('registerCertTypeInvalid', 'Certificate must be PDF, JPG, or PNG');
  }
  if (file.size > CERT_MAX_BYTES) {
    return t('registerCertTooLarge', 'The file size must not exceed 2MB.');
  }
  return undefined;
}

export function validateKycStep(
  vat: string,
  certificate: File | null,
  t: Translate
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const vatErr = validateVatNumber(vat, t);
  const certErr = validateCertificateFile(certificate, t);
  if (vatErr) errors.kyc_vat_number_shipper = vatErr;
  if (certErr) errors.shipper_certificate = certErr;
  return errors;
}
