import * as Yup from 'yup';
import { isValidPhoneNumber, sanitizePhoneInput } from '../../../utils/phoneValidation';

export { isValidPhoneNumber, sanitizePhoneInput };

export function requiredPhoneSchema(
  requiredMessage = 'Phone is required.',
  invalidMessage = 'Enter a valid phone number.'
) {
  return Yup.string()
    .trim()
    .required(requiredMessage)
    .test('valid-phone', invalidMessage, (value) => isValidPhoneNumber(value ?? ''));
}

export function optionalPhoneSchema(invalidMessage = 'Enter a valid phone number.') {
  return Yup.string()
    .trim()
    .test('valid-phone', invalidMessage, (value) => {
      if (!value?.trim()) return true;
      return isValidPhoneNumber(value);
    });
}
