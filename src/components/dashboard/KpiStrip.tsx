import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

type KpiAction =
  | { type: 'board'; tab: number }
  | { type: 'scroll' }
  | { type: 'navigate'; to: string };

export const KpiStrip: React.FC<KpiStripProps> = ({ activeBoardTab, setActiveBoardTab }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    value: number;
    label: string;
    colorClass: string;
    active: boolean;
    action: KpiAction;
  }> = [
    {
      key: 'active',
      value: activeLoads,
      label: t('kpiActive'),
      colorClass: 'c-accent',
      active: false,
      action: { type: 'scroll' },
    },
    {
      key: 'on_trip',
      value: onTrip,
      label: t('kpiOnTrip'),
      colorClass: 'c-info',
      active: activeBoardTab === 2,
      action: { type: 'board', tab: 2 },
    },
    {
      key: 'needs_action',
      value: needsAction,
      label: t('kpiAction'),
      colorClass: 'c-warning',
      active: activeBoardTab === 0,
      action: { type: 'board', tab: 0 },
    },
    {
      key: 'upcoming',
      value: upcoming,
      label: t('kpiUpcoming'),
      colorClass: '',
      active: activeBoardTab === 1,
      action: { type: 'board', tab: 1 },
    },
    {
      key: 'at_risk',
      value: atRisk,
      label: t('kpiAtRisk'),
      colorClass: 'c-danger',
      active: false,
      action: { type: 'navigate', to: '/shipments?kpi=at_risk' },
    },
    {
      key: 'past_due',
      value: pastDue,
      label: t('kpiPastDue'),
      colorClass: 'c-orange',
      active: false,
      action: { type: 'navigate', to: '/shipments?status=past_due' },
    },
  ];

  return (
    <div className="kpi-section" style={{ display: 'block', marginBottom: '20px' }}>
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
