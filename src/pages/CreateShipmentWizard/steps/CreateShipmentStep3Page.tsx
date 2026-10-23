import React from 'react';
import { useFormikContext } from 'formik';
import { useOutletContext } from 'react-router-dom';
import { Step3Pricing } from '../../../components/CreateShipmentWizard/Step3Pricing';
import {
  rememberStep3Values,
  requestVehicleSelectorFocus,
} from '../../../components/CreateShipmentWizard/wizardCarry';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from '../wizardOutletContext';

export const CreateShipmentStep3Page: React.FC = () => {
  const { submitForm, values } = useFormikContext<WizardFormValues>();
  const { shipmentId, isSaving, goToStep, saveStep3, isEditMode, editShipmentStatus } =
    useOutletContext<WizardOutletContext>();

  return (
    <Step3Pricing
      draftId={shipmentId}
      isEditMode={isEditMode}
      editShipmentStatus={editShipmentStatus}
      onBackStep={() => {
        rememberStep3Values(shipmentId, isEditMode, values);
        goToStep(2);
      }}
      onGoToVehicleStep={() => {
        rememberStep3Values(shipmentId, isEditMode, values);
        requestVehicleSelectorFocus();
        goToStep(2);
      }}
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
