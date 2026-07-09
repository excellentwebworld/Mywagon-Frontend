import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const DEFAULT_STEPS = ['Context', 'Address', 'Operations', 'Review'] as const;

interface ModalStepperProps {
  currentStep: number;
  steps?: readonly string[];
}

export const ModalStepper: React.FC<ModalStepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
}) => {
  const { t } = useTranslation();

  const getStepTranslation = (name: string) => {
    switch (name) {
      case 'Context': return t('abStepContext');
      case 'Address': return t('abStepAddress');
      case 'Operations': return t('abStepOperations');
      case 'Review': return t('abStepReview');
      case 'Type': return t('abStepType');
      default: return name;
    }
  };

  return (
    <div className="modal-stepper">
      {steps.map((stepName, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <React.Fragment key={stepName}>
            <div className={`ms-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
              <div className="ms-num">{isDone ? '✓' : stepNum}</div>
              <span>{getStepTranslation(stepName)}</span>
            </div>
            {i < steps.length - 1 && <div className={`ms-line ${isDone ? 'done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const EDIT_MODAL_STEPS = ['Context', 'Address', 'Operations', 'Review'] as const;
