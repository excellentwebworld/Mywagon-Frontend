import React, { useEffect, useMemo, useRef } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { scrollToValidationAnchor } from '../../components/CreateShipmentWizard/validation';
import { Step1DetailsSkeleton } from '../../components/skeletons/Step1DetailsSkeleton';
import { Step2ItinerarySkeleton } from '../../components/skeletons/Step2ItinerarySkeleton';
import { Step3PricingSkeleton } from '../../components/skeletons/Step3PricingSkeleton';
import { useCreateShipmentWizard } from './hooks/useCreateShipmentWizard';
import { useWizardMasterData } from './hooks/useWizardMasterData';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from './wizardOutletContext';
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

function stepTitle(step: number, t: (key: string) => string) {
  if (step === 2) return t('step2Title') || 'Review Itinerary & Stats';
  if (step === 3) return t('vehicleAndPricing') || 'Vehicle & Pricing options';
  return t('step1Title') || 'Create Load';
}

function stepSubtitle(step: number, t: (key: string) => string) {
  if (step === 2) return t('step2Sub') || 'Review your stops and itinerary before proceeding.';
  if (step === 3) return t('vehiclePricingSub') || 'Choose vehicle type, target price, and tracking options.';
  return t('step1Sub') || 'Add stops and cargo details';
}

function StepSkeleton({ step }: { step: number }) {
  if (step === 2) return <Step2ItinerarySkeleton />;
  if (step === 3) return <Step3PricingSkeleton />;
  return <Step1DetailsSkeleton />;
}

export const CreateShipmentWizardLayout: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const stepNavBannerRef = useRef<HTMLDivElement>(null);
  const resetItineraryConfirmationRef = useRef<(() => void) | null>(null);

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
    formikEpoch,
  } = useCreateShipmentWizard(showToast, t);

  useWizardMasterData();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const legacyStep = params.get('step');
    if (!legacyStep || location.pathname.includes('/step/')) return;

    const id = params.get('id');
    params.delete('step');
    const remaining = params.toString();
    const suffix = remaining ? `?${remaining}` : '';
    navigate(`/shipments/create/step/${legacyStep}${suffix}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

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

  const outletContext: WizardOutletContext = useMemo(
    () => ({
      shipmentId,
      isSaving,
      validationRequest,
      goToStep,
      saveStep1,
      saveStep2,
      saveStep3,
      resetItineraryConfirmationRef,
    }),
    [shipmentId, isSaving, validationRequest, goToStep, saveStep1, saveStep2, saveStep3]
  );

  const header = (
    <>
      <div className="ph" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="ph-t" style={{ fontSize: '24px', fontWeight: 700 }}>
            {stepTitle(step, t)}
          </h1>
          <p className="ph-s" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {stepSubtitle(step, t)}
          </p>
        </div>
      </div>

      <nav className="stepper" aria-label="Progress steps">
        <div
          className={`step ${step === 1 ? 'act' : ''} ${step > 1 ? 'done' : ''}`}
          onClick={() => handleStepClick(1)}
        >
          <div className="sn">{step > 1 ? '✓' : '1'}</div>
          <span>Details</span>
        </div>
        <div className={`sl ${step > 1 ? 'done' : ''}`} />

        <div
          className={`step ${step === 2 ? 'act' : ''} ${step > 2 ? 'done' : ''}`}
          onClick={() => handleStepClick(2)}
        >
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
    </>
  );

  if (isLoading || !draftLoaded) {
    return (
      <div className={`animate-fade-in pt-5 px-7${step === 3 ? ' wizard-shell wizard-shell--step3' : ''}`}>
        {header}
        <div className="content" style={{ paddingBottom: step === 3 ? undefined : '120px' }}>
          <StepSkeleton step={step} />
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in pt-5 px-7${step === 3 ? ' wizard-shell wizard-shell--step3' : ''}`}>
      {header}

      <Formik
        // Epoch bumps only on intentional draft switch / fresh create — never on Save Draft.
        key={`create-shipment-formik-${formikEpoch}`}
        initialValues={initialValues}
        enableReinitialize={false}
        validationSchema={validationSchema}
        onSubmit={handleConfirmWizard}
      >
        {({ setFieldValue }) => {
          resetItineraryConfirmationRef.current = () => {
            setFieldValue('itineraryConfirmed', false);
            setFieldValue('itineraryConfirmSnapshot', '');
          };

          return (
            <Form className={step === 3 ? 'wizard-shell-form' : undefined}>
              <div
                className="content"
                style={{ paddingBottom: step === 3 ? undefined : '120px' }}
              >
                <Outlet context={outletContext} />
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default CreateShipmentWizardLayout;
