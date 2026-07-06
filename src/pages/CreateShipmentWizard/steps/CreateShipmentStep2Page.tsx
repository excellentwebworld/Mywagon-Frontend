import React from 'react';
import { useFormikContext } from 'formik';
import { useOutletContext } from 'react-router-dom';
import { Step2Itinerary } from '../../../components/CreateShipmentWizard/Step2Itinerary';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from '../wizardOutletContext';

export const CreateShipmentStep2Page: React.FC = () => {
  const { values, setFieldValue } = useFormikContext<WizardFormValues>();
  const { isSaving, goToStep, saveStep2, resetItineraryConfirmationRef } =
    useOutletContext<WizardOutletContext>();

  return (
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
  );
};

export default CreateShipmentStep2Page;
