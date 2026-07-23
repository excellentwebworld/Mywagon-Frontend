import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createShipmentService, erpOrdersService, ApiError, SAT_PREFILL_KEY } from '../../../api';
import type { ApiProceedResult } from '../../../api/types/availabilities';
import {
  draftToFormValues,
  formValuesToStepOnePayload,
  formValuesToStepThreePayload,
  formValuesToStepTwoPayload,
} from '../../../api/mappers/createShipmentMapper';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import { buildDefaultWizardValues, createNewStop } from '../../../components/CreateShipmentWizard/types';
import { hasVehicleSelection } from '../../../components/CreateShipmentWizard/vehicleTypes';
import { useApp, type LocationItem } from '../../../context/AppContext';
import { useVehicleTypes } from '../../../hooks/useVehicleTypes';
import type { ErpOrder } from '../../ErpOrders/types';
import {
  buildVehicleSpecsFromPrefill,
  resolveStopLocationFromCoords,
} from './satPrefill';
import {
  ERP_ORDERS_PREFILL_KEY,
  buildStopsFromErpOrders,
  isOrderEligibleForCreateLoad,
  type ErpOrdersPrefillPayload,
} from './erpOrdersPrefill';
import { wizardQueryKeys } from './wizardQueryKeys';
import { utcToLocalParts } from '../../../utils/timezone';

function parseStep(value: string | undefined | null): number {
  const n = parseInt(value || '1', 10);
  if (Number.isNaN(n) || n < 1 || n > 3) return 1;
  return n;
}

function buildWizardStepPath(
  step: number,
  draftId: number | null,
  availabilityId?: number | null
): string {
  const base = `/shipments/create/step/${step}`;
  if (draftId) return `${base}?id=${draftId}`;
  if (availabilityId) return `${base}?availability_id=${availabilityId}`;
  return base;
}

type SatGeoPending = {
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
};

type SatVehiclePending = {
  truck_type_id?: number | null;
  truck_type: string | null;
};

/** Prefer API snapshot, but never drop Step 1/2 fields the live form already had. */
function mergeDraftSnapshot(
  next: WizardFormValues,
  preserve?: WizardFormValues | null
): WizardFormValues {
  if (!preserve) return next;

  const nextHasVehicles = hasVehicleSelection(next.vehicleSpecs);
  const preserveHasVehicles = hasVehicleSelection(preserve.vehicleSpecs);
  const nextHasStops = Array.isArray(next.stops) && next.stops.length >= 2;
  const preserveHasStops = Array.isArray(preserve.stops) && preserve.stops.length >= 2;

  return {
    ...next,
    stops: nextHasStops ? next.stops : preserveHasStops ? preserve.stops : next.stops,
    custRef: next.custRef || preserve.custRef,
    coOwners: next.coOwners?.length ? next.coOwners : preserve.coOwners,
    itineraryConfirmed: next.itineraryConfirmed || preserve.itineraryConfirmed,
    itineraryConfirmSnapshot:
      next.itineraryConfirmSnapshot || preserve.itineraryConfirmSnapshot,
    routeSummary: next.routeSummary ?? preserve.routeSummary,
    vehicleSpecs: nextHasVehicles
      ? next.vehicleSpecs
      : preserveHasVehicles
        ? preserve.vehicleSpecs
        : next.vehicleSpecs,
    vehicleSelectionConfirmed: nextHasVehicles
      ? next.vehicleSelectionConfirmed
      : preserveHasVehicles
        ? preserve.vehicleSelectionConfirmed
        : next.vehicleSelectionConfirmed,
  };
}

function applySatLocationsToStops(
  stops: WizardFormValues['stops'],
  locations: LocationItem[],
  geo: SatGeoPending
): { stops: WizardFormValues['stops']; changed: boolean } {
  const active = locations.filter((l) => l.status === 'active');
  if (!active.length || !stops?.length) {
    return { stops, changed: false };
  }

  let changed = false;
  const next = stops.map((stop, index) => {
    if (stop.locationId) return stop;
    const resolved =
      index === 0
        ? resolveStopLocationFromCoords(stop, active, geo.pickupLat, geo.pickupLng)
        : index === 1
          ? resolveStopLocationFromCoords(stop, active, geo.dropoffLat, geo.dropoffLng)
          : stop;
    if (resolved.locationId && resolved.locationId !== stop.locationId) {
      changed = true;
    }
    return resolved;
  });

  return { stops: next, changed };
}

export function useCreateShipmentWizard(showToast: (msg: string, type?: 'success' | 'error' | 'info') => void, t: (key: string) => string) {
  const navigate = useNavigate();
  const stepMatch = useMatch('/shipments/create/step/:stepNumber');
  const [searchParams] = useSearchParams();
  const step = parseStep(stepMatch?.params.stepNumber);
  const { locations, refreshLocationsFromApi } = useApp();
  const { vehicleTypes } = useVehicleTypes();
  const queryClient = useQueryClient();

  const draftUrlId = searchParams.get('id');
  const [shipmentId, setShipmentId] = useState<number | null>(() =>
    draftUrlId ? parseInt(draftUrlId, 10) || null : null
  );
  const [availabilityId, setAvailabilityId] = useState<number | null>(() => {
    const raw = searchParams.get('availability_id');
    return raw && /^\d+$/.test(raw) ? parseInt(raw, 10) : null;
  });
  const [loadId, setLoadId] = useState<string>(() => buildDefaultWizardValues().loadId);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(() => !draftUrlId);
  const [loadedValues, setLoadedValues] = useState<WizardFormValues | null>(null);
  const [stepNavigationError, setStepNavigationError] = useState<string | null>(null);
  const [validationRequest, setValidationRequest] = useState(0);
  /** Bump only when resetting to a blank create — remounts Formik without wiping mid-save. */
  const [formikEpoch, setFormikEpoch] = useState(0);

  const defaultValues = useMemo(() => buildDefaultWizardValues(), []);
  const loadedDraftIdRef = useRef<string | null>(null);
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  const satGeoRef = useRef<SatGeoPending | null>(null);
  const satVehicleRef = useRef<SatVehiclePending | null>(null);
  const satLocationsAppliedRef = useRef(false);
  const satVehicleAppliedRef = useRef(false);

  showToastRef.current = showToast;
  tRef.current = t;

  /**
   * Soft-update draft metadata after saves.
   * Always merge so Step 3 Save Draft cannot wipe Step 1/2 (vehicleSpecs, stops).
   */
  const applyDraftSnapshot = useCallback(
    (
      draft: { id: number; auto_id: string; customer_reference?: string | null; wizard_state?: unknown },
      preservedValues?: WizardFormValues | null
    ) => {
      setShipmentId(draft.id);
      setLoadId(draft.auto_id);
      loadedDraftIdRef.current = String(draft.id);
      setLoadedValues((prev) =>
        mergeDraftSnapshot(draftToFormValues(draft, defaultValues), preservedValues ?? prev)
      );
    },
    [defaultValues]
  );

  const syncUrl = useCallback(
    (nextStep: number, nextId: number | null) => {
      if (!nextId) return;
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
          navigate(buildWizardStepPath(1, null, availabilityId), { replace: true });
        }
        return false;
      }
      setStepNavigationError(null);
      navigate(buildWizardStepPath(nextStep, shipmentId, availabilityId), { replace: true });
      return true;
    },
    [availabilityId, navigate, shipmentId, step]
  );

  useEffect(() => {
    const urlId = searchParams.get('id');
    // Keep an in-progress shipmentId if URL briefly loses ?id= (avoids Formik remount wipe).
    if (!urlId) return;
    const parsed = parseInt(urlId, 10) || null;
    if (parsed) setShipmentId(parsed);
  }, [searchParams]);

  /** Prefill Step 1 from Search Trucks availability proceed payload. */
  useEffect(() => {
    const availParam = searchParams.get('availability_id');
    if (!availParam || draftUrlId) return;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SAT_PREFILL_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as ApiProceedResult;
      if (String(payload.availability_id) !== availParam) return;
      const prefill = payload.prefill;
      if (!prefill) return;

      const pickup = createNewStop(true);
      pickup.locationCity = prefill.pickup_city || '';
      pickup.locationName = prefill.pickup_address || prefill.pickup_city || '';
      if (prefill.start_date_time) {
        const { date, time } = utcToLocalParts(prefill.start_date_time);
        if (date) pickup.dateFrom = date;
        if (time) pickup.timeFrom = time;
      }

      const delivery = createNewStop(true);
      delivery.locationCity = prefill.dropoff_city || '';
      delivery.locationName = prefill.dropoff_address || prefill.dropoff_city || '';

      const geo: SatGeoPending = {
        pickupLat: prefill.pickup_lat,
        pickupLng: prefill.pickup_lng,
        dropoffLat: prefill.dropoff_lat,
        dropoffLng: prefill.dropoff_lng,
      };
      satGeoRef.current = geo;
      satVehicleRef.current = {
        truck_type_id: prefill.truck_type_id ?? null,
        truck_type: prefill.truck_type,
      };
      satLocationsAppliedRef.current = false;
      satVehicleAppliedRef.current = false;

      const { stops: resolvedStops } = applySatLocationsToStops(
        [pickup, delivery],
        locations,
        geo
      );
      if (resolvedStops.some((s) => s.locationId)) {
        satLocationsAppliedRef.current = true;
      }

      const vehicleSpecs =
        buildVehicleSpecsFromPrefill(satVehicleRef.current, vehicleTypes) ??
        defaultValues.vehicleSpecs;
      if (hasVehicleSelection(vehicleSpecs)) {
        satVehicleAppliedRef.current = true;
      }

      setAvailabilityId(Number(payload.availability_id));
      setLoadedValues({
        ...defaultValues,
        stops: resolvedStops,
        targetPrice: prefill.price != null ? String(prefill.price) : '',
        vehicleSpecs,
        vehicleSelectionConfirmed: false,
      });
      setFormikEpoch((n) => n + 1);
      sessionStorage.removeItem(SAT_PREFILL_KEY);
      void refreshLocationsFromApi();
    } catch {
      // ignore invalid prefill
    }
    // Intentionally only on navigation into create with availability_id — not on every locations tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, draftUrlId, defaultValues]);

  /** Prefill Step 1 from ERP Orders Create Load selection. */
  useEffect(() => {
    const erpParam = searchParams.get('erp_orders');
    if (!erpParam || draftUrlId) return;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(ERP_ORDERS_PREFILL_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let cancelled = false;

    (async () => {
      try {
        const payload = JSON.parse(raw) as ErpOrdersPrefillPayload;
        const orderIds = Array.isArray(payload.orderIds)
          ? payload.orderIds.map(String).filter(Boolean)
          : [];
        if (!orderIds.length) {
          sessionStorage.removeItem(ERP_ORDERS_PREFILL_KEY);
          return;
        }

        const details = await Promise.all(
          orderIds.map(async (id) => {
            try {
              return await erpOrdersService.getOrder(id);
            } catch {
              return null;
            }
          })
        );
        if (cancelled) return;

        const orders = details.filter(
          (order): order is ErpOrder =>
            !!order && isOrderEligibleForCreateLoad(order)
        );

        if (!orders.length) {
          showToastRef.current(
            tRef.current('createLoadOrderLoadError') ||
              'Could not load order details.',
            'error'
          );
          sessionStorage.removeItem(ERP_ORDERS_PREFILL_KEY);
          return;
        }

        queryClient.setQueryData<ErpOrder[]>(wizardQueryKeys.unlinkedOrders, (prev) => {
          const list = prev ?? [];
          const next = [...list];
          for (const order of orders) {
            if (!next.some((o) => o.id === order.id)) next.unshift(order);
          }
          return next;
        });

        const stops = buildStopsFromErpOrders(orders, locations);
        setLoadedValues({
          ...defaultValues,
          stops,
        });
        setFormikEpoch((n) => n + 1);
        sessionStorage.removeItem(ERP_ORDERS_PREFILL_KEY);
        void refreshLocationsFromApi();
      } catch {
        if (!cancelled) {
          showToastRef.current(
            tRef.current('createLoadOrderLoadError') ||
              'Could not load order details.',
            'error'
          );
          try {
            sessionStorage.removeItem(ERP_ORDERS_PREFILL_KEY);
          } catch {
            // ignore
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only on navigation into create with erp_orders — not on every locations tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, draftUrlId, defaultValues]);

  /** Late AddressBook hydrate: bind locationId once coords matches appear. */
  useEffect(() => {
    if (!availabilityId || draftUrlId || satLocationsAppliedRef.current) return;
    const geo = satGeoRef.current;
    if (!geo) return;
    if (!locations.some((l) => l.status === 'active')) return;

    let changed = false;
    setLoadedValues((prev) => {
      if (!prev?.stops?.length) return prev;
      const resolved = applySatLocationsToStops(prev.stops, locations, geo);
      if (!resolved.changed) return prev;
      changed = true;
      satLocationsAppliedRef.current = true;
      return { ...prev, stops: resolved.stops };
    });
    if (changed) {
      setFormikEpoch((n) => n + 1);
    }
  }, [availabilityId, draftUrlId, locations]);

  /** Late vehicle catalog: seed Step 2 vehicleSpecs from proceed truck_type_id / name. */
  useEffect(() => {
    if (!availabilityId || draftUrlId || satVehicleAppliedRef.current) return;
    const pending = satVehicleRef.current;
    if (!pending || !vehicleTypes.length) return;

    const specs = buildVehicleSpecsFromPrefill(pending, vehicleTypes);
    if (!specs) {
      satVehicleAppliedRef.current = true;
      return;
    }

    let changed = false;
    setLoadedValues((prev) => {
      if (!prev) return prev;
      if (hasVehicleSelection(prev.vehicleSpecs)) {
        satVehicleAppliedRef.current = true;
        return prev;
      }
      changed = true;
      satVehicleAppliedRef.current = true;
      return { ...prev, vehicleSpecs: specs, vehicleSelectionConfirmed: false };
    });
    if (changed) {
      setFormikEpoch((n) => n + 1);
    }
  }, [availabilityId, draftUrlId, vehicleTypes]);

  useEffect(() => {
    if (!draftUrlId) {
      const leavingDraft = loadedDraftIdRef.current != null;
      loadedDraftIdRef.current = null;
      setDraftLoaded(true);
      // Do not clear loadedValues when arriving from availability prefill.
      if (leavingDraft) {
        setLoadedValues(null);
        setShipmentId(null);
        const availStillInUrl = searchParams.get('availability_id');
        if (!availStillInUrl) {
          setAvailabilityId(null);
        }
        setFormikEpoch((n) => n + 1);
      }
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
        const stateAvail = draft.wizard_state?.availability_id;
        if (typeof stateAvail === 'number' && stateAvail > 0) {
          setAvailabilityId(stateAvail);
        } else {
          setAvailabilityId(null);
        }
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
        navigate(buildWizardStepPath(1, null, availabilityId), { replace: true });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [draftUrlId, defaultValues, navigate, searchParams]);

  const ensureDraftId = useCallback(async (): Promise<number> => {
    if (shipmentId) return shipmentId;
    const draft = await createShipmentService.createDraft(
      availabilityId ? { availability_id: availabilityId } : undefined
    );
    // Do not hydrate Formik from an empty create — live form state must stay intact.
    setShipmentId(draft.id);
    setLoadId(draft.auto_id);
    loadedDraftIdRef.current = String(draft.id);
    navigate(buildWizardStepPath(step, draft.id), { replace: true });
    return draft.id;
  }, [availabilityId, navigate, shipmentId, step]);

  const saveStep1 = useCallback(
    async (values: WizardFormValues, mode: 'partial' | 'complete') => {
      setIsSaving(true);
      try {
        const id = await ensureDraftId();
        const payload = formValuesToStepOnePayload(values, mode, availabilityId);
        const draft = await createShipmentService.saveStepOne(id, payload);
        applyDraftSnapshot(draft, values);
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
    [applyDraftSnapshot, availabilityId, ensureDraftId, showToast, syncUrl, t]
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
        const valuesWithRoute = {
          ...values,
          routeSummary: routeSummary ?? values.routeSummary,
        };
        const payload = formValuesToStepTwoPayload(
          {
            itineraryConfirmed: valuesWithRoute.itineraryConfirmed,
            itineraryConfirmSnapshot: valuesWithRoute.itineraryConfirmSnapshot,
            routeSummary: valuesWithRoute.routeSummary,
            vehicleSpecs: valuesWithRoute.vehicleSpecs,
            vehicleSelectionConfirmed: valuesWithRoute.vehicleSelectionConfirmed,
          },
          mode
        );
        const draft = await createShipmentService.saveStepTwo(id, payload);
        applyDraftSnapshot(draft, valuesWithRoute);
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
    [applyDraftSnapshot, ensureDraftId, showToast, syncUrl, t]
  );

  const saveStep3 = useCallback(
    async (values: WizardFormValues, mode: 'partial' | 'complete') => {
      if (mode === 'complete') {
        const rawPrice = String(values.targetPrice ?? '').trim();
        if (rawPrice !== '') {
          const price = parseFloat(rawPrice);
          if (Number.isNaN(price) || price < 0) {
            showToast(t('priceMinZero') || 'Price must be greater than or equal to 0.', 'error');
            throw new Error('Invalid price');
          }
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
        // Preserve Step 1/2 vehicle + stops from the live form (never wipe on Step 3 save).
        applyDraftSnapshot(draft, values);
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
    [applyDraftSnapshot, ensureDraftId, showToast, syncUrl, t]
  );

  const publishShipment = useCallback(
    async (values: WizardFormValues) => {
      const rawPrice = String(values.targetPrice ?? '').trim();
      if (rawPrice !== '') {
        const price = parseFloat(rawPrice);
        if (Number.isNaN(price) || price < 0) {
          showToast(t('priceMinZero') || 'Price must be greater than or equal to 0.', 'error');
          throw new Error('Invalid price');
        }
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
    availabilityId,
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
    formikEpoch,
  };
}
