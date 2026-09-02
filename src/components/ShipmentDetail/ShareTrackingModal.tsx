import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import type { ShareCustomerGroup } from '../../pages/ShipmentDetail/detailViewModel';

interface ShareTrackingModalProps {
  open: boolean;
  stops?: ShipmentStop[];
  groups?: ShareCustomerGroup[];
  isPickedUp?: boolean;
  onClose: () => void;
  onSend?: (emailsByLocationId: Record<string | number, string>) => void;
  t: (key: string, fallback?: string) => string;
}

export const ShareTrackingModal: React.FC<ShareTrackingModalProps> = ({
  open,
  stops,
  groups,
  onClose,
  onSend,
  t,
}) => {
  const deliveryRows = useMemo(() => {
    if (stops && stops.length > 0) {
      return stops
        .filter((s) => s.type === 'delivery')
        .map((s, idx) => {
          const orderId =
            s.customers?.[0]?.orders?.[0]?.id ||
            (typeof s.customers?.[0]?.orders?.[0] === 'string' ? s.customers[0].orders[0] : '') ||
            '';
          const date = s.date || '';
          const sTime = (s.timeStart || '').trim();
          const eTime = (s.timeEnd || '').trim();
          const time =
            sTime && eTime && sTime !== eTime
              ? `${sTime} - ${eTime}`
              : sTime || eTime || '';
          const initialEmail =
            (s as any).tracking_email ||
            (s as any).email ||
            (s.customers?.[0] as any)?.email ||
            '';
          return {
            id: s.id || `delivery-${idx}`,
            locationName: s.location || '',
            address: s.address && s.address !== s.location ? s.address : '',
            date,
            time,
            orderId: String(orderId || ''),
            defaultEmail: String(initialEmail || ''),
          };
        });
    }

    if (groups && groups.length > 0) {
      return groups.flatMap((g) =>
        g.rows.map((r, idx) => ({
          id: `${r.location}-${r.orderRef}-${idx}`,
          locationName: r.location,
          address: '',
          date: '',
          time: '',
          orderId: r.orderRef,
          defaultEmail: r.email || '',
        }))
      );
    }

    return [];
  }, [stops, groups]);

  const [emails, setEmails] = useState<Record<string | number, string>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string | number, string> = {};
      deliveryRows.forEach((r) => {
        initial[r.id] = r.defaultEmail;
      });
      setEmails(initial);
    }
  }, [open, deliveryRows]);

  if (!open) return null;

  const handleEmailChange = (id: string | number, value: string) => {
    setEmails((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (onSend) {
      onSend(emails);
    }
  };

  return (
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mv-modal-header flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-[16px] text-purple-600 dark:text-purple-400 m-0">
            {t('trackingLinks', 'Tracking Links')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Table Body */}
        <div className="mv-modal-body p-6 overflow-y-auto max-h-[60vh] flex-1">
          {deliveryRows.length === 0 ? (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6 m-0">
              {t('noDeliveryLocations', 'No delivery locations found for this shipment.')}
            </p>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4 text-[12px] font-semibold text-slate-700 dark:text-slate-300 w-5/12">
                      {t('deliveryLocation', 'Delivery Location')}
                    </th>
                    <th className="py-3 px-4 text-[12px] font-semibold text-slate-700 dark:text-slate-300 w-5/12">
                      {t('email', 'Email')}
                    </th>
                    <th className="py-3 px-4 text-[12px] font-semibold text-slate-700 dark:text-slate-300 w-2/12 text-center">
                      {t('orderId', 'Order ID')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {deliveryRows.map((row) => {
                    const currentEmail = emails[row.id] ?? '';
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 align-middle">
                          <div className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">
                            {row.locationName}
                            {row.address && (
                              <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                                {row.address}
                              </span>
                            )}
                          </div>
                          {(row.date || row.time) && (
                            <div className="flex items-center gap-3.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                              {row.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} className="text-purple-600 dark:text-purple-400" />
                                  <span>{row.date}</span>
                                </span>
                              )}
                              {row.time && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className="text-purple-600 dark:text-purple-400" />
                                  <span>{row.time}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-middle">
                          <input
                            type="email"
                            value={currentEmail}
                            placeholder={t('enterEmail', 'Enter Email')}
                            onChange={(e) => handleEmailChange(row.id, e.target.value)}
                            className="w-full px-3 py-2 text-[12px] rounded-lg border border-purple-500 outline-none focus:ring-1 focus:ring-purple-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
                          />
                        </td>
                        <td className="py-3.5 px-4 align-middle text-center text-[12px] font-semibold text-slate-900 dark:text-white">
                          {row.orderId || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mv-modal-footer flex items-center justify-center gap-3 px-6 py-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleSubmit}
            className="px-8 py-2 rounded-lg text-sm font-semibold text-white bg-[#9B51E0] hover:bg-[#883cd1] transition-all cursor-pointer shadow-sm"
          >
            {t('done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};
