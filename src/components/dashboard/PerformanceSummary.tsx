import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

export const PerformanceSummary: React.FC = () => {
  const { showToast } = useApp();
  const { t } = useTranslation();

  return (
    <div className="perf-card">
      <div className="perf-hd">
        <h4>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-8" />
          </svg>
          <span>{t('perfTitle')}</span>
        </h4>
        <span className="perf-period">{t('perfSinceDay1')}</span>
      </div>
      <div className="perf-grid">
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfTotalCost')}</div>
          <div className="perf-cell-value">€ 48,230</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfTotalLoads')}</div>
          <div className="perf-cell-value">189</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfOnTimePickup')}</div>
          <div className="perf-cell-value">94.2%</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfOnTimeDelivery')}</div>
          <div className="perf-cell-value">91.7%</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfAvgCostKm')}</div>
          <div className="perf-cell-value">€ 1.61</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfAvgCostLoad')}</div>
          <div className="perf-cell-value">€ 255</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfPipelineRevenue')}</div>
          <div className="perf-cell-value">€ 12,400</div>
        </div>
        <div className="perf-cell">
          <div className="perf-cell-label">{t('perfRevenueDelivered')}</div>
          <div className="perf-cell-value">€ 98,750</div>
        </div>
      </div>
      <div className="perf-footer">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            showToast(t('comingSoon'), 'info');
          }}
        >
          {t('viewFullAnalytics')}
        </a>
      </div>
    </div>
  );
};
