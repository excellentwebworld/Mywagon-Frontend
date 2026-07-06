import type { MutableRefObject } from 'react';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';

export interface WizardOutletContext {
  shipmentId: number | null;
  isSaving: boolean;
  validationRequest: number;
  goToStep: (nextStep: number, options?: { requireId?: boolean }) => boolean;
  saveStep1: (values: WizardFormValues, mode: 'partial' | 'complete') => Promise<unknown>;
  saveStep2: (
    values: WizardFormValues,
    mode: 'partial' | 'complete',
    routeSummary?: { totalDistKm: number; totalDriveMin: number }
  ) => Promise<unknown>;
  saveStep3: (values: WizardFormValues, mode: 'partial' | 'complete') => Promise<unknown>;
  resetItineraryConfirmationRef: MutableRefObject<(() => void) | null>;
}
