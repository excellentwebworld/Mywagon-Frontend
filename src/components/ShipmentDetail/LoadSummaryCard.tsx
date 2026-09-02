import React, { useState, useMemo } from 'react';
import { Package, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { DetailNote } from '../../pages/ShipmentDetail/detailViewModel';
import { parseSpecialInstructions, formatUtcToDisplayDateTime, type ParsedInstructionNote } from '../../utils/timezone';
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
  notes?: DetailNote[];
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string) => string;
}

const INSTRUCTION_MAX_LEN = 130;

function InstructionNoteItem({
  item,
  t,
}: {
  item: ParsedInstructionNote;
  t: (key: string, fallback?: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = item.body || '';
  const isLong = text.length > INSTRUCTION_MAX_LEN;

  return (
    <div className="p-3 rounded-lg bg-white/95 border border-[#FDE68A] shadow-2xs">
      {(item.author || item.timestamp || item.visibility) && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1.5">
          {item.author && (
            <span className="font-bold text-[#92400E]">{item.author}</span>
          )}
          {item.author && item.timestamp && <span className="text-[#D97706]">·</span>}
          {item.timestamp && (
            <span className="font-mono text-[10px] text-[#B45309]">{item.timestamp}</span>
          )}
          {item.visibility && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                item.visibility === 'carrier'
                  ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'bg-[#F3E8FF] text-[#7C3AED]'
              }`}
            >
              {item.visibility === 'carrier'
                ? t('carrierVisible', 'Carrier visible')
                : t('internal', 'Internal')}
            </span>
          )}
        </div>
      )}
      <div className="text-[12px] text-[#78350F] leading-relaxed break-words">
        <span>{isLong && !expanded ? `${text.slice(0, INSTRUCTION_MAX_LEN)}…` : text}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-1.5 text-[11px] font-bold text-[#9B51E0] hover:text-[#7E38C4] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            {expanded ? (
              <>
                <span>{t('readLess', 'Read less')}</span>
                <ChevronUp size={11} />
              </>
            ) : (
              <>
                <span>{t('readMore', 'Read more')}</span>
                <ChevronDown size={11} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export const LoadSummaryCard: React.FC<LoadSummaryCardProps> = ({
  loadSummary,
  notes,
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

  const parsedNotes: ParsedInstructionNote[] = useMemo(() => {
    if (notes && notes.length > 0) {
      return notes.map((n) => ({
        id: n.id,
        author: n.author,
        timestamp: formatUtcToDisplayDateTime(n.timestamp),
        visibility: n.visibility,
        body: n.body,
      }));
    }
    return parseSpecialInstructions(loadSummary.specialInstructions);
  }, [notes, loadSummary.specialInstructions]);

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
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider block mb-2">
            {t('vehicleTypeCargoSpec', 'Vehicle type & cargo specs')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {vehicleTypes.map((v, i) => (
              <span
                key={`vt-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#E9ECEF] text-[#495057]"
              >
                {v}
              </span>
            ))}
            {cargoSpecs.map((c, i) => (
              <span
                key={`cs-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F3E8FF] text-[#7C3AED]"
              >
                {c}
              </span>
            ))}
            {!vehicleTypes.length && !cargoSpecs.length && (
              <span className="text-[12px] text-[#8E8E9A]">—</span>
            )}
          </div>
        </div>

        {/* Quoted Price */}
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider block mb-2">
            {t('quotedPrice', 'Quoted Price')}
          </span>
          <span className="font-bold text-[14px] text-[#18181B] mt-auto font-mono">
            {loadSummary.quote || '—'}
          </span>
        </div>

        {/* Load Value */}
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider block mb-2">
            {t('loadValue', 'Load Value')}
          </span>
          <span className="font-bold text-[14px] text-[#18181B] mt-auto font-mono">
            {loadSummary.loadValue || '—'}
          </span>
        </div>

        {/* Row 2: Channel, Pricing, Navigation */}
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider block mb-2">
            {t('channel', 'Channel')}
          </span>
          <div className="mt-auto">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                loadSummary.channel === 'Public'
                  ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                  : 'bg-[#F3E8FF] text-[#7C3AED] border border-[#DDD6FE]'
              }`}
            >
              {loadSummary.channel || 'Private'}
            </span>
          </div>
        </div>

        {/* Pricing Negotiation */}
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider block mb-2">
            {t('pricingNegotiation', 'Pricing Negotiation')}
          </span>
          <span className="text-[12px] font-semibold text-[#18181B] mt-auto flex items-center gap-1.5">
            {loadSummary.negotiable ? (
              <span className="text-[#10B981] flex items-center gap-1">
                ✓ {t('negotiable', 'Negotiable')}
              </span>
            ) : (
              <span className="text-[#6C757D]">
                {t('fixedPrice', 'Fixed Price')}
              </span>
            )}
          </span>
        </div>

        {/* Live GPS Navigation */}
        <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#6C757D] uppercase tracking-wider block mb-2">
            {t('liveNavigation', 'Live Navigation')}
          </span>
          <div className="mt-auto">
            {loadSummary.liveNavigation ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                {t('enabled', 'Enabled')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#64748B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                {t('disabled', 'Disabled')}
              </span>
            )}
          </div>
        </div>
      </div>

      {parsedNotes.length > 0 && (
        <div className="mt-3.5 p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-[12px] text-[#B45309]">
            <FileText size={14} className="text-[#D97706]" />
            <span>{t('specialInstructions', 'Special Instructions')}</span>
            {parsedNotes.length > 1 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FDE68A] text-[#92400E]">
                {parsedNotes.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {parsedNotes.map((note) => (
              <InstructionNoteItem key={note.id} item={note} t={t} />
            ))}
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
};
