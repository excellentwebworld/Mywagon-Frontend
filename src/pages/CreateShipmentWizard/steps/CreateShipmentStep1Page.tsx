import React from 'react';
import { useFormikContext } from 'formik';
import { useOutletContext } from 'react-router-dom';
import { Step1Details } from '../../../components/CreateShipmentWizard/Step1Details';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from '../wizardOutletContext';

export const CreateShipmentStep1Page: React.FC = () => {
  const { values } = useFormikContext<WizardFormValues>();
  const { isSaving, validationRequest, saveStep1, resetItineraryConfirmationRef } =
    useOutletContext<WizardOutletContext>();

  return (
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
  );
};

export default CreateShipmentStep1Page;
