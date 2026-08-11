import React from 'react';
import { HelpCircle } from 'lucide-react';

interface NeedHelpCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  onContactSupport: () => void;
}

export const NeedHelpCard: React.FC<NeedHelpCardProps> = ({
  title,
  description,
  buttonLabel,
  onContactSupport,
}) => {
  return (
    <div className="tut-need-help-wrap">
      <div className="tut-need-help-card">
        <h5>
          <HelpCircle size={14} aria-hidden />
          {title}
        </h5>
        <p>{description}</p>
        <button type="button" className="tut-btn-support" onClick={onContactSupport}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};
