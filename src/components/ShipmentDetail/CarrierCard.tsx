import React from 'react';
import type { CarrierDetail } from '../../pages/ShipmentDetail/detailViewModel';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';
import { TransporterNameLink } from '../TransporterProfile/TransporterProfileContext';
import { CollapsibleCard } from './CollapsibleCard';

interface CarrierCardProps {
  carrier: CarrierDetail | null;
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  onRate?: () => void;
  t: (key: string) => string;
}

export const CarrierCard: React.FC<CarrierCardProps> = ({
  carrier,
  expanded,
  onToggle,
  onToast,
  onRate,
  t,
}) => (
  <CollapsibleCard id="carrier" title={<>🚛 {t('carrierDriver')}</>} expanded={expanded} onToggle={onToggle}>
    {carrier ? (
      <>
        <div className="ld-cr-card">
          <CarrierAvatar
            className="ld-cr-av"
            name={carrier.name}
            initials={carrier.initials}
            avatar={carrier.avatar}
          />
          <div>
            <div style={{ fontWeight: 600 }}>
              <TransporterNameLink
                id={carrier.userId}
                type={carrier.userType}
                name={carrier.name}
              />{' '}
              {carrier.partner && (
                <span className="ld-bg ld-bg-ac" style={{ fontSize: 9 }}>
                  PARTNER
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              ★ {carrier.rating} · {carrier.meta}
            </div>
          </div>
        </div>
        <div className="ld-cr-score">
          <div className="ld-cr-stat">
            {t('onTimeDelivery')}
            <strong>{carrier.onTimeDelivery}</strong>
          </div>
          <div className="ld-cr-stat">
            {t('cancelRate')}
            <strong>{carrier.cancelRate}</strong>
          </div>
          <div className="ld-cr-stat">
            {t('avgPickupDelay') || 'Avg pickup delay'}
            <strong>{carrier.avgPickupDelay}</strong>
          </div>
          <div className="ld-cr-stat">
            {t('avgResponse')}
            <strong>{carrier.avgResponse}</strong>
          </div>
        </div>
        {carrier.plates.length > 0 && (
        <div className="ld-cr-plates">
          {carrier.plates.map((plate) => (
            <span key={plate} className="ld-cr-plate">
              {plate}
            </span>
          ))}
        </div>
        )}
        {carrier.canRate && onRate && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onRate}>
              ★ {t('rateCarrier') || 'Rate carrier'}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToast(t('email'))}>
            ✉️ {t('email')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToast(t('message'))}>
            💬 {t('message')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToast(t('call'))}>
            📞 {t('call')}
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>{t('quickTemplates')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {carrier.templates.map((tpl) => (
              <button key={tpl} type="button" className="btn btn-secondary btn-sm" onClick={() => onToast(tpl)}>
                {tpl}
              </button>
            ))}
          </div>
        </div>
      </>
    ) : (
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{t('noCarrierAssigned')}</div>
    )}
  </CollapsibleCard>
);
