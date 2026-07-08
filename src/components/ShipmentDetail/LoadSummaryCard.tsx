import React from 'react';
import type { ShipmentDetailViewModel } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface LoadSummaryCardProps {
  loadSummary: ShipmentDetailViewModel['loadSummary'];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  t: (key: string) => string;
}

export const LoadSummaryCard: React.FC<LoadSummaryCardProps> = ({
  loadSummary,
  expanded,
  onToggle,
  onCopy,
  t,
}) => (
  <CollapsibleCard id="load" title={<>📦 {t('loadSummary')}</>} expanded={expanded} onToggle={onToggle}>
    <div className="ld-ls-grid">
      <div className="ld-ls-cell">
        <label>{t('vehicleType')}</label>
        <div className="val">{loadSummary.vehicleType}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('cargoSpecs')}</label>
        <div className="val">{loadSummary.cargoSpecs}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('quote')}</label>
        <div className="val price">{loadSummary.quote}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('shipmentType')}</label>
        <div className="val">
          <span className="ld-bg ld-bg-gr">{loadSummary.shipmentType}</span>
        </div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('customerCol')}</label>
        <div className="val">
          <span className="cust-pill">
            <span className="ci">🏪</span>
            {loadSummary.customer}
          </span>
        </div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('orderIds')}</label>
        <div className="val">
          {loadSummary.orderIds}{' '}
          <span style={{ cursor: 'pointer' }} onClick={() => onCopy(loadSummary.orderIds)} role="button" tabIndex={0}>
            📋
          </span>
        </div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('reference')}</label>
        <div className="val">
          {loadSummary.reference}{' '}
          <span style={{ cursor: 'pointer' }} onClick={() => onCopy(loadSummary.reference)} role="button" tabIndex={0}>
            📋
          </span>
        </div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('contact')}</label>
        <div className="val">
          <a href={`mailto:${loadSummary.contact}`}>{loadSummary.contact}</a>
        </div>
      </div>
    </div>
    <div className="ld-special">
      <strong>{t('specialInstructions')}:</strong> {loadSummary.specialInstructions}
    </div>
  </CollapsibleCard>
);
