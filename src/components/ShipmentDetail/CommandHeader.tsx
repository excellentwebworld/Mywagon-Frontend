import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Pencil,
  MessageSquare,
  Share2,
  ClipboardList,
  Receipt,
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
    <div className="rounded-2xl px-5 py-4 mb-4 bg-white border border-[#E4E4E8] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 font-bold font-mono text-[19px] text-[#18181B] leading-none">
            <span>#{vm.displayId}</span>
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? t('copied', 'Copied!') : t('copyId', 'Copy ID')}
              aria-label="Copy ID"
              className="p-1.5 rounded-md text-[#8E8E9A] hover:text-[#18181B] hover:bg-[#F8F7FC] active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
            >
              {copied ? <Check size={15} className="text-[#10B981] animate-in zoom-in-50 duration-150" /> : <Copy size={15} />}
            </button>

            {/* {onLangChange && (
              <div className="inline-flex rounded-lg overflow-hidden ml-2 border border-[#E4E4E8] bg-[#F8F7FC] p-0.5">
                <button
                  type="button"
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                    lang === 'en'
                      ? 'bg-[#18181B] text-white shadow-xs'
                      : 'text-[#8E8E9A] hover:text-[#18181B]'
                  }`}
                  onClick={() => onLangChange('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                    lang === 'el'
                      ? 'bg-[#18181B] text-white shadow-xs'
                      : 'text-[#8E8E9A] hover:text-[#18181B]'
                  }`}
                  onClick={() => onLangChange('el')}
                >
                  EL
                </button>
              </div>
            )} */}
          </div>

          <div className="text-[14px] font-medium mt-1.5 flex items-center gap-2 flex-wrap text-[#18181B]">
            <span className="font-semibold">{vm.lane}</span>
            {vm.viaLabel && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F0F3] text-[#5E5E6E]">
                via {vm.viaLabel}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F0F3] text-[#5E5E6E]">
              {vm.stopsCount} {vm.stopsCount === 1 ? 'stop' : 'stops'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={vm.statusLabel} />

            <span className="text-[10px] font-bold tracking-wider text-[#8E8E9A]">
              {(vm.loadSummary?.channel || (vm.isPrivateLoad ? 'PRIVATE' : 'PUBLIC')).toUpperCase()}
            </span>

            {vm.primaryCustomer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#059669] bg-[#F0FDF9] border border-[#A7F3D0]">
                <span>🏪</span> {vm.primaryCustomer}
              </span>
            )}

            <span className="text-[12px] text-[#5E5E6E]">
              {t('owner', 'Owner')}:{' '}
              <strong className="text-[#18181B] font-semibold">{vm.owner || 'My Vagon'}</strong>
            </span>
          </div>
        </div>

        {isOnTrip && (
          <div className="flex flex-col gap-1.5">
            {vm.etaChip && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#7C3AED]">
                {vm.etaChip}
              </span>
            )}
            {vm.etaStatusChip && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  vm.onTrack
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap bg-[#9B51E0] hover:bg-[#883cd1] text-white shadow-sm active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
            >
              <Pencil size={14} />
              <span>{t('editShipment', 'Edit shipment')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMessage || (() => onToast(t('message', 'Message')))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
          >
            <MessageSquare size={14} />
            <span>{t('message', 'Message')}</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            title={t('shareTracking', 'Share tracking')}
            className="flex items-center justify-center p-2 rounded-lg text-[13px] font-semibold bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
            aria-label={t('shareTracking', 'Share tracking')}
          >
            <Share2 size={14} />
          </button>

          <button
            type="button"
            onClick={onAuditLog}
            title={t('shipmentLogs', 'Shipment Logs')}
            className="flex items-center justify-center p-2 rounded-lg text-[13px] font-semibold bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
            aria-label={t('shipmentLogs', 'Shipment Logs')}
          >
            <ClipboardList size={14} />
          </button>

          {onBidsHistory && (
            <button
              type="button"
              onClick={onBidsHistory}
              title={t('bidsHistory', 'Bids History')}
              className="flex items-center justify-center p-2 rounded-lg text-[13px] font-semibold bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
              aria-label={t('bidsHistory', 'Bids History')}
            >
              <Receipt size={14} />
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title={t('moreActions', 'More actions')}
              className="flex items-center justify-center p-2 rounded-lg text-[13px] font-semibold bg-white text-[#5E5E6E] border border-[#E4E4E8] hover:bg-[#F8F7FC] hover:text-[#18181B] hover:border-[#D4D4D8] active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label={t('moreActions', 'More actions')}
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white p-1 shadow-xl border border-[#E4E4E8] z-30 animate-in fade-in zoom-in-95 duration-150">
                {onDuplicate && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#18181B] hover:bg-[#F8F7FC] hover:text-[#9B51E0] transition-colors cursor-pointer"
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
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
