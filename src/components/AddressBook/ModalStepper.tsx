import React from 'react';

const DEFAULT_STEPS = ['Context', 'Address', 'Operations', 'Review'] as const;

interface ModalStepperProps {
  currentStep: number;
  steps?: readonly string[];
}

export const ModalStepper: React.FC<ModalStepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
}) => (
  <div className="modal-stepper">
    {steps.map((stepName, i) => {
      const stepNum = i + 1;
      const isDone = stepNum < currentStep;
      const isActive = stepNum === currentStep;
      return (
        <React.Fragment key={stepName}>
          <div className={`ms-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
            <div className="ms-num">{isDone ? '✓' : stepNum}</div>
            <span>{stepName}</span>
          </div>
          {i < steps.length - 1 && <div className={`ms-line ${isDone ? 'done' : ''}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

export const EDIT_MODAL_STEPS = ['Type', 'Address', 'Operations', 'Review'] as const;
