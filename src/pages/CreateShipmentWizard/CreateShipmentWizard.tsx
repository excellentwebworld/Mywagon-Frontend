import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Step1Details } from '../../components/CreateShipmentWizard/Step1Details';
import { Step2Itinerary } from '../../components/CreateShipmentWizard/Step2Itinerary';
import { Step3Pricing } from '../../components/CreateShipmentWizard/Step3Pricing';
import { useCreateShipmentWizard } from './hooks/useCreateShipmentWizard';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import { scrollToValidationAnchor } from '../../components/CreateShipmentWizard/validation';
import { Step1DetailsSkeleton } from '../../components/skeletons/Step1DetailsSkeleton';
import { Step2ItinerarySkeleton } from '../../components/skeletons/Step2ItinerarySkeleton';
import { Step3PricingSkeleton } from '../../components/skeletons/Step3PricingSkeleton';
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
  const { showToast, refreshLocationsFromApi } = useApp();
  const navigate = useNavigate();
  const locationState = useLocation().state as { prefillLocationId?: string } | null;

  const {
    step,
    shipmentId,
    loadId,
    isLoading,
    isSaving,
    draftLoaded,
    loadedValues,
    defaultValues,
    goToStep,
    saveStep1,
    saveStep2,
    saveStep3,
    publishShipment,
    stepNavigationError,
    validationRequest,
  } = useCreateShipmentWizard(showToast, t);

  const stepNavBannerRef = useRef<HTMLDivElement>(null);
  const resetItineraryConfirmationRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    refreshLocationsFromApi();
  }, [refreshLocationsFromApi]);

  const initialValues = useMemo(() => {
    const base = loadedValues ?? defaultValues;
    return { ...base, loadId: loadId || base.loadId };
  }, [defaultValues, loadedValues, loadId]);

  const handleConfirmWizard = async (
    values: WizardFormValues,
    { setSubmitting }: { setSubmitting: (v: boolean) => void }
  ) => {
    try {
      const published = await publishShipment(values);
      setSubmitting(false);
      navigate(`/shipments/${published.id}`);
    } catch {
      setSubmitting(false);
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === 1) {
      resetItineraryConfirmationRef.current?.();
    }
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
              {step === 2 && (t('step2Sub') || 'Review your stops and itinerary before proceeding.')}
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
            <Step3PricingSkeleton />
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
            {step === 2 && (t('step2Sub') || 'Review your stops and itinerary before proceeding.')}
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
        {({ values, submitForm, setFieldValue }) => {
          resetItineraryConfirmationRef.current = () => {
            setFieldValue('itineraryConfirmed', false);
            setFieldValue('itineraryConfirmSnapshot', '');
          };

          return (
          <Form>
            <div className="content" style={{ paddingBottom: '120px' }}>
              {step === 1 && (
                <Step1Details
                  onSaveDraft={async () => {
                    resetItineraryConfirmationRef.current?.();
                    await saveStep1(
                      {
                        ...values,
                        itineraryConfirmed: false,
                        itineraryConfirmSnapshot: '',
                      },
                      'partial'
                    );
                  }}
                  onContinue={async () => {
                    resetItineraryConfirmationRef.current?.();
                    await saveStep1(
                      {
                        ...values,
                        itineraryConfirmed: false,
                        itineraryConfirmSnapshot: '',
                      },
                      'complete'
                    );
                  }}
                  isSaving={isSaving}
                  validationRequest={validationRequest}
                />
              )}
              {step === 2 && (
                <Step2Itinerary
                  onBackStep={() => {
                    resetItineraryConfirmationRef.current?.();
                    goToStep(1);
                  }}
                  onSaveDraft={async () => {
                    await saveStep2(
                      {
                        ...values,
                        itineraryConfirmed: values.itineraryConfirmed,
                        itineraryConfirmSnapshot: values.itineraryConfirmSnapshot,
                        vehicleSpecs: values.vehicleSpecs,
                        vehicleSelectionConfirmed: values.vehicleSelectionConfirmed,
                      },
                      'partial',
                      values.routeSummary ?? undefined
                    );
                  }}
                  onContinue={async (routeSummary) => {
                    setFieldValue('routeSummary', routeSummary);
                    await saveStep2(
                      {
                        ...values,
                        routeSummary,
                        itineraryConfirmed: values.itineraryConfirmed,
                        itineraryConfirmSnapshot: values.itineraryConfirmSnapshot,
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
              {step === 3 && (
                <Step3Pricing
                  draftId={shipmentId}
                  onBackStep={() => goToStep(2)}
                  onSubmit={submitForm}
                  onSaveDraft={async () => {
                    try {
                      await saveStep3(values, 'partial');
                    } catch {
                      // saveStep3 already toasts errors
                    }
                  }}
                  isSaving={isSaving}
                />
              )}
            </div>
          </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default CreateShipmentWizard;
