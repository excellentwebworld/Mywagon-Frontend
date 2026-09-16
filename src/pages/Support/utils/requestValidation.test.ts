import { describe, expect, it } from 'vitest';
import {
  mapSupportFieldValidationError,
  validateSupportField,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from './requestValidation';

describe('validateSupportField & mapSupportFieldValidationError (BUG-11)', () => {
  describe('validateSupportField', () => {
    it('validates type field', () => {
      expect(validateSupportField('type', '')).toBe('required');
      expect(validateSupportField('type', '   ')).toBe('required');
      expect(validateSupportField('type', 'bug_report')).toBeNull();
    });

    it('validates category field', () => {
      expect(validateSupportField('category', '')).toBe('required');
      expect(validateSupportField('category', 'billing')).toBeNull();
    });

    it('validates title field', () => {
      expect(validateSupportField('title', '')).toBe('required');
      expect(validateSupportField('title', 'Valid title')).toBeNull();

      const tooLongTitle = 'a'.repeat(MAX_TITLE_LENGTH + 1);
      expect(validateSupportField('title', tooLongTitle)).toBe('title_too_long');

      const maxTitle = 'a'.repeat(MAX_TITLE_LENGTH);
      expect(validateSupportField('title', maxTitle)).toBeNull();
    });

    it('validates description field', () => {
      expect(validateSupportField('description', '')).toBe('required');
      expect(validateSupportField('description', 'Valid description')).toBeNull();

      const tooLongDesc = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
      expect(validateSupportField('description', tooLongDesc)).toBe('description_too_long');

      const maxDesc = 'a'.repeat(MAX_DESCRIPTION_LENGTH);
      expect(validateSupportField('description', maxDesc)).toBeNull();
    });
  });

  describe('mapSupportFieldValidationError', () => {
    it('maps backend length and required errors', () => {
      expect(mapSupportFieldValidationError('title', 'The title may not be greater than 255 characters.')).toBe('title_too_long');
      expect(mapSupportFieldValidationError('description', 'The description may not be greater than 5000 characters.')).toBe('description_too_long');
      expect(mapSupportFieldValidationError('type', 'The type field is required.')).toBe('required');
      expect(mapSupportFieldValidationError('category', 'Something invalid')).toBe('invalid');
    });
  });
});
