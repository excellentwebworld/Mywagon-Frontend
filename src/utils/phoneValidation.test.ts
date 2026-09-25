import { describe, it, expect } from 'vitest';
import { sanitizePhoneInput, isValidPhoneNumber } from './phoneValidation';

describe('phoneValidation utility', () => {
  describe('sanitizePhoneInput', () => {
    it('strips non-phone characters like letters and special symbols', () => {
      expect(sanitizePhoneInput('abc+30 691-234 (567) xyz!@#')).toBe('+30 691-234 (567) ');
      expect(sanitizePhoneInput('helloworld')).toBe('');
      expect(sanitizePhoneInput('+306912345678')).toBe('+306912345678');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('returns true for valid phone numbers (8–15 digits)', () => {
      expect(isValidPhoneNumber('+30 691 234 5678')).toBe(true);
      expect(isValidPhoneNumber('6912345678')).toBe(true);
      expect(isValidPhoneNumber('+1 (555) 123-4567')).toBe(true);
      expect(isValidPhoneNumber('12345678')).toBe(true);
      expect(isValidPhoneNumber('+30 210 1234567')).toBe(true);
    });

    it('returns false for empty or whitespace strings', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('   ')).toBe(false);
    });

    it('returns false for numbers with fewer than 8 digits', () => {
      expect(isValidPhoneNumber('1234567')).toBe(false);
      expect(isValidPhoneNumber('+30 1234')).toBe(false);
    });

    it('returns false for numbers with more than 15 digits', () => {
      expect(isValidPhoneNumber('1234567890123456')).toBe(false);
    });

    it('returns false for strings with invalid characters', () => {
      expect(isValidPhoneNumber('6912345678a')).toBe(false);
      expect(isValidPhoneNumber('+30 691-234-5678!')).toBe(false);
    });
  });
});
