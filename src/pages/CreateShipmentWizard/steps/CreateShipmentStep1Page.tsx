import React, { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import { useOutletContext } from 'react-router-dom';
import { Step1Details } from '../../../components/CreateShipmentWizard/Step1Details';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from '../wizardOutletContext';

export const CreateShipmentStep1Page: React.FC = () => {
  const { values } = useFormikContext<WizardFormValues>();
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const {
    isSaving,
    validationRequest,
    saveStep1,
    resetItineraryConfirmationRef,
    lockedStopIds,
    isEditMode,
    editShipmentStatus,
  } = useOutletContext<WizardOutletContext>();

  return (
    <Step1Details
      lockedStopIds={lockedStopIds}
      isEditMode={isEditMode}
      editShipmentStatus={editShipmentStatus}
      onSaveDraft={async () => {
        resetItineraryConfirmationRef.current?.();
        const latest = valuesRef.current;
        await saveStep1(
          {
            ...latest,
            itineraryConfirmed: false,
            itineraryConfirmSnapshot: '',
          },
          'partial'
        );
      }}
      onContinue={async () => {
        resetItineraryConfirmationRef.current?.();
        // Always save the latest Formik values (avoids stale date after rapid picker changes).
        const latest = valuesRef.current;
        await saveStep1(
          {
            ...latest,
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
