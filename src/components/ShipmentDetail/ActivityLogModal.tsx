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
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mv-modal-header px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white m-0">
            {t('shipmentLogsTitle', 'Shipment Logs')}
          </h2>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {logs && logs.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-3.5 text-[13px] text-slate-700 dark:text-slate-300">
              {logs.map((log, index) => (
                <li key={log.id || index} className="leading-relaxed pl-1">
                  {log.isRejection && (
                    <span className="text-red-500 font-bold mr-1.5 text-[15px]">!</span>
                  )}
                  <strong className="font-bold text-slate-900 dark:text-white">{log.action}</strong>
                  {' by '}
                  <strong className="font-bold text-slate-900 dark:text-white">{log.actor}</strong>
                  {' on '}
                  <strong className="font-bold text-slate-900 dark:text-white">{log.date}</strong>
                  {log.isRejection && log.rejectionReason && (
                    <div className="text-[12px] text-red-600 dark:text-red-400 font-semibold mt-0.5">
                      {t('reason', 'Reason')}: {log.rejectionReason}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : entries && entries.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-3.5 text-[13px] text-slate-700 dark:text-slate-300">
              {entries.map((entry, index) => (
                <li key={entry.id || index} className="leading-relaxed pl-1">
                  <strong className="font-bold text-slate-900 dark:text-white">
                    {entry.text.replace(/\*\*/g, '')}
                  </strong>
                  {' on '}
                  <strong className="font-bold text-slate-900 dark:text-white">{entry.time}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-[13px]">
              {t('noLogsFound', 'No shipment logs found')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

