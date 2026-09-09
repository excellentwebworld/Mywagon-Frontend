import React, { useCallback, useState } from 'react';
import { KpiStrip } from '../components/dashboard/KpiStrip';
import { Schedule } from '../components/dashboard/Schedule';
import { LiveMap } from '../components/dashboard/LiveMap';
import { ShipmentBoard } from '../components/dashboard/ShipmentBoard';
import { PerformanceSummary } from '../components/dashboard/PerformanceSummary';
import { TruckAvailabilitiesCard } from '../components/dashboard/TruckAvailabilitiesCard';
import { Notifications } from '../components/dashboard/Notifications';
import { MessagesPreview } from '../components/dashboard/MessagesPreview';

import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { ContextualTutorialTrigger } from '../components/Tutorials';
import '../styles/tutorials.css';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Coordinate active board tab state between KpiStrip and ShipmentBoard
  // Index 1 represents "Upcoming" which is the default active tab in the design
  const [activeBoardTab, setActiveBoardTab] = useState<number>(1);
  const [selectedScheduleShipmentId, setSelectedScheduleShipmentId] = useState<number | null>(null);

  const handleSelectScheduleShipment = useCallback((id: number) => {
    setSelectedScheduleShipmentId(id);
  }, []);

  const companyName = user?.company_name?.trim() || '—';

  return (
    <div className="animate-fade-in dashboard-page">
      {/* Page Title */}
      <div className="tut-title-with-trigger" style={{ marginBottom: '16px' }}>
        <h1 className="text-h2" style={{ marginBottom: 0 }}>{t('dashboard')}</h1>
        <ContextualTutorialTrigger tutorialKey="dashboard" />
      </div>

      {/* Greeting Header */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
          {t('welcomeBack')}
        </p>
        <h1 className="company" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          {companyName}
        </h1>
      </div>

      {/* Row 1: Operational KPIs */}
      <KpiStrip activeBoardTab={activeBoardTab} setActiveBoardTab={setActiveBoardTab} />

      {/* Row 2: Today's Schedule + Live Map */}
      <div className="row-2col-even">
        <Schedule
          selectedShipmentId={selectedScheduleShipmentId}
          onSelectShipment={handleSelectScheduleShipment}
        />
        <LiveMap selectedShipmentId={selectedScheduleShipmentId} />
      </div>

      {/* Row 3: Manage Shipments board + Performance */}
      <div className="row-2col-board">
        <ShipmentBoard activeTab={activeBoardTab} setActiveTab={setActiveBoardTab} />
        <PerformanceSummary />
      </div>

      {/* Row 4: Trucks + Notifications + Messages */}
      <div className="row-3col">
        <TruckAvailabilitiesCard />
        <Notifications />
        <MessagesPreview />
      </div>
    </div>
  );
};
