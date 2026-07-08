import React from 'react';
import { useFormikContext } from 'formik';
import { useOutletContext } from 'react-router-dom';
import { Step3Pricing } from '../../../components/CreateShipmentWizard/Step3Pricing';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from '../wizardOutletContext';

export const CreateShipmentStep3Page: React.FC = () => {
  const { submitForm } = useFormikContext<WizardFormValues>();
  const { shipmentId, isSaving, goToStep, saveStep3 } = useOutletContext<WizardOutletContext>();

  return (
    <Step3Pricing
      draftId={shipmentId}
      onBackStep={() => goToStep(2)}
      onSubmit={submitForm}
      onSaveDraft={async (currentValues) => {
        try {
          await saveStep3(currentValues, 'partial');
        } catch {
          // saveStep3 already toasts errors
        }
      }}
      isSaving={isSaving}
    />
  );
};

export default CreateShipmentStep3Page;
