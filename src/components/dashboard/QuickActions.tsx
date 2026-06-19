import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

export const QuickActions: React.FC = () => {
  const { shipments, showToast } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const pendingBids = shipments.filter(s => s.status === 'pending').length;

  return (
    <div className="quick-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      <div className="qa-card primary" onClick={() => navigate('/shipments/create')} style={{ flex: 1, cursor: 'pointer' }}>
        <div className="qa-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>📦</div>
        <div>
          <div className="qa-label" style={{ fontWeight: 600 }}>{t('qaNewShipment')}</div>
          <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.8 }}>{t('qaNewShipmentSub')}</div>
        </div>
      </div>

      <div className="qa-card warn" onClick={() => navigate('/shipments')} style={{ flex: 1, cursor: 'pointer' }}>
        <div className="qa-icon" style={{ background: 'var(--warning-bg)' }}>⚠️</div>
        <div>
          <div className="qa-label" style={{ fontWeight: 600 }}>
            {pendingBids} {t('qaNeedsAction')}
          </div>
          <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t('qaNeedsActionSub')}</div>
        </div>
      </div>

      <div className="qa-card" onClick={() => navigate('/shipments')} style={{ flex: 1, cursor: 'pointer' }}>
        <div className="qa-icon" style={{ background: 'var(--info-bg)' }}>🔍</div>
        <div>
          <div className="qa-label" style={{ fontWeight: 600 }}>{t('qaSearchTrucks')}</div>
          <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t('qaSearchTrucksSub')}</div>
        </div>
      </div>

      <div
        className="qa-card"
        onClick={() => showToast(t('qaErpImportTriggering'), 'info')}
        style={{ flex: 1, cursor: 'pointer' }}
      >
        <div className="qa-icon" style={{ background: 'var(--success-bg)' }}>📋</div>
        <div>
          <div className="qa-label" style={{ fontWeight: 600 }}>{t('qaImportErp')}</div>
          <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t('qaImportErpSub')}</div>
        </div>
      </div>
    </div>
  );
};
