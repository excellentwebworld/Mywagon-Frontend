import React from 'react';
import type { AssignedDriverDetail } from '../../pages/ShipmentDetail/detailViewModel';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';
import { TransporterNameLink } from '../TransporterProfile/TransporterProfileContext';
import { CollapsibleCard } from './CollapsibleCard';

interface DriverCardProps {
  driver: AssignedDriverDetail | null;
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  onRate?: () => void;
  t: (key: string) => string;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  expanded,
  onToggle,
  onToast,
  onRate,
  t,
}) => (
  <CollapsibleCard
    id="driver"
    title={<>👤 {t('driverDetails') || 'Driver Details'}</>}
    expanded={expanded}
    onToggle={onToggle}
  >
    {driver ? (
      <>
        <div className="ld-cr-card">
          <CarrierAvatar
            className="ld-cr-av"
            name={driver.name}
            initials={driver.initials}
            avatar={driver.avatar}
          />
          <div>
            <div style={{ fontWeight: 600 }}>
              <TransporterNameLink id={driver.userId} type="driver" name={driver.name} />{' '}
              {driver.partner && (
                <span className="ld-bg ld-bg-ac" style={{ fontSize: 9 }}>
                  PARTNER
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              ★ {driver.rating} · {driver.meta}
            </div>
          </div>
        </div>
        {driver.plates.length > 0 && (
          <div className="ld-cr-plates">
            {driver.plates.map((plate) => (
              <span key={plate} className="ld-cr-plate">
                {plate}
              </span>
            ))}
          </div>
        )}
        {driver.canRate && onRate && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onRate}>
              ★ {t('rateDriver') || 'Rate driver'}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToast(t('message'))}>
            💬 {t('message')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToast(t('call'))}>
            📞 {t('call')}
          </button>
        </div>
      </>
    ) : (
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{t('noDriverAssigned') || 'No driver assigned'}</div>
    )}
  </CollapsibleCard>
);
