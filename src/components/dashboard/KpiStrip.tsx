import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiShipmentsSummary } from '../../api/types/shipments';
import { useTranslation } from '../../hooks/useTranslation';
import { DashUpgradeBlock, translateDashMessage } from './dashErrorUtils';
import { DashKpiSkeleton } from './DashboardSkeletons';
import { EMPTY_OUTBOUND_SUMMARY } from './useOutboundSummary';

interface KpiStripProps {
  activeBoardTab: number;
  setActiveBoardTab: (idx: number) => void;
  summary?: ApiShipmentsSummary;
  loading?: boolean;
  error?: string | null;
  upgradeUrl?: string;
}

type KpiAction =
  | { type: 'board'; tab: number }
  | { type: 'scroll' }
  | { type: 'navigate'; to: string };

export const KpiStrip: React.FC<KpiStripProps> = ({
  activeBoardTab,
  setActiveBoardTab,
  summary = EMPTY_OUTBOUND_SUMMARY,
  loading = false,
  error = null,
  upgradeUrl,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const statuses = summary.statuses ?? {};
  const pending = statuses.pending ?? 0;
  const onTrip = statuses.on_trip ?? 0;
  const ready = statuses.ready ?? 0;
  const scheduled = statuses.scheduled ?? 0;
  const pastDue = statuses.past_due ?? 0;
  const needsAction = summary.kpis?.needs_action ?? 0;
  const upcoming = summary.kpis?.upcoming ?? 0;
  const atRisk = summary.kpis?.at_risk ?? 0;
  const activeLoads = pending + scheduled + ready + pastDue + onTrip;

  const scrollToBoard = () => {
    const boardCard = document.getElementById('boardCard');
    if (boardCard) {
      boardCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAction = (action: KpiAction) => {
    if (error) return;
    if (action.type === 'navigate') {
      navigate(action.to);
      return;
    }
    if (action.type === 'board') {
      setActiveBoardTab(action.tab);
    }
    scrollToBoard();
  };

  const cards: Array<{
    key: string;
    value: number | string;
    label: string;
    colorClass: string;
    active: boolean;
    action: KpiAction;
  }> = [
    {
      key: 'active',
      value: error ? '—' : activeLoads,
      label: t('kpiActive'),
      colorClass: 'c-accent',
      active: false,
      action: { type: 'scroll' },
    },
    {
      key: 'on_trip',
      value: error ? '—' : onTrip,
      label: t('kpiOnTrip'),
      colorClass: 'c-info',
      active: activeBoardTab === 4,
      action: { type: 'board', tab: 4 },
    },
    {
      key: 'needs_action',
      value: error ? '—' : needsAction,
      label: t('kpiAction'),
      colorClass: 'c-warning',
      active: activeBoardTab === 0,
      action: { type: 'board', tab: 0 },
    },
    {
      key: 'upcoming',
      value: error ? '—' : upcoming,
      label: t('kpiUpcoming'),
      colorClass: '',
      active: activeBoardTab === 3,
      action: { type: 'board', tab: 3 },
    },
    {
      key: 'at_risk',
      value: error ? '—' : atRisk,
      label: t('kpiAtRisk'),
      colorClass: 'c-danger',
      active: activeBoardTab === 2,
      action: { type: 'board', tab: 2 },
    },
    {
      key: 'past_due',
      value: error ? '—' : pastDue,
      label: t('kpiPastDue'),
      colorClass: 'c-orange',
      active: activeBoardTab === 5,
      action: { type: 'board', tab: 5 },
    },
  ];

  if (loading) {
    return <DashKpiSkeleton />;
  }

  return (
    <div className="kpi-section" style={{ display: 'block', marginBottom: '20px' }}>
      {error && (
        <div className="dash-widget-error" style={{ marginBottom: 10 }}>
          {upgradeUrl ? (
            <DashUpgradeBlock upgradeUrl={upgradeUrl} t={t} compact />
          ) : (
            <span>{translateDashMessage(t, error)}</span>
          )}
        </div>
      )}
      <div className="kpi-strip">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`kpi ${card.colorClass} ${card.active ? 'active' : ''}`.trim()}
            onClick={() => handleAction(card.action)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAction(card.action);
              }
            }}
          >
            <div className="kpi-top">
              <div className="kpi-val">{card.value}</div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
