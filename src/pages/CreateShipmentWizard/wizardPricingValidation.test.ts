import { describe, expect, it } from 'vitest';
import { wizardValidationSchema } from './CreateShipmentWizardLayout';
import { draftToFormValues, formValuesToStepThreePayload } from '../../api/mappers/createShipmentMapper';

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

describe('draftToFormValues — Target Price & Negotiable mapping (Edit/Draft Load)', () => {
  it('converts 0 or "0.00" targetPrice to blank when load is negotiable', () => {
    const defaults = {
      loadId: 'SID-NEW',
      custRef: '',
      coOwners: [],
      stops: [],
      itineraryConfirmed: false,
      itineraryConfirmSnapshot: '',
      routeSummary: null,
      vehicleSpecs: {},
      vehicleSelectionConfirmed: false,
      broadcastType: 'private' as const,
      selectedCarriers: [],
      targetPrice: '',
      negotiable: true,
      trackingEmails: {},
      driverNotes: '',
      gpsRequired: false,
      orderValue: '',
    };

    const mappedZeroStr = draftToFormValues(
      {
        auto_id: 'SID-10401',
        wizard_state: {
          negotiable: true,
          targetPrice: '0.00',
        },
      },
      defaults as any
    );
    expect(mappedZeroStr.targetPrice).toBe('');
    expect(mappedZeroStr.negotiable).toBe(true);

    const mappedZeroNum = draftToFormValues(
      {
        auto_id: 'SID-10401',
        wizard_state: {
          negotiable: true,
          targetPrice: 0,
        },
      },
      defaults as any
    );
    expect(mappedZeroNum.targetPrice).toBe('');
    expect(mappedZeroNum.negotiable).toBe(true);

    const mappedPositive = draftToFormValues(
      {
        auto_id: 'SID-10401',
        wizard_state: {
          negotiable: true,
          targetPrice: '500.00',
        },
      },
      defaults as any
    );
    expect(mappedPositive.targetPrice).toBe('500.00');
    expect(mappedPositive.negotiable).toBe(true);
  });

  it('preserves targetPrice as-is when load is fixed price (non-negotiable)', () => {
    const defaults = {
      loadId: 'SID-NEW',
      custRef: '',
      coOwners: [],
      stops: [],
      itineraryConfirmed: false,
      itineraryConfirmSnapshot: '',
      routeSummary: null,
      vehicleSpecs: {},
      vehicleSelectionConfirmed: false,
      broadcastType: 'private' as const,
      selectedCarriers: [],
      targetPrice: '',
      negotiable: false,
      trackingEmails: {},
      driverNotes: '',
      gpsRequired: false,
      orderValue: '',
    };

    const mappedFixed = draftToFormValues(
      {
        auto_id: 'SID-10402',
        wizard_state: {
          negotiable: false,
          targetPrice: '750',
        },
      },
      defaults as any
    );
    expect(mappedFixed.targetPrice).toBe('750');
    expect(mappedFixed.negotiable).toBe(false);
  });
});
