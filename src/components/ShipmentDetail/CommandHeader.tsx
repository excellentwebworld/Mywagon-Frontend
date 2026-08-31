import React, { useState } from 'react';
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
    <div
      className="rounded-2xl px-5 py-4 mb-4"
      style={{ background: '#FFFFFF', border: '1px solid #E4E4E8' }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div
            className="flex items-center gap-2 font-bold"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: '19px',
              color: '#18181B',
            }}
          >
            <span>#{vm.displayId}</span>
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? t('copied', 'Copied!') : t('copyId', 'Copy ID')}
              aria-label="Copy ID"
              className="p-1 rounded hover:bg-black/5 transition-colors"
              style={{ background: 'none', border: 'none', color: '#8E8E9A' }}
            >
              {copied ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
            </button>

            {onLangChange && (
              <div
                className="inline-flex rounded-lg overflow-hidden ml-2"
                style={{ border: '1px solid #E4E4E8' }}
              >
                <button
                  type="button"
                  className="px-2 py-0.5 text-[11px] font-semibold transition-colors"
                  style={{
                    background: lang === 'en' ? '#18181B' : 'transparent',
                    color: lang === 'en' ? '#FFFFFF' : '#8E8E9A',
                    border: 'none',
                  }}
                  onClick={() => onLangChange('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className="px-2 py-0.5 text-[11px] font-semibold transition-colors"
                  style={{
                    background: lang === 'el' ? '#18181B' : 'transparent',
                    color: lang === 'el' ? '#FFFFFF' : '#8E8E9A',
                    border: 'none',
                  }}
                  onClick={() => onLangChange('el')}
                >
                  EL
                </button>
              </div>
            )}
          </div>

          <div
            className="text-[14px] font-medium mt-1 flex items-center gap-2 flex-wrap"
            style={{ color: '#18181B' }}
          >
            <span>{vm.lane}</span>
            {vm.viaLabel && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: '#F0F0F3', color: '#8E8E9A' }}
              >
                via {vm.viaLabel}
              </span>
            )}
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#F0F0F3', color: '#8E8E9A' }}
            >
              {vm.stopsCount} {vm.stopsCount === 1 ? 'stop' : 'stops'}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={vm.statusLabel} />

            <span
              className="text-[10px] font-bold tracking-wider"
              style={{ color: '#8E8E9A' }}
            >
              {(vm.loadSummary?.channel || (vm.isPrivateLoad ? 'PRIVATE' : 'PUBLIC')).toUpperCase()}
            </span>

            {vm.primaryCustomer && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  color: '#059669',
                  background: '#F0FDF9',
                  border: '1px solid #A7F3D0',
                }}
              >
                <span>🏪</span> {vm.primaryCustomer}
              </span>
            )}

            <span className="text-[12px]" style={{ color: '#5E5E6E' }}>
              {t('owner', 'Owner')}:{' '}
              <strong style={{ color: '#18181B' }}>{vm.owner || 'My Vagon'}</strong>
            </span>
          </div>
        </div>

        {isOnTrip && (
          <div className="flex flex-col gap-1.5">
            {vm.etaChip && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: '#F3E8FF', color: '#7C3AED' }}
              >
                {vm.etaChip}
              </span>
            )}
            {vm.etaStatusChip && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: vm.onTrack ? '#ECFDF5' : '#FEF3C7',
                  color: vm.onTrack ? '#059669' : '#92400E',
                }}
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: '#9B51E0', color: '#fff', border: 'none' }}
            >
              <Pencil size={14} />
              <span>{t('editShipment', 'Edit shipment')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMessage || (() => onToast(t('message', 'Message')))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-black/5 cursor-pointer"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E8',
              color: '#5E5E6E',
            }}
          >
            <MessageSquare size={14} />
            <span>{t('message', 'Message')}</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            title={t('shareTracking', 'Share tracking')}
            className="flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors hover:bg-black/5 cursor-pointer"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E8',
              color: '#5E5E6E',
              padding: '8px 10px',
            }}
          >
            <Share2 size={14} />
          </button>

          <button
            type="button"
            onClick={onAuditLog}
            title={t('shipmentLogs', 'Shipment Logs')}
            className="flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors hover:bg-black/5 cursor-pointer"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4E4E8',
              color: '#5E5E6E',
              padding: '8px 10px',
            }}
          >
            <ClipboardList size={14} />
          </button>

          {onBidsHistory && (
            <button
              type="button"
              onClick={onBidsHistory}
              title={t('bidsHistory', 'Bids History')}
              className="flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors hover:bg-black/5 cursor-pointer"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E8',
                color: '#5E5E6E',
                padding: '8px 10px',
              }}
            >
              <Receipt size={14} />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              title={t('moreActions', 'More actions')}
              className="flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors hover:bg-black/5 cursor-pointer"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E8',
                color: '#5E5E6E',
                padding: '8px 10px',
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white p-1 shadow-lg z-30"
                style={{ border: '1px solid #E4E4E8' }}
              >
                {onDuplicate && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#18181B] hover:bg-[#F5F5F7] transition-colors"
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
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
