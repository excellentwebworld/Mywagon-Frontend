import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ApiEditPreviewDiff } from '../../api/types/createShipment';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import type { CompareView } from './editDiff';

export interface WizardOutletContext {
  shipmentId: number | null;
  isSaving: boolean;
  validationRequest: number;
  isEditMode: boolean;
  lockedStopIds: number[];
  editBlocked: boolean;
  editDiff: ApiEditPreviewDiff | null;
  editDiffLoading: boolean;
  compareView: CompareView;
  setCompareView: Dispatch<SetStateAction<CompareView>>;
  refreshEditDiff: () => Promise<ApiEditPreviewDiff | null>;
  goToStep: (nextStep: number, options?: { requireId?: boolean }) => boolean;
  saveStep1: (values: WizardFormValues, mode: 'partial' | 'complete') => Promise<unknown>;
  saveStep2: (
    values: WizardFormValues,
    mode: 'partial' | 'complete',
    routeSummary?: { totalDistKm: number; totalDriveMin: number }
  ) => Promise<unknown>;
  saveStep3: (values: WizardFormValues, mode: 'partial' | 'complete') => Promise<unknown>;
  cancelEditSession: () => Promise<void>;
  resetItineraryConfirmationRef: MutableRefObject<(() => void) | null>;
}
