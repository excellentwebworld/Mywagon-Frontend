import React from 'react';
import { ArrowRight, HelpCircle, MessageCircle } from 'lucide-react';

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
        <div className="tut-need-help-copy">
          <h5>
            <HelpCircle size={16} aria-hidden />
            {title}
          </h5>
          <p>{description}</p>
        </div>
        <button type="button" className="tut-btn-support" onClick={onContactSupport}>
          <MessageCircle size={16} aria-hidden />
          {buttonLabel}
          <ArrowRight size={14} className="tut-btn-support-arrow" aria-hidden />
        </button>
      </div>
    </div>
  );
};
