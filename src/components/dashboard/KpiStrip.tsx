import React, { useEffect, useState } from 'react';
import { shipmentsService } from '../../api';
import type { ApiShipmentsSummary } from '../../api/types/shipments';
import { useTranslation } from '../../hooks/useTranslation';
import { EMPTY_KPI_COUNTS } from '../../pages/ManageShipments/utils/listingUtils';

interface KpiStripProps {
  activeBoardTab: number;
  setActiveBoardTab: (idx: number) => void;
}

const EMPTY_SUMMARY: ApiShipmentsSummary = {
  kpis: { ...EMPTY_KPI_COUNTS },
  statuses: {},
};

export const KpiStrip: React.FC<KpiStripProps> = ({ activeBoardTab, setActiveBoardTab }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ApiShipmentsSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    let cancelled = false;
    shipmentsService
      .summary({ direction: 'outbound' })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(EMPTY_SUMMARY);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statuses = summary.statuses ?? {};
  const pending = statuses.pending ?? 0;
  const onTrip = statuses.on_trip ?? 0;
  const ready = statuses.ready ?? 0;
  const scheduled = statuses.scheduled ?? 0;
  const pastDue = statuses.past_due ?? 0;
  const needsAction = summary.kpis?.needs_action ?? pending;
  const inTransit = onTrip;
  const upcomingCount = ready + scheduled;
  const deliveredCount = statuses.fullfilled ?? statuses.delivered ?? 0;
  const activeLoads = pending + onTrip + ready + scheduled + pastDue;

  const handleKpiClick = (tabIdx: number) => {
    setActiveBoardTab(tabIdx);
    const boardCard = document.getElementById('boardCard');
    if (boardCard) {
      boardCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="kpi-section" style={{ display: 'block', marginBottom: '20px' }}>
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
        <div className={`kpi c-accent ${activeBoardTab === 1 ? 'active' : ''}`} onClick={() => handleKpiClick(1)}>
          <div className="kpi-top">
            <div className="kpi-val">{activeLoads}</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiActive')}</span>
          </div>
        </div>

        <div className={`kpi c-warning ${activeBoardTab === 0 ? 'active' : ''}`} onClick={() => handleKpiClick(0)}>
          <div className="kpi-top">
            <div className="kpi-val">{needsAction}</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiAction')}</span>
          </div>
        </div>

        <div className={`kpi c-info ${activeBoardTab === 2 ? 'active' : ''}`} onClick={() => handleKpiClick(2)}>
          <div className="kpi-top">
            <div className="kpi-val">{inTransit}</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiTransit')}</span>
          </div>
        </div>

        <div className={`kpi ${activeBoardTab === 1 ? 'active' : ''}`} onClick={() => handleKpiClick(1)}>
          <div className="kpi-top">
            <div className="kpi-val">{upcomingCount}</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiUpcoming')}</span>
          </div>
        </div>

        <div className={`kpi c-success ${activeBoardTab === 3 ? 'active' : ''}`} onClick={() => handleKpiClick(3)}>
          <div className="kpi-top">
            <div className="kpi-val">{deliveredCount}</div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiCompleted')}</span>
          </div>
        </div>
      </div>

      {/* Financial KPIs: no summary API yet — show placeholders (not demo figures). */}
      <div className="kpi-section-label" style={{ marginTop: '4px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span>{t('kpiFinLabel')}</span>
      </div>
      <div className="kpi-strip">
        <div className="kpi c-money">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>
              —
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiTotalSpend')}</span>
          </div>
        </div>
        <div className="kpi c-teal">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>
              —
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiCostKm')}</span>
          </div>
        </div>
        <div className="kpi c-orange">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>
              —
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiCostLoad')}</span>
          </div>
        </div>
        <div className="kpi c-rose">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>
              —
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiUnpaid')}</span>
          </div>
        </div>
        <div className="kpi c-purple">
          <div className="kpi-top">
            <div className="kpi-val" style={{ fontSize: '24px' }}>
              —
            </div>
          </div>
          <div className="kpi-bottom">
            <span className="kpi-label">{t('kpiMargin')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
