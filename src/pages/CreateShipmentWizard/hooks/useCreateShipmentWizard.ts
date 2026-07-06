import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { createShipmentService, ApiError } from '../../../api';
import { draftToFormValues, formValuesToStepOnePayload, formValuesToStepThreePayload, formValuesToStepTwoPayload } from '../../../api/mappers/createShipmentMapper';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import { buildDefaultWizardValues } from '../../../components/CreateShipmentWizard/types';
import { hasVehicleSelection } from '../../../components/CreateShipmentWizard/vehicleTypes';

function parseStep(value: string | undefined | null): number {
  const n = parseInt(value || '1', 10);
  if (Number.isNaN(n) || n < 1 || n > 3) return 1;
  return n;
}

function buildWizardStepPath(step: number, draftId: number | null): string {
  const base = `/shipments/create/step/${step}`;
  if (!draftId) return base;
  return `${base}?id=${draftId}`;
}

export function useCreateShipmentWizard(showToast: (msg: string, type?: 'success' | 'error' | 'info') => void, t: (key: string) => string) {
  const navigate = useNavigate();
  const stepMatch = useMatch('/shipments/create/step/:stepNumber');
  const [searchParams] = useSearchParams();
  const step = parseStep(stepMatch?.params.stepNumber);

  const draftUrlId = searchParams.get('id');
  const [shipmentId, setShipmentId] = useState<number | null>(() =>
    draftUrlId ? parseInt(draftUrlId, 10) || null : null
  );
  const [loadId, setLoadId] = useState<string>(() => buildDefaultWizardValues().loadId);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(() => !draftUrlId);
  const [loadedValues, setLoadedValues] = useState<WizardFormValues | null>(null);
  const [stepNavigationError, setStepNavigationError] = useState<string | null>(null);
  const [validationRequest, setValidationRequest] = useState(0);

  const defaultValues = useMemo(() => buildDefaultWizardValues(), []);
  const loadedDraftIdRef = useRef<string | null>(null);
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);

  showToastRef.current = showToast;
  tRef.current = t;

  const syncUrl = useCallback(
    (nextStep: number, nextId: number | null) => {
      navigate(buildWizardStepPath(nextStep, nextId), { replace: true });
    },
    [navigate]
  );

  const goToStep = useCallback(
    (nextStep: number, options?: { requireId?: boolean }) => {
      if (options?.requireId && !shipmentId) {
        setStepNavigationError('validationCompleteStep1First');
        setValidationRequest((count) => count + 1);
        if (step !== 1) {
          syncUrl(1, shipmentId);
        }
        return false;
      }
      setStepNavigationError(null);
      syncUrl(nextStep, shipmentId);
      return true;
    },
    [shipmentId, step, syncUrl]
  );

  useEffect(() => {
    const urlId = searchParams.get('id');
    setShipmentId(urlId ? parseInt(urlId, 10) || null : null);
  }, [searchParams]);

  useEffect(() => {
    if (!draftUrlId) {
      loadedDraftIdRef.current = null;
      setDraftLoaded(true);
      setLoadedValues(null);
      setIsLoading(false);
      return;
    }

    if (loadedDraftIdRef.current === draftUrlId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setDraftLoaded(false);

    createShipmentService
      .getDraft(draftUrlId)
      .then((draft) => {
        if (cancelled) return;
        const mapped = draftToFormValues(draft, defaultValues);
        loadedDraftIdRef.current = draftUrlId;
        setShipmentId(draft.id);
        setLoadId(draft.auto_id);
        setLoadedValues(mapped);
        setDraftLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        loadedDraftIdRef.current = null;
        const message =
          err instanceof ApiError
            ? err.message
            : tRef.current('draftLoadFailed') || 'Failed to load draft shipment.';
        setLoadError(message);
        showToastRef.current(message, 'error');
        setDraftLoaded(true);
        navigate(buildWizardStepPath(1, null), { replace: true });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [draftUrlId, defaultValues, navigate]);

  const ensureDraftId = useCallback(async (): Promise<number> => {
    if (shipmentId) return shipmentId;
    const draft = await createShipmentService.createDraft();
    setShipmentId(draft.id);
    setLoadId(draft.auto_id);
    syncUrl(step, draft.id);
    return draft.id;
  }, [shipmentId, step, syncUrl]);

  const saveStep1 = useCallback(
    async (values: WizardFormValues, mode: 'partial' | 'complete') => {
      setIsSaving(true);
      try {
        const id = await ensureDraftId();
        const payload = formValuesToStepOnePayload(values, mode);
        const draft = await createShipmentService.saveStepOne(id, payload);
        setShipmentId(draft.id);
        setLoadId(draft.auto_id);
        if (mode === 'complete') {
          syncUrl(2, draft.id);
          setStepNavigationError(null);
        } else {
          syncUrl(1, draft.id);
          setStepNavigationError(null);
        }
        showToast(
          mode === 'complete'
            ? t('step1SavedSuccess') || 'Step 1 saved successfully.'
            : t('draftSavedSuccess') || 'Draft saved successfully.',
          'success'
        );
        return draft;
      } catch (err: unknown) {
        const message =
          err instanceof ApiError ? err.message : t('draftSaveFailed') || 'Failed to save draft.';
        showToast(message, 'error');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [ensureDraftId, showToast, syncUrl, t]
  );

  const saveStep2 = useCallback(
    async (
      values: WizardFormValues,
      mode: 'partial' | 'complete',
      routeSummary?: { totalDistKm: number; totalDriveMin: number }
    ) => {
      if (mode === 'complete' && !values.itineraryConfirmed) {
        showToast(t('step2ConfirmRequired') || 'Please confirm the itinerary first.', 'error');
        throw new Error('Itinerary not confirmed');
      }

      if (mode === 'complete' && !hasVehicleSelection(values.vehicleSpecs)) {
        showToast(t('step2SelectVehicleRequired') || 'Please select at least one vehicle type.', 'error');
        throw new Error('Vehicle not selected');
      }

      setIsSaving(true);
      try {
        const id = await ensureDraftId();
        const payload = formValuesToStepTwoPayload(
          {
            itineraryConfirmed: values.itineraryConfirmed,
            itineraryConfirmSnapshot: values.itineraryConfirmSnapshot,
            routeSummary: routeSummary ?? values.routeSummary,
            vehicleSpecs: values.vehicleSpecs,
            vehicleSelectionConfirmed: values.vehicleSelectionConfirmed,
          },
          mode
        );
        const draft = await createShipmentService.saveStepTwo(id, payload);
        setShipmentId(draft.id);
        setLoadId(draft.auto_id);
        if (mode === 'complete') {
          syncUrl(3, draft.id);
          setStepNavigationError(null);
        } else {
          syncUrl(2, draft.id);
        }
        showToast(
          mode === 'complete'
            ? t('step2SavedSuccess') || 'Step 2 saved successfully.'
            : t('draftSavedSuccess') || 'Draft saved successfully.',
          'success'
        );
        return draft;
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'Itinerary not confirmed') {
          throw err;
        }
        if (err instanceof Error && err.message === 'Vehicle not selected') {
          throw err;
        }
        const message =
          err instanceof ApiError ? err.message : t('draftSaveFailed') || 'Failed to save draft.';
        showToast(message, 'error');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [ensureDraftId, showToast, syncUrl, t]
  );

  const saveStep3 = useCallback(
    async (values: WizardFormValues, mode: 'partial' | 'complete') => {
      if (mode === 'complete') {
        const price = parseFloat(String(values.targetPrice ?? ''));
        if (!price || price <= 0) {
          showToast(t('priceRequired') || 'Price must be positive.', 'error');
          throw new Error('Invalid price');
        }
        if (values.broadcastType === 'private' && (values.selectedCarriers || []).length < 1) {
          showToast(t('selectCarrierRequired') || 'Please select at least one carrier.', 'error');
          throw new Error('No carriers selected');
        }
      }

      setIsSaving(true);
      try {
        const id = await ensureDraftId();
        const payload = formValuesToStepThreePayload(values, mode);
        const draft = await createShipmentService.saveStepThree(id, payload);
        setShipmentId(draft.id);
        setLoadId(draft.auto_id);
        syncUrl(3, draft.id);
        showToast(
          mode === 'complete'
            ? t('step3SavedSuccess') || 'Step 3 saved successfully.'
            : t('draftSavedSuccess') || 'Draft saved successfully.',
          'success'
        );
        return draft;
      } catch (err: unknown) {
        if (err instanceof Error && (err.message === 'Invalid price' || err.message === 'No carriers selected')) {
          throw err;
        }
        const message =
          err instanceof ApiError ? err.message : t('draftSaveFailed') || 'Failed to save draft.';
        showToast(message, 'error');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [ensureDraftId, showToast, syncUrl, t]
  );

  const publishShipment = useCallback(
    async (values: WizardFormValues) => {
      const price = parseFloat(String(values.targetPrice ?? ''));
      if (!price || price <= 0) {
        showToast(t('priceRequired') || 'Price must be positive.', 'error');
        throw new Error('Invalid price');
      }
      if (values.broadcastType === 'private' && (values.selectedCarriers || []).length < 1) {
        showToast(t('selectCarrierRequired') || 'Please select at least one carrier.', 'error');
        throw new Error('No carriers selected');
      }

      setIsSaving(true);
      try {
        const id = await ensureDraftId();
        await createShipmentService.saveStepThree(id, formValuesToStepThreePayload(values, 'complete'));
        const published = await createShipmentService.publishDraft(id);
        showToast(t('shipmentCreatedSuccess') || 'Shipment created successfully!', 'success');
        return published;
      } catch (err: unknown) {
        if (err instanceof Error && (err.message === 'Invalid price' || err.message === 'No carriers selected')) {
          throw err;
        }
        const message =
          err instanceof ApiError ? err.message : t('publishFailed') || 'Failed to publish shipment.';
        showToast(message, 'error');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [ensureDraftId, showToast, t]
  );

  return {
    step,
    shipmentId,
    loadId,
    isLoading,
    loadError,
    isSaving,
    draftLoaded,
    loadedValues,
    defaultValues,
    goToStep,
    saveStep1,
    saveStep2,
    saveStep3,
    publishShipment,
    setLoadId,
    stepNavigationError,
    validationRequest,
  };
}
