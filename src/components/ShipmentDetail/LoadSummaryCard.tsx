import React from 'react';
import { Package, Copy } from 'lucide-react';
import type { ShipmentDetailViewModel } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface LoadSummaryCardProps {
  loadSummary: ShipmentDetailViewModel['loadSummary'];
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const LoadSummaryCard: React.FC<LoadSummaryCardProps> = ({
  loadSummary,
  expanded,
  onToggle,
  onCopy,
  t,
}) => {
  return (
    <CollapsibleCard
      id="load"
      icon={<Package size={15} />}
      title={t('loadSummary', 'Load summary')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('vehicleType', 'Vehicle type')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {loadSummary.vehicleType || 'Semi-Trailer'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('cargoSpecs', 'Cargo specs')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {loadSummary.cargoSpecs || 'Curtainside'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('quote', 'Quote')}
          </div>
          <div
            className="text-[13px] font-semibold"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#18181B',
            }}
          >
            {loadSummary.quote || '—'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('shipmentType', 'Shipment type')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {loadSummary.shipmentType || 'PRIVATE'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('customer', 'Customer')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {loadSummary.customer || 'Alpha Foods Ltd'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('orderIds', 'Order IDs')}
          </div>
          <div className="text-[13px] font-semibold flex items-center gap-1" style={{ color: '#18181B' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
              {loadSummary.orderIds || '—'}
            </span>
            {loadSummary.orderIds && loadSummary.orderIds !== '—' && (
              <button
                type="button"
                onClick={() => onCopy(loadSummary.orderIds)}
                title={t('copy', 'Copy')}
                className="p-0.5 rounded hover:bg-black/5 cursor-pointer transition-colors"
                style={{ background: 'none', border: 'none', color: '#8E8E9A' }}
              >
                <Copy size={11} />
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('reference', 'Reference')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
              {loadSummary.reference || '—'}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#8E8E9A' }}>
            {t('contact', 'Contact')}
          </div>
          <div className="text-[13px] font-semibold truncate" style={{ color: '#18181B' }}>
            {loadSummary.contact || '—'}
          </div>
        </div>
      </div>

      {loadSummary.specialInstructions && (
        <div
          className="mt-3 p-2.5 rounded-lg text-[12px]"
          style={{ background: '#F5F5F7', color: '#5E5E6E' }}
        >
          <strong style={{ color: '#18181B' }}>
            {t('specialInstructions', 'Special instructions')}:
          </strong>{' '}
          {loadSummary.specialInstructions}
        </div>
      )}
    </CollapsibleCard>
  );
};
