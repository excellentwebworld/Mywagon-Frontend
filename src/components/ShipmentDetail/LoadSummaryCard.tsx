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
    <div className="p-3 rounded-lg bg-[var(--surface-alt)] border border-amber-200 dark:border-amber-800/60 shadow-2xs">
      {(item.author || item.timestamp || item.visibility) && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1.5">
          {item.author && (
            <span className="font-bold text-amber-900 dark:text-amber-300">{item.author}</span>
          )}
          {item.author && item.timestamp && <span className="text-amber-500">·</span>}
          {item.timestamp && (
            <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">{item.timestamp}</span>
          )}
          {item.visibility && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                item.visibility === 'carrier'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              {item.visibility === 'carrier'
                ? t('carrierVisible', 'Carrier visible')
                : t('internal', 'Internal')}
            </span>
          )}
        </div>
      )}
      <div className="text-[12px] text-amber-950 dark:text-amber-200 leading-relaxed break-words">
        <span>{isLong && !expanded ? `${text.slice(0, INSTRUCTION_MAX_LEN)}…` : text}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
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
        <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            {t('vehicleTypeCargoSpec', 'Vehicle type & cargo specs')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {vehicleTypes.map((v, i) => (
              <span
                key={`vt-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
              >
                {v}
              </span>
            ))}
            {cargoSpecs.map((c, i) => (
              <span
                key={`cs-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              >
                {c}
              </span>
            ))}
            {!vehicleTypes.length && !cargoSpecs.length && (
              <span className="text-[12px] text-slate-400 dark:text-slate-500">—</span>
            )}
          </div>
        </div>

        {/* Quoted Price */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            {t('quotedPrice', 'Quoted Price')}
          </span>
          <span className="font-bold text-[14px] text-[var(--text-primary)] mt-auto font-mono">
            {loadSummary.quote || '—'}
          </span>
        </div>

        {/* Load Value */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            {t('loadValue', 'Load Value')}
          </span>
          <span className="font-bold text-[14px] text-[var(--text-primary)] mt-auto font-mono">
            {loadSummary.loadValue || '—'}
          </span>
        </div>

        {/* Row 2: Channel, Pricing, Navigation */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            {t('channel', 'Channel')}
          </span>
          <div className="mt-auto">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                loadSummary.channel === 'Public'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              {loadSummary.channel || 'Private'}
            </span>
          </div>
        </div>

        {/* Pricing Negotiation */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            {t('pricingNegotiation', 'Pricing Negotiation')}
          </span>
          <span className="text-[12px] font-semibold text-[var(--text-primary)] mt-auto flex items-center gap-1.5">
            {loadSummary.negotiable ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                ✓ {t('negotiable', 'Negotiable')}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                {t('fixedPrice', 'Fixed Price')}
              </span>
            )}
          </span>
        </div>

        {/* Live GPS Navigation */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
            {t('liveNavigation', 'Live Navigation')}
          </span>
          <div className="mt-auto">
            {loadSummary.liveNavigation ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('enabled', 'Enabled')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {t('disabled', 'Disabled')}
              </span>
            )}
          </div>
        </div>
      </div>

      {parsedNotes.length > 0 && (
        <div className="mt-3.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-[12px] text-amber-900 dark:text-amber-300">
            <FileText size={14} className="text-amber-600 dark:text-amber-400" />
            <span>{t('specialInstructions', 'Special Instructions')}</span>
            {parsedNotes.length > 1 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
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
