import React from 'react';

const STEPS = ['Context', 'Address', 'Operations', 'Review'] as const;

interface ModalStepperProps {
  currentStep: number;
}

export const ModalStepper: React.FC<ModalStepperProps> = ({ currentStep }) => (
  <div className="modal-stepper">
    {STEPS.map((stepName, i) => {
      const stepNum = i + 1;
      return (
        <React.Fragment key={stepName}>
          <div className={`ms-step ${stepNum === currentStep ? 'active' : ''} ${stepNum < currentStep ? 'done' : ''}`}>
            <div className="ms-num">{stepNum}</div>
            <span>{stepName}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`ms-line ${stepNum < currentStep ? 'done' : ''}`} />}
        </React.Fragment>
      );
    })}
  </div>
);
