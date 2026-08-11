import React, { useState } from 'react';
import { QuickActions } from '../components/dashboard/QuickActions';
import { KpiStrip } from '../components/dashboard/KpiStrip';
import { Schedule } from '../components/dashboard/Schedule';
import { LiveMap } from '../components/dashboard/LiveMap';
import { ShipmentBoard } from '../components/dashboard/ShipmentBoard';
import { Notifications } from '../components/dashboard/Notifications';
import { RightPanel } from '../components/dashboard/RightPanel';

import { useTranslation } from '../hooks/useTranslation';
import { ContextualTutorialTrigger } from '../components/Tutorials';
import '../styles/tutorials.css';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  // Coordinate active board tab state between KpiStrip and ShipmentBoard
  // Index 1 represents "Upcoming" which is the default active tab in the design
  const [activeBoardTab, setActiveBoardTab] = useState<number>(1);

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
          {t('companyNameDemo')}
        </h1>
      </div>

      {/* Quick Actions Bar */}
      <QuickActions />

      {/* Operational & Financial KPI Strips */}
      <KpiStrip activeBoardTab={activeBoardTab} setActiveBoardTab={setActiveBoardTab} />

      {/* Schedule & Live Map Layout */}
      <div className="row-2col">
        <Schedule />
        <LiveMap />
      </div>

      {/* Dynamic Tabbed Shipment Board */}
      <ShipmentBoard activeTab={activeBoardTab} setActiveTab={setActiveBoardTab} />

      {/* Notifications & Right Panel Layout */}
      <div className="row-2col-r4">
        <Notifications />
        <RightPanel />
      </div>
    </div>
  );
};
