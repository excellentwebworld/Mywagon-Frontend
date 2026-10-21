import { describe, expect, it } from 'vitest';
import * as Yup from 'yup';
import {
  createCompanyFieldValidators,
  sanitizeCompanyNameInput,
  sanitizeCompanyPhoneInput,
  sanitizeCompanyVatInput,
  sanitizeContactPersonInput,
} from './companyFieldValidation';

const t = (_key: string, fallback?: string) => fallback || _key;

describe('companyFieldValidation', () => {
  it('sanitizes company name: letters/spaces only, max 30', () => {
    expect(sanitizeCompanyNameInput('Acme Corp 123!')).toBe('Acme Corp ');
    expect(sanitizeCompanyNameInput('A'.repeat(40))).toBe('A'.repeat(30));
  });

  it('sanitizes VAT and phone to digits max 15', () => {
    expect(sanitizeCompanyVatInput('EL-094-12345678901')).toBe('09412345678901'.slice(0, 15));
    expect(sanitizeCompanyPhoneInput('+30 210 123 4567 89')).toBe('30210123456789'.slice(0, 15));
  });

  it('caps contact person at 50 characters and blocks digits', () => {
    expect(sanitizeContactPersonInput('John Doe 123')).toBe('John Doe ');
    expect(sanitizeContactPersonInput('X'.repeat(60))).toBe('X'.repeat(50));
  });

  it('validates field rules via Yup', async () => {
    const fields = createCompanyFieldValidators(t);

    await expect(fields.name.validate('Acme Corp')).resolves.toBe('Acme Corp');
    await expect(fields.name.validate('Acme1')).rejects.toThrow(/letters/i);
    await expect(fields.name.validate('A'.repeat(31))).rejects.toThrow(/30/);

    await expect(fields.vat.validate('094123456')).resolves.toBe('094123456');
    await expect(fields.vat.validate('EL094')).rejects.toThrow(/digits/i);

    await expect(fields.phone.validate('2101234567')).resolves.toBe('2101234567');
    await expect(fields.phone.validate('2101234567890123')).rejects.toThrow(/15/);

    await expect(fields.contactPerson.validate('John Doe')).resolves.toBe('John Doe');
    await expect(fields.contactPerson.validate('John 2')).rejects.toThrow(/letters|digits/i);
    await expect(fields.contactPerson.validate('X'.repeat(51))).rejects.toThrow(/50/);
  });

  it('builds a full schema shape', async () => {
    const fields = createCompanyFieldValidators(t);
    const schema = Yup.object().shape({
      name: fields.name,
      vat: fields.vat,
      phone: fields.phone,
      contactPerson: fields.contactPerson,
    });
    await expect(
      schema.validate({
        name: 'Acme',
        vat: '123456789',
        phone: '2101234567',
        contactPerson: 'Jane',
      })
    ).resolves.toBeTruthy();
  });
});
