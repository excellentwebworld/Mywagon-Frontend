import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export const TruckAvailabilitiesCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="card dash-truck-card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <path d="M16 8h4l3 5v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>{t('dashTruckAvailTitle')}</span>
        </h3>
        <span className="card-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/search-trucks')}>
          {t('dashSearchTrucks')}
        </span>
      </div>
      <div className="dash-truck-counts">
        <div className="dash-truck-count">
          <div className="dash-truck-count-val">—</div>
          <div className="dash-truck-count-label">{t('dashPartnerTrucks')}</div>
        </div>
        <div className="dash-truck-count">
          <div className="dash-truck-count-val">—</div>
          <div className="dash-truck-count-label">{t('dashPublicTrucks')}</div>
        </div>
      </div>
      <div className="dash-truck-map-preview">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
        <span>{t('dashTruckMapPreview')}</span>
      </div>
    </div>
  );
};
