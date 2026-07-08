import React from 'react';
import type { BillingMetrics } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface BillingCardProps {
  billing: BillingMetrics;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

export const BillingCard: React.FC<BillingCardProps> = ({ billing, expanded, onToggle, t }) => (
  <CollapsibleCard id="billing" title={<>💰 {t('billing')}</>} expanded={expanded} onToggle={onToggle}>
    <div className="ld-ls-grid">
      <div className="ld-ls-cell">
        <label>{t('agreedPrice')}</label>
        <div className="val price">{billing.agreedPrice}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('priceType')}</label>
        <div className="val">
          <span className="ld-bg ld-bg-gr">{billing.priceType}</span>
        </div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('costPerKm')}</label>
        <div className="val">{billing.costPerKm}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{billing.kmDetail}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('costPerPallet')}</label>
        <div className="val">{billing.costPerPallet}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{billing.palletDetail}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('costPerTonne')}</label>
        <div className="val">{billing.costPerTonne}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{billing.tonneDetail}</div>
      </div>
      <div className="ld-ls-cell">
        <label>{t('costPerStop')}</label>
        <div className="val">{billing.costPerStop}</div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{billing.stopDetail}</div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
      <span className="ld-bg ld-bg-wr">{t('invoice')}: {billing.invoiceStatus}</span>
      <span className="ld-bg ld-bg-ok">{billing.disputeStatus}</span>
    </div>
  </CollapsibleCard>
);
