import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { Shipment } from '../../context/AppContext';
import { Step1Details } from '../../components/CreateShipmentWizard/Step1Details';
import { Step2Itinerary } from '../../components/CreateShipmentWizard/Step2Itinerary';
import { Step3Pricing } from '../../components/CreateShipmentWizard/Step3Pricing';
import { useCreateShipmentWizard } from './hooks/useCreateShipmentWizard';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import { scrollToValidationAnchor } from '../../components/CreateShipmentWizard/validation';
import { Step1DetailsSkeleton } from '../../components/skeletons/Step1DetailsSkeleton';
import { Step2ItinerarySkeleton } from '../../components/skeletons/Step2ItinerarySkeleton';
import './CreateShipmentWizard.css';

const validationSchema = Yup.object().shape({
  custRef: Yup.string().optional(),
  stops: Yup.array().of(
    Yup.object().shape({
      locationId: Yup.string().required('Location is required'),
      dateFrom: Yup.string().required('Date is required'),
      lines: Yup.array().of(
        Yup.object().shape({
          productId: Yup.string().required('Product is required'),
          qty: Yup.number().positive('Qty must be positive').required('Required'),
          weight: Yup.number().positive('Weight must be positive').required('Required'),
        })
      ).min(1, 'At least one cargo line is required'),
    })
  ).min(2, 'At least two stops are required'),
  targetPrice: Yup.number().positive('Price must be positive').required('Price is required'),
});

export const CreateShipmentWizard: React.FC = () => {
  const { t } = useTranslation();
  const { locations, addShipment, showToast, refreshLocationsFromApi } = useApp();
  const navigate = useNavigate();
  const locationState = useLocation().state as { prefillLocationId?: string } | null;

  const {
    step,
    loadId,
    isLoading,
    isSaving,
    draftLoaded,
    loadedValues,
    defaultValues,
    goToStep,
    saveStep1,
    saveStep2,
    stepNavigationError,
    validationRequest,
  } = useCreateShipmentWizard(showToast, t);

  const stepNavBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshLocationsFromApi();
  }, [refreshLocationsFromApi]);

  const initialValues = useMemo(() => {
    const base = loadedValues ?? defaultValues;
    return { ...base, loadId: loadId || base.loadId };
  }, [defaultValues, loadedValues, loadId]);

  const handleConfirmWizard = (values: WizardFormValues, { setSubmitting }: { setSubmitting: (v: boolean) => void }) => {
    const stops = values.stops;
    const originLoc = locations.find((l) => l.id === stops[0].locationId);
    const destLoc = locations.find((l) => l.id === stops[stops.length - 1].locationId);

    const customersMap = stops.flatMap((s) =>
      s.lines?.map((l) => ({
        name: l.customerName || 'Direct Customer',
        orders: l.orderId ? [l.orderId] : [],
      })) ?? []
    );

    const finalCustomers: { name: string; orders: string[] }[] = [];
    customersMap.forEach((c) => {
      const existing = finalCustomers.find((fc) => fc.name === c.name);
      if (existing) {
        c.orders.forEach((o) => {
          if (!existing.orders.includes(o)) existing.orders.push(o);
        });
      } else {
        finalCustomers.push({ name: c.name, orders: [...c.orders] });
      }
    });

    const payload: Shipment = {
      id: values.loadId,
      date: stops[0].dateFrom
        ? new Date(stops[0].dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'pending',
      vis: values.broadcastType,
      origin: originLoc ? originLoc.city : 'Unknown',
      dest: destLoc ? destLoc.city : 'Unknown',
      via:
        stops.length > 2
          ? stops
              .slice(1, -1)
              .map((s) => locations.find((l) => l.id === s.locationId)?.city || s.locationCity)
              .filter(Boolean)
              .join(', ')
          : null,
      customer: finalCustomers,
      bids: 0,
      best_bid: null,
      bid_exp: values.broadcastType === 'public' ? '12h' : null,
      carrier: values.selectedCarriers.length > 0 ? values.selectedCarriers[0] : null,
      price: Number(values.targetPrice),
      price_type: values.broadcastType === 'public' ? 'spot' : 'contract',
      updated: 'Just now',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 1,
      stops: stops.map((s, idx) => ({
        id: idx + 1,
        type: idx === 0 ? ('pickup' as const) : ('delivery' as const),
        location: s.locationId || '',
        address: s.locationCity ? `${s.locationCity}, Greece` : '',
        date: s.dateFrom || '',
        timeStart: s.timeFrom || '08:00',
        timeEnd: s.timeTo || '18:00',
        customers:
          s.lines?.filter((l) => l.productId).map((l) => ({
            name: l.customerName || 'Direct Customer',
            orders: [
              {
                id: l.orderId || l.orderRef || `ORD-${Date.now()}`,
                products: l.productName || 'General Cargo',
                qty: Number(l.qty) || 0,
                qtyUnit: l.unit || 'Pallets',
                weight: Number(l.weight) || 0,
                weightUnit: l.wtUnit || 'kg',
              },
            ],
          })) ?? [],
      })),
      driverNotes: values.driverNotes,
      negotiable: true,
    };

    addShipment(payload);
    showToast(t('shipmentCreatedSuccess') || 'Shipment created successfully!', 'success');
    setSubmitting(false);
    navigate('/shipments');
  };

  const handleStepClick = (targetStep: number) => {
    const requireId = targetStep >= 2;
    const moved = goToStep(targetStep, requireId ? { requireId: true } : undefined);
    if (!moved) {
      window.requestAnimationFrame(() => {
        stepNavBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrollToValidationAnchor('wizard-step-nav', { focus: false, highlightClass: 'wizard-validation-flash' });
      });
    }
  };

  useEffect(() => {
    if (stepNavigationError) {
      window.requestAnimationFrame(() => {
        stepNavBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [stepNavigationError, validationRequest]);

  if (isLoading || !draftLoaded) {
    return (
      <div className="animate-fade-in pt-5 px-7">
        <div className="ph" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
              {step === 1 && (t('step1Title') || 'Create Load')}
              {step === 2 && (t('step2Title') || 'Review Itinerary & Stats')}
              {step === 3 && (t('vehicleAndPricing') || 'Vehicle & Pricing options')}
            </h1>
            <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {step === 1 && (t('step1Sub') || 'Add stops and cargo details')}
              {step === 2 && (t('step2Sub') || 'Verify drive limits, weather warnings, and cargo balance.')}
              {step === 3 && (t('vehiclePricingSub') || 'Choose vehicle type, target price, and tracking options.')}
            </p>
          </div>
        </div>

        <nav className="stepper" aria-label="Progress steps">
          <div className={`step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`}>
            <div className="sn">{step > 1 ? '✓' : '1'}</div>
            <span>Details</span>
          </div>
          <div className={`sl ${step > 1 ? 'done' : ''}`} />

          <div className={`step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`}>
            <div className="sn">{step > 2 ? '✓' : '2'}</div>
            <span>Itinerary</span>
          </div>
          <div className={`sl ${step > 2 ? 'done' : ''}`} />

          <div className={`step ${step === 3 ? 'act' : ''}`}>
            <div className="sn">3</div>
            <span>Vehicle & Pricing</span>
          </div>
        </nav>

        <div className="content" style={{ paddingBottom: '120px' }}>
          {step === 1 ? (
            <Step1DetailsSkeleton />
          ) : step === 2 ? (
            <Step2ItinerarySkeleton />
          ) : (
            <div className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
              {t('loading') || 'Loading...'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pt-5 px-7">
      <div className="ph" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
            {step === 1 && (t('step1Title') || 'Create Load')}
            {step === 2 && (t('step2Title') || 'Review Itinerary & Stats')}
            {step === 3 && (t('vehicleAndPricing') || 'Vehicle & Pricing options')}
          </h1>
          <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {step === 1 && (t('step1Sub') || 'Add stops and cargo details')}
            {step === 2 && (t('step2Sub') || 'Verify drive limits, weather warnings, and cargo balance.')}
            {step === 3 && (t('vehiclePricingSub') || 'Choose vehicle type, target price, and tracking options.')}
          </p>
        </div>
      </div>

      <nav className="stepper" aria-label="Progress steps">
        <div className={`step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => handleStepClick(1)}>
          <div className="sn">{step > 1 ? '✓' : '1'}</div>
          <span>Details</span>
        </div>
        <div className={`sl ${step > 1 ? 'done' : ''}`} />

        <div className={`step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => handleStepClick(2)}>
          <div className="sn">{step > 2 ? '✓' : '2'}</div>
          <span>Itinerary</span>
        </div>
        <div className={`sl ${step > 2 ? 'done' : ''}`} />

        <div className={`step ${step === 3 ? 'act' : ''}`} onClick={() => handleStepClick(3)}>
          <div className="sn">3</div>
          <span>Vehicle & Pricing</span>
        </div>
      </nav>

      {stepNavigationError && (
        <div
          ref={stepNavBannerRef}
          className="wizard-validation-banner"
          role="alert"
          data-validation-anchor="wizard-step-nav"
        >
          {t(stepNavigationError)}
        </div>
      )}

      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={handleConfirmWizard}
      >
        {({ values, submitForm, setFieldValue }) => (
          <Form>
            <div className="content" style={{ paddingBottom: '120px' }}>
              {step === 1 && (
                <Step1Details
                  onSaveDraft={async () => {
                    await saveStep1(values, 'partial');
                  }}
                  onContinue={async () => {
                    await saveStep1(values, 'complete');
                  }}
                  isSaving={isSaving}
                  validationRequest={validationRequest}
                />
              )}
              {step === 2 && (
                <Step2Itinerary
                  onBackStep={() => {
                    setFieldValue('itineraryConfirmed', false);
                    goToStep(1);
                  }}
                  onContinue={async (routeSummary) => {
                    setFieldValue('routeSummary', routeSummary);
                    await saveStep2(
                      {
                        ...values,
                        routeSummary,
                        itineraryConfirmed: values.itineraryConfirmed,
                        vehicleSpecs: values.vehicleSpecs,
                        vehicleSelectionConfirmed: values.vehicleSelectionConfirmed,
                      },
                      'complete',
                      routeSummary
                    );
                  }}
                  isSaving={isSaving}
                />
              )}
              {step === 3 && <Step3Pricing onBackStep={() => goToStep(2)} onSubmit={submitForm} />}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateShipmentWizard;
