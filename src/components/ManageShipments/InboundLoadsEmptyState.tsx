import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const InboundLoadsEmptyState: React.FC<Props> = ({ t }) => {
  return (
    <div className="inbound-empty">
      <div className="inbound-empty-icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7h13l5 5v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
          <path d="M16 7v5h5" />
          <path d="M7 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
        </svg>
      </div>
      <h2 className="inbound-empty-title">{t('inboundEmptyTitle')}</h2>
      <p className="inbound-empty-body">{t('inboundEmptyBody')}</p>
      <Link to="/partners" className="inbound-empty-link">
        {t('navPartners') || t('partners') || 'Partners'}
      </Link>
    </div>
  );
};
