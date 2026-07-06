import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createShipmentService, ApiError } from '../../../api';
import { draftToFormValues, formValuesToStepOnePayload } from '../../../api/mappers/createShipmentMapper';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import { buildDefaultWizardValues } from '../../../components/CreateShipmentWizard/types';

function parseStep(value: string | null): number {
  const n = parseInt(value || '1', 10);
  if (Number.isNaN(n) || n < 1 || n > 3) return 1;
  return n;
}

export function useCreateShipmentWizard(showToast: (msg: string, type?: 'success' | 'error' | 'info') => void, t: (key: string) => string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStepState] = useState(() => parseStep(searchParams.get('step')));
  const [shipmentId, setShipmentId] = useState<number | null>(() => {
    const id = searchParams.get('id');
    return id ? parseInt(id, 10) || null : null;
  });
  const [loadId, setLoadId] = useState<string>(() => buildDefaultWizardValues().loadId);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [loadedValues, setLoadedValues] = useState<WizardFormValues | null>(null);
  const [stepNavigationError, setStepNavigationError] = useState<string | null>(null);
  const [validationRequest, setValidationRequest] = useState(0);
  const loadAttemptedRef = useRef<string | null>(null);

  const defaultValues = useMemo(() => buildDefaultWizardValues(), []);

  const syncUrl = useCallback(
    (nextStep: number, nextId: number | null) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set('step', String(nextStep));
          if (nextId) {
            params.set('id', String(nextId));
          } else {
            params.delete('id');
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const goToStep = useCallback(
    (nextStep: number, options?: { requireId?: boolean }) => {
      if (options?.requireId && !shipmentId) {
        setStepNavigationError('validationCompleteStep1First');
        setValidationRequest((count) => count + 1);
        if (step !== 1) {
          setStepState(1);
          syncUrl(1, shipmentId);
        }
        return false;
      }
      setStepNavigationError(null);
      setStepState(nextStep);
      syncUrl(nextStep, shipmentId);
      return true;
    },
    [shipmentId, step, syncUrl]
  );

  useEffect(() => {
    if (!searchParams.get('step')) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set('step', '1');
          return params;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const urlStep = parseStep(searchParams.get('step'));
    const urlId = searchParams.get('id');
    setStepState(urlStep);
    setShipmentId(urlId ? parseInt(urlId, 10) || null : null);
  }, [searchParams]);

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (!urlId) {
      setDraftLoaded(true);
      setLoadedValues(null);
      return;
    }

    if (loadAttemptedRef.current === urlId) return;
    loadAttemptedRef.current = urlId;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    createShipmentService
      .getDraft(urlId)
      .then((draft) => {
        if (cancelled) return;
        const mapped = draftToFormValues(draft, defaultValues);
        setShipmentId(draft.id);
        setLoadId(draft.auto_id);
        setLoadedValues(mapped);
        setStepState(draft.wizard_step || parseStep(searchParams.get('step')));
        setDraftLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : t('draftLoadFailed') || 'Failed to load draft shipment.';
        setLoadError(message);
        showToast(message, 'error');
        setDraftLoaded(true);
        loadAttemptedRef.current = null;
        setSearchParams(
          (prev) => {
            const params = new URLSearchParams(prev);
            params.delete('id');
            params.set('step', '1');
            return params;
          },
          { replace: true }
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [defaultValues, searchParams, setSearchParams, showToast, t]);

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
          setStepState(2);
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
    setLoadId,
    stepNavigationError,
    validationRequest,
  };
}
