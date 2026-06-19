import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

interface KpiStripProps {
  activeBoardTab: number;
  setActiveBoardTab: (idx: number) => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ activeBoardTab, setActiveBoardTab }) => {
  const { shipments } = useApp();
  const { t } = useTranslation();

  // Calculate dynamic KPIs from shipments state
  const pendingBids = shipments.filter(s => s.status === 'pending').length;
  const inTransit = shipments.filter(s => s.status === 'in_progress').length;
  const deliveredCount = shipments.filter(s => s.status === 'delivered').length;
  const upcomingCount = shipments.filter(s => s.status === 'upcoming').length;
  const activeLoads = shipments.filter(s => s.status === 'pending' || s.status === 'in_progress' || s.status === 'upcoming').length;

  // Map operational KPI cards to board tabs:
  // - Needs Action KPI (index 1 in operational strip) -> Tab 0 on board
  // - Upcoming KPI (index 3 in operational strip) -> Tab 1 on board
  // - In Transit KPI (index 2 in operational strip) -> Tab 2 on board
  // - Completed KPI (index 4 in operational strip) -> Tab 3 on board
  // - Active Loads (index 0) can clear to Tab 1 (Upcoming) or keep as active selection
  const handleKpiClick = (tabIdx: number) => {
    setActiveBoardTab(tabIdx);
    const boardCard = document.getElementById('boardCard');
    if (boardCard) {
      boardCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="kpi-section" style={{ display: 'block', marginBottom: '20px' }}>
      {/* Operational Section */}
      <div className="kpi-section-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        <span>{t('kpiOpLabel')}</span>
      </div>
      <div className="kpi-strip">
        {/* Active Loads */}
        <div className={`kpi c-accent ${activeBoardTab === 1 ? 'active' : ''}`} onClick={() => handleKpiClick(1)}>
          <div className="kpi-top">
            <div className="kpi-val">{activeLoads}</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,18 8,14 16,16 24,10 32,12 40,8 48,6 56,9" stroke="#6C3AED" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiActive')}</span>
            <span className="kpi-delta up">↑ 12%</span>
          </div>
        </div>

        {/* Needs Action */}
        <div className={`kpi c-warning ${activeBoardTab === 0 ? 'active' : ''}`} onClick={() => handleKpiClick(0)}>
          <div className="kpi-top">
            <div className="kpi-val">{pendingBids}</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,12 8,14 16,10 24,16 32,18 40,14 48,20 56,16" stroke="#F59E0B" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiAction')}</span>
            <span className="kpi-delta down">↑ 2</span>
          </div>
        </div>

        {/* In Transit */}
        <div className={`kpi c-info ${activeBoardTab === 2 ? 'active' : ''}`} onClick={() => handleKpiClick(2)}>
          <div className="kpi-top">
            <div className="kpi-val">{inTransit}</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,16 8,12 16,14 24,8 32,10 40,6 48,8 56,4" stroke="#0EA5E9" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiTransit')}</span>
            <span className="kpi-delta neutral">— 0</span>
          </div>
        </div>

        {/* Upcoming */}
        <div className={`kpi ${activeBoardTab === 1 ? 'active' : ''}`} onClick={() => handleKpiClick(1)}>
          <div className="kpi-top">
            <div className="kpi-val">{upcomingCount}</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,20 8,18 16,16 24,12 32,14 40,10 48,8 56,6" stroke="#8E8E9A" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiUpcoming')}</span>
            <span className="kpi-delta up">↑ 3</span>
          </div>
        </div>

        {/* Completed */}
        <div className={`kpi c-success ${activeBoardTab === 3 ? 'active' : ''}`} onClick={() => handleKpiClick(3)}>
          <div className="kpi-top">
            <div className="kpi-val">{deliveredCount}</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,20 8,18 16,16 24,14 32,12 40,10 48,8 56,6" stroke="#10B981" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiCompleted')}</span>
            <span className="kpi-delta up">↑ 8%</span>
          </div>
        </div>
      </div>

      {/* Financial Section */}
      <div className="kpi-section-label" style={{ marginTop: '4px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span>{t('kpiFinLabel')}</span>
      </div>
      <div className="kpi-strip">
        {/* Total Spend */}
        <div className="kpi c-money">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>€48.2K</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,20 8,18 16,17 24,15 32,14 40,11 48,10 56,8" stroke="#7C3AED" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiTotalSpend')}</span>
            <span className="kpi-delta up" style={{ color: '#991B1B', background: '#FEF2F2' }}>↑ 6%</span>
          </div>
          <div className="kpi-target">
            <span>{t('kpiBudget')}</span>
            <div className="kpi-target-bar">
              <div className="kpi-target-fill" style={{ width: '87%', background: 'var(--accent)' }}></div>
            </div>
            <span>87%</span>
          </div>
        </div>

        {/* Avg Cost / km */}
        <div className="kpi c-teal">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>€1.61</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,8 8,10 16,9 24,12 32,11 40,10 48,9 56,8" stroke="#0D9488" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiCostKm')}</span>
            <span className="kpi-delta down" style={{ color: '#065F46', background: '#ECFDF5' }}>↓ 3%</span>
          </div>
          <div className="kpi-target">
            <span>{t('kpiMarketAvg')}</span>
            <div className="kpi-target-bar">
              <div className="kpi-target-fill" style={{ width: '92%', background: 'var(--success)' }}></div>
            </div>
            <span style={{ color: 'var(--success)' }}>✓</span>
          </div>
        </div>

        {/* Avg Cost / Load */}
        <div className="kpi c-orange">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>€255</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,12 8,14 16,11 24,13 32,10 40,12 48,9 56,10" stroke="#EA580C" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiCostLoad')}</span>
            <span className="kpi-delta neutral">→ 0%</span>
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="kpi c-rose">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>€3.2K</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,14 8,12 16,16 24,10 32,14 40,8 48,12 56,6" stroke="#E11D48" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiUnpaid')}</span>
            <span className="kpi-delta down">↑ €800</span>
          </div>
        </div>

        {/* Commission Rate */}
        <div className="kpi c-purple">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>12.4%</div>
            <div className="kpi-spark">
              <svg viewBox="0 0 56 24" fill="none">
                <polyline points="0,14 8,13 16,12 24,11 32,12 40,11 48,10 56,9" stroke="#8B5CF6" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiMargin')}</span>
            <span className="kpi-delta neutral">— fixed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
