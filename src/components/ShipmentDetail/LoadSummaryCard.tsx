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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Vehicle Type & Cargo Specs */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E9A] mb-1.5">
            {t('vehicleTypeCargoSpec', 'Vehicle type & cargo specs')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vehicleTypes.map((v, i) => (
              <span
                key={`vt-${i}`}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#F0F0F3] text-[#18181B] border border-[#E4E4E8]"
              >
                {v}
              </span>
            ))}
            {cargoSpecs.map((c, i) => (
              <span
                key={`cs-${i}`}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#F3E8FF] text-[#7C3AED] border border-[#E9D5FF]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Quoted Price */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E9A] mb-1">
            {t('quotedPrice', 'Quoted price')}
          </div>
          <div className="text-[15px] font-bold font-mono text-[#18181B]">
            {loadSummary.quote || '—'}
          </div>
        </div>

        {/* Load Value */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E9A] mb-1">
            {t('loadValue', 'Load value')}
          </div>
          <div className="text-[15px] font-bold font-mono text-[#18181B]">
            {loadSummary.loadValue || '—'}
          </div>
        </div>

        {/* Channel (Shipment Type) */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E9A] mb-1.5">
            {t('channel', 'Channel')}
          </div>
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                loadSummary.channel?.toLowerCase() === 'public'
                  ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                  : 'bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF]'
              }`}
            >
              {loadSummary.channel?.toUpperCase() || 'PRIVATE'}
            </span>
          </div>
        </div>

        {/* Pricing Negotiation */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E9A] mb-1.5">
            {t('pricingFlexibility', 'Pricing negotiation')}
          </div>
          <div>
            {loadSummary.negotiable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                <span>✓</span> {t('negotiable', 'Negotiable')}
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-medium text-[#5E5E6E]">
                {t('nonNegotiable', 'Non-Negotiable')}
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Navigation */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EBEBF0]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E9A] mb-1.5">
            {t('liveNavigation', 'GPS Live Tracking')}
          </div>
          <div>
            {loadSummary.liveNavigation ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>{t('enabled', 'Enabled')}</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8E8E9A]">
                {t('disabled', 'Disabled')}
              </span>
            )}
          </div>
        </div>
      </div>

      {loadSummary.specialInstructions && (
        <div className="mt-3 p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[12px] text-[#92400E]">
          <strong className="font-semibold">{t('specialInstructions', 'Special Instructions')}:</strong>{' '}
          {loadSummary.specialInstructions}
        </div>
      )}
    </CollapsibleCard>
  );
};
