import * as Yup from 'yup';

export const COMPANY_NAME_MAX = 30;
export const COMPANY_VAT_MAX = 15;
export const COMPANY_PHONE_MAX = 15;
export const COMPANY_CONTACT_MAX = 30;

/** Letters and spaces only (no digits / special chars), max 30. */
export function sanitizeCompanyNameInput(value: string): string {
  return value.replace(/[^\p{L}\s]/gu, '').slice(0, COMPANY_NAME_MAX);
}

/** Digits only, max 15. */
export function sanitizeCompanyVatInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, COMPANY_VAT_MAX);
}

/** Digits only, max 15. */
export function sanitizeCompanyPhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, COMPANY_PHONE_MAX);
}

/** Letters and spaces only (no digits), max 50. */
export function sanitizeContactPersonInput(value: string): string {
  return value.replace(/[^\p{L}\s]/gu, '').slice(0, COMPANY_CONTACT_MAX);
}

type TranslateFn = (key: string, fallback?: string) => string;

export function createCompanyFieldValidators(t: TranslateFn) {
  return {
    name: Yup.string()
      .trim()
      .required(t('abCompanyNameRequired', 'Company name is required.'))
      .max(
        COMPANY_NAME_MAX,
        t('abCompanyNameMax', 'Company name must be at most 30 characters.')
      )
      .matches(
        /^[\p{L}\s]+$/u,
        t(
          'abCompanyNameFormat',
          'Company name may only contain letters and spaces (no digits or special characters).'
        )
      ),
    vat: Yup.string()
      .trim()
      .required(t('abVatRequired', 'VAT number is required.'))
      .matches(
        /^\d+$/,
        t('abVatDigitsOnly', 'VAT number may only contain digits (no special characters).')
      )
      .max(
        COMPANY_VAT_MAX,
        t('abVatMax', 'VAT number must be at most 15 digits.')
      ),
    phone: Yup.string()
      .trim()
      .required(t('abPhoneRequired', 'Phone is required.'))
      .matches(
        /^\d+$/,
        t('abPhoneDigitsOnly', 'Phone may only contain digits.')
      )
      .max(
        COMPANY_PHONE_MAX,
        t('abPhoneMaxDigits', 'Phone must be at most 15 digits.')
      ),
    contactPerson: Yup.string()
      .trim()
      .required(t('abContactPersonRequired', 'Primary contact person is required.'))
      .max(
        COMPANY_CONTACT_MAX,
        t('abContactPersonMax', 'Primary contact person must be at most 50 characters.')
      )
      .matches(
        /^[\p{L}\s]+$/u,
        t(
          'abContactPersonFormat',
          'Primary contact person may only contain letters and spaces (no digits).'
        )
      ),
  };
}
