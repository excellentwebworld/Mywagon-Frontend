import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QuickActions } from '../components/dashboard/QuickActions';
import { KpiStrip } from '../components/dashboard/KpiStrip';
import { Schedule } from '../components/dashboard/Schedule';
import { LiveMap } from '../components/dashboard/LiveMap';
import { ShipmentBoard } from '../components/dashboard/ShipmentBoard';

export const Dashboard: React.FC = () => {
  const { lang } = useApp();
  
  // Coordinate active board tab state between KpiStrip and ShipmentBoard
  // Index 1 represents "Upcoming" which is the default active tab in the design
  const [activeBoardTab, setActiveBoardTab] = useState<number>(1);

  return (
    <div className="animate-fade-in">
      {/* Greeting Header */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
          {lang === 'el' ? 'Καλώς ορίσατε,' : 'Welcome back,'}
        </p>
        <h1 className="company" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          {lang === 'el' ? 'ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΕΜΦΙΑΛΩΣΕΩΝ' : 'EPIRUS BOTTLING INDUSTRY'}
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
    </div>
  );
};
