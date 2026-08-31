import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ShipmentLogItem, AuditEntry } from '../../pages/ShipmentDetail/detailViewModel';

interface ActivityLogModalProps {
  open: boolean;
  logs?: ShipmentLogItem[];
  entries?: AuditEntry[];
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  open,
  logs = [],
  entries = [],
  onClose,
  t,
}) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E8] flex items-center justify-between bg-[#F9FAFB]">
          <h2 className="text-[16px] font-semibold text-[#18181B] m-0">
            {t('shipmentLogsTitle', 'Shipment Logs')}
          </h2>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-[#E4E4E8] flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F4F4F5] transition-colors cursor-pointer bg-white"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {logs && logs.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-3.5 text-[13px] text-[#374151]">
              {logs.map((log, index) => (
                <li key={log.id || index} className="leading-relaxed pl-1">
                  {log.isRejection && (
                    <span className="text-red-500 font-bold mr-1.5 text-[15px]">!</span>
                  )}
                  <strong className="font-bold text-[#18181B]">{log.action}</strong>
                  {' by '}
                  <strong className="font-bold text-[#18181B]">{log.actor}</strong>
                  {' on '}
                  <strong className="font-bold text-[#18181B]">{log.date}</strong>
                  {log.isRejection && log.rejectionReason && (
                    <div className="text-[12px] text-[#DC2626] font-semibold mt-0.5">
                      {t('reason', 'Reason')}: {log.rejectionReason}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : entries && entries.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-3.5 text-[13px] text-[#374151]">
              {entries.map((entry, index) => (
                <li key={entry.id || index} className="leading-relaxed pl-1">
                  <strong className="font-bold text-[#18181B]">
                    {entry.text.replace(/\*\*/g, '')}
                  </strong>
                  {' on '}
                  <strong className="font-bold text-[#18181B]">{entry.time}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-center py-8 text-[#9CA3AF] text-[13px]">
              {t('noLogsFound', 'No shipment logs found')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

