import React, { useEffect } from 'react';
import { useFormikContext } from 'formik';
import { useOutletContext } from 'react-router-dom';
import { Step2Itinerary } from '../../../components/CreateShipmentWizard/Step2Itinerary';
import type { WizardFormValues } from '../../../api/mappers/createShipmentMapper';
import type { WizardOutletContext } from '../wizardOutletContext';

export const CreateShipmentStep2Page: React.FC = () => {
  const { values, setFieldValue } = useFormikContext<WizardFormValues>();
  const {
    isSaving,
    goToStep,
    saveStep2,
    resetItineraryConfirmationRef,
    isEditMode,
    editDiff,
    editDiffLoading,
    compareView,
    setCompareView,
    refreshEditDiff,
    discardEditAndLeave,
  } = useOutletContext<WizardOutletContext>();

  useEffect(() => {
    if (!isEditMode) return;
    if (editDiff || editDiffLoading) return;
    void refreshEditDiff();
  }, [editDiff, editDiffLoading, isEditMode, refreshEditDiff]);

  return (
    <Step2Itinerary
      onBackStep={() => {
        resetItineraryConfirmationRef.current?.();
        setCompareView('updated');
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
        setCompareView('updated');
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
      onKeepOldItinerary={async () => {
        await discardEditAndLeave();
      }}
      isSaving={isSaving}
      isEditMode={isEditMode}
      compareView={compareView}
      onCompareViewChange={setCompareView}
      editDiff={editDiff}
      editDiffLoading={editDiffLoading}
    />
  );
};

export default CreateShipmentStep2Page;
