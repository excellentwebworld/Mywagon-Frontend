const PHONE_INPUT_PATTERN = /[^\d+\s().-]/g;
const PHONE_VALUE_PATTERN = /^[\d+\s().-]+$/;

/** Strip characters that are not valid in a phone/mobile number. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(PHONE_INPUT_PATTERN, '');
}

/** Validates international-style phone numbers (8–15 digits). */
export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!PHONE_VALUE_PATTERN.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}
