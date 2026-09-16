import { describe, expect, it } from 'vitest';
import { wizardValidationSchema } from './CreateShipmentWizardLayout';
import { formValuesToStepThreePayload } from '../../api/mappers/createShipmentMapper';

describe('wizardValidationSchema — Target Price & Negotiable Validation', () => {
  const baseValidForm = {
    custRef: 'CR-123',
    stops: [
      {
        locationId: '1',
        dateFrom: '2026-09-20',
        lines: [{ productId: '101', qty: 5, weight: 100 }],
      },
      {
        locationId: '2',
        dateFrom: '2026-09-22',
        lines: [{ productId: '101', qty: 5, weight: 100 }],
      },
    ],
  };

  describe('when negotiable is true (load is negotiable)', () => {
    it('allows blank targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: true,
        targetPrice: '',
      };
      await expect(wizardValidationSchema.validate(form)).resolves.toBeTruthy();
    });

    it('allows undefined or null targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: true,
        targetPrice: undefined,
      };
      await expect(wizardValidationSchema.validate(form)).resolves.toBeTruthy();
    });

    it('allows positive targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: true,
        targetPrice: '450.50',
      };
      const result = await wizardValidationSchema.validate(form);
      expect(result.targetPrice).toBe(450.5);
    });

    it('rejects 0 targetPrice when provided', async () => {
      const form = {
        ...baseValidForm,
        negotiable: true,
        targetPrice: '0',
      };
      await expect(wizardValidationSchema.validate(form)).rejects.toThrow(
        'Target price must be greater than 0'
      );
    });

    it('rejects negative targetPrice when provided', async () => {
      const form = {
        ...baseValidForm,
        negotiable: true,
        targetPrice: '-25',
      };
      await expect(wizardValidationSchema.validate(form)).rejects.toThrow(
        'Target price must be greater than 0'
      );
    });
  });

  describe('when negotiable is false (load is non-negotiable / fixed price)', () => {
    it('rejects blank targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: false,
        targetPrice: '',
      };
      await expect(wizardValidationSchema.validate(form)).rejects.toThrow(
        'Target price is required'
      );
    });

    it('rejects undefined targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: false,
        targetPrice: undefined,
      };
      await expect(wizardValidationSchema.validate(form)).rejects.toThrow(
        'Target price is required'
      );
    });

    it('rejects 0 targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: false,
        targetPrice: '0',
      };
      await expect(wizardValidationSchema.validate(form)).rejects.toThrow(
        'Target price must be greater than 0'
      );
    });

    it('accepts valid positive targetPrice', async () => {
      const form = {
        ...baseValidForm,
        negotiable: false,
        targetPrice: '600',
      };
      const result = await wizardValidationSchema.validate(form);
      expect(result.targetPrice).toBe(600);
    });
  });
});

describe('formValuesToStepThreePayload — Target Price & Negotiable mapping', () => {
  it('maps blank targetPrice with negotiable: true to target_price: 0 and negotiable: true', () => {
    const payload = formValuesToStepThreePayload(
      {
        broadcastType: 'public',
        targetPrice: '',
        negotiable: true,
        selectedCarriers: [],
        trackingEmails: [],
        driverNotes: '',
        gpsRequired: false,
        orderValue: '',
        stops: [],
      } as any,
      'complete'
    );

    expect(payload.target_price).toBe(0);
    expect(payload.negotiable).toBe(true);
  });

  it('maps positive targetPrice with negotiable: false to target_price: 750 and negotiable: false', () => {
    const payload = formValuesToStepThreePayload(
      {
        broadcastType: 'public',
        targetPrice: '750',
        negotiable: false,
        selectedCarriers: [],
        trackingEmails: [],
        driverNotes: '',
        gpsRequired: false,
        orderValue: '',
        stops: [],
      } as any,
      'complete'
    );

    expect(payload.target_price).toBe(750);
    expect(payload.negotiable).toBe(false);
  });
});
