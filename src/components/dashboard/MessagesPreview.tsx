import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export const MessagesPreview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{t('dashMessagesTitle')}</span>
        </h3>
        <span className="card-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/messages')}>
          {t('dashViewMessages')}
        </span>
      </div>
      <div className="dash-messages-empty">
        <p>{t('dashNoMessages')}</p>
      </div>
    </div>
  );
};
