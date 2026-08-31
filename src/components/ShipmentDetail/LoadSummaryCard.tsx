import React from 'react';
import { Package } from 'lucide-react';
import { CollapsibleCard } from './CollapsibleCard';

export interface LoadSummaryData {
  vehicleTypes: string[];
  cargoSpecs: string[];
  quote: string;
  loadValue: string;
  channel: string;
  negotiable: boolean;
  liveNavigation: boolean;
  specialInstructions?: string;
}

interface LoadSummaryCardProps {
  loadSummary: LoadSummaryData;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

export const LoadSummaryCard: React.FC<LoadSummaryCardProps> = ({
  loadSummary,
  expanded,
  onToggle,
  t,
}) => {
  const vehicleTypes = loadSummary.vehicleTypes?.length
    ? loadSummary.vehicleTypes
    : ['Semi-Trailer'];

  const cargoSpecs = loadSummary.cargoSpecs?.length
    ? loadSummary.cargoSpecs
    : ['Curtainside'];

  return (
    <CollapsibleCard
      id="load"
      icon={<Package size={15} />}
      title={t('loadSummary', 'Load summary')}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3.5">
        {/* Vehicle Type & Cargo Specs (Clear badge list UI for multiple items) */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#8E8E9A' }}
          >
            {t('vehicleTypeCargoSpec', 'Vehicle type & cargo specs')}
          </div>
          <div className="flex flex-wrap gap-1">
            {vehicleTypes.map((v, i) => (
              <span
                key={`vt-${i}`}
                className="text-[12px] font-semibold px-2 py-0.5 rounded"
                style={{ background: '#F0F0F3', color: '#18181B' }}
              >
                {v}
              </span>
            ))}
            {cargoSpecs.map((c, i) => (
              <span
                key={`cs-${i}`}
                className="text-[12px] font-medium px-2 py-0.5 rounded"
                style={{ background: '#F3E8FF', color: '#7C3AED' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Quoted Price */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#8E8E9A' }}
          >
            {t('quotedPrice', 'Quoted price')}
          </div>
          <div
            className="text-[14px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#18181B',
            }}
          >
            {loadSummary.quote || '—'}
          </div>
        </div>

        {/* Load Value */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#8E8E9A' }}
          >
            {t('loadValue', 'Load value')}
          </div>
          <div
            className="text-[14px] font-bold"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#18181B',
            }}
          >
            {loadSummary.loadValue || '—'}
          </div>
        </div>

        {/* Channel (Shipment Type) */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#8E8E9A' }}
          >
            {t('channel', 'Channel')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold"
              style={{
                background: loadSummary.channel?.toLowerCase() === 'public' ? '#EFF6FF' : '#FAF5FF',
                color: loadSummary.channel?.toLowerCase() === 'public' ? '#2563EB' : '#7C3AED',
              }}
            >
              {loadSummary.channel?.toUpperCase() || 'PRIVATE'}
            </span>
          </div>
        </div>

        {/* Negotiable OR Non-Negotiable */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#8E8E9A' }}
          >
            {t('pricingFlexibility', 'Pricing negotiation')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {loadSummary.negotiable ? (
              <span className="text-[#059669] font-bold">
                {t('negotiable', 'Negotiable')}
              </span>
            ) : (
              <span className="text-[#5E5E6E]">
                {t('nonNegotiable', 'Non-Negotiable')}
              </span>
            )}
          </div>
        </div>

        {/* Live Navigation: Required OR Not Required */}
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: '#8E8E9A' }}
          >
            {t('liveNavigation', 'Live navigation')}
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#18181B' }}>
            {loadSummary.liveNavigation ? (
              <span className="text-[#2563EB] font-bold">
                {t('required', 'Required')}
              </span>
            ) : (
              <span className="text-[#8E8E9A]">
                {t('notRequired', 'Not required')}
              </span>
            )}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
};
