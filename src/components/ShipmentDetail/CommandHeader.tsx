import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Pencil,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import type { ShipmentDetailViewModel } from '../../pages/ShipmentDetail/detailViewModel';
import { StatusBadge } from './StatusBadge';

interface CommandHeaderProps {
  vm: ShipmentDetailViewModel;
  lang?: 'en' | 'el';
  onLangChange?: (lang: 'en' | 'el') => void;
  onCopyId: () => void;
  onEdit?: () => void;
  onMessage?: () => void;
  onShare: () => void;
  onPdfExport?: () => void;
  onAuditLog: () => void;
  onBidsHistory?: () => void;
  onCancelShipment?: () => void;
  onDuplicate?: () => void;
  onAssignCoOwner?: () => void;
  onUploadDocument?: () => void;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  vm,
  lang = 'en',
  onLangChange,
  onCopyId,
  onEdit,
  onMessage,
  onShare,
  onPdfExport,
  onAuditLog,
  onBidsHistory,
  onCancelShipment,
  onDuplicate,
  onToast,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleCopy = () => {
    onCopyId();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = (vm.statusLabel || '').toLowerCase();
  const canEdit =
    status === 'draft' ||
    status === 'pending' ||
    status === 'scheduled' ||
    status === 'ready' ||
    status === 'upcoming' ||
    status === 'past_due' ||
    status === 'on_trip' ||
    status === 'in_progress';

  const canCancel =
    status === 'draft' ||
    status === 'pending' ||
    status === 'scheduled' ||
    status === 'ready' ||
    status === 'upcoming' ||
    status === 'past_due' ||
    status === 'on_trip' ||
    status === 'in_progress';

  const isOnTrip = status === 'on_trip' || status === 'in_progress';
  const isCancelled = status === 'canceled' || status === 'cancelled';

  return (
    <div className="mv-surface-card rounded-2xl px-5 py-4 mb-4 bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 font-bold font-mono text-[19px] text-slate-900 dark:text-white leading-none">
            <span>#{vm.displayId}</span>
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? t('copied', 'Copied!') : t('copyId', 'Copy ID')}
              aria-label="Copy ID"
              className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              {copied ? <Check size={15} className="text-emerald-500 animate-in zoom-in-50 duration-150" /> : <Copy size={15} />}
            </button>
          </div>

          <div className="text-[14px] font-medium mt-1.5 flex items-center gap-2 flex-wrap text-slate-900 dark:text-white">
            <span className="font-semibold">{vm.lane}</span>
            {vm.viaLabel && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                via {vm.viaLabel}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {vm.stopsCount} {vm.stopsCount === 1 ? 'stop' : 'stops'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={vm.statusLabel} />

            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400">
              {(vm.loadSummary?.channel || (vm.isPrivateLoad ? 'PRIVATE' : 'PUBLIC')).toUpperCase()}
            </span>

            {vm.primaryCustomer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                <span>🏪</span> {vm.primaryCustomer}
              </span>
            )}

            <span className="text-[12px] text-slate-600 dark:text-slate-300">
              {t('owner', 'Owner')}:{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{vm.owner || 'My Vagon'}</strong>
            </span>
          </div>
        </div>

        {isOnTrip && (
          <div className="flex flex-col gap-1.5">
            {vm.etaChip && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {vm.etaChip}
              </span>
            )}
            {vm.etaStatusChip && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  vm.onTrack
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {vm.etaStatusChip}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {canEdit && !isCancelled && (
            <button
              type="button"
              onClick={onEdit || (() => onToast(t('editShipment', 'Edit shipment')))}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap bg-[#9B51E0] hover:bg-[#883cd1] text-white shadow-sm active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              <Pencil size={14} />
              <span>{t('editShipment', 'Edit shipment')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMessage || (() => onToast(t('message', 'Message')))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
          >
            <MessageSquare size={14} />
            <span>{t('message', 'Message')}</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            title={t('shareTracking', 'Share tracking')}
            className="flex items-center justify-center p-2 rounded-lg text-[13px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            aria-label={t('shareTracking', 'Share tracking')}
          >
            <Share2 size={14} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title={t('moreActions', 'More actions')}
              className="flex items-center justify-center p-2 rounded-lg text-[13px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label={t('moreActions', 'More actions')}
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-800 p-1 shadow-xl border border-slate-200 dark:border-slate-700 z-30 animate-in fade-in zoom-in-95 duration-150">
                {onDuplicate && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate();
                    }}
                  >
                    {t('duplicateShipment', 'Duplicate load')}
                  </button>
                )}
                {canCancel && onCancelShipment && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setMenuOpen(false);
                      onCancelShipment();
                    }}
                  >
                    {t('cancelShipment', 'Cancel shipment')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
