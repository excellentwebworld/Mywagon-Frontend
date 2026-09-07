import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Clock, Copy, Check, Plus, Trash2 } from 'lucide-react';
import type { ShipmentStop } from '../../context/AppContext';
import type { ShareCustomerGroup } from '../../pages/ShipmentDetail/detailViewModel';

interface ShareTrackingModalProps {
  open: boolean;
  stops?: ShipmentStop[];
  groups?: ShareCustomerGroup[];
  isPickedUp?: boolean;
  status?: string;
  isReadOnly?: boolean;
  onClose: () => void;
  onSend?: (emailsByLocationId: Record<string | number, string[]>) => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  t: (key: string, fallback?: string) => string;
}

function splitEmails(value?: string | null): string[] {
  if (!value) return [''];
  const parts = String(value)
    .split(/[,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [''];
}

export const ShareTrackingModal: React.FC<ShareTrackingModalProps> = ({
  open,
  stops,
  groups,
  isPickedUp = false,
  status,
  isReadOnly: explicitReadOnly,
  onClose,
  onSend,
  onToast,
  t,
}) => {
  const normStatus = (status || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isFulfilledOrPartial =
    normStatus === 'fullfilled' ||
    normStatus === 'fulfilled' ||
    normStatus === 'partially_fullfilled' ||
    normStatus === 'partially_fulfilled' ||
    normStatus === 'partial_fullfilled' ||
    normStatus === 'partial_fulfilled' ||
    normStatus === 'delivered' ||
    normStatus === 'not_fullfilled';

  const isReadOnly = explicitReadOnly ?? isFulfilledOrPartial;

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
            (s as any).trackingEmail ||
            (s as any).email ||
            (s.customers?.[0] as any)?.email ||
            '';
          const trackingUrl =
            (s as any).tracking_url ||
            (s as any).trackingUrl ||
            null;

          return {
            id: s.id || `delivery-${idx}`,
            locationName: s.location || '',
            address: s.address && s.address !== s.location ? s.address : '',
            date,
            time,
            orderId: String(orderId || ''),
            defaultEmails: splitEmails(initialEmail),
            trackingUrl: trackingUrl ? String(trackingUrl) : null,
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
          defaultEmails: splitEmails(r.email || ''),
          trackingUrl: null as string | null,
        }))
      );
    }

    return [];
  }, [stops, groups]);

  const trackingUrl = useMemo(
    () => deliveryRows.find((r) => r.trackingUrl)?.trackingUrl || null,
    [deliveryRows]
  );

  const [emails, setEmails] = useState<Record<string | number, string[]>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string | number, string[]> = {};
    deliveryRows.forEach((r) => {
      initial[r.id] = [...r.defaultEmails];
    });
    setEmails(initial);
    setCopied(false);
  }, [open, deliveryRows]);

  if (!open) return null;

  const handleEmailChange = (id: string | number, index: number, value: string) => {
    setEmails((prev) => {
      const list = [...(prev[id] || [''])];
      list[index] = value;
      return { ...prev, [id]: list };
    });
  };

  const addEmail = (id: string | number) => {
    setEmails((prev) => ({
      ...prev,
      [id]: [...(prev[id] || ['']), ''],
    }));
  };

  const removeEmail = (id: string | number, index: number) => {
    setEmails((prev) => {
      const list = [...(prev[id] || [''])];
      list.splice(index, 1);
      return { ...prev, [id]: list.length > 0 ? list : [''] };
    });
  };

  const handleCopyLink = async () => {
    if (!trackingUrl) {
      onToast?.(
        t('trackingLinkUnavailable', 'Tracking link is not available yet.'),
        'error'
      );
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trackingUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = trackingUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      onToast?.(t('trackingLinkCopied', 'Tracking link copied'), 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast?.(t('trackingLinkCopyFailed', 'Failed to copy tracking link'), 'error');
    }
  };

  const handleSubmit = () => {
    if (onSend) onSend(emails);
  };

  const showCopy = Boolean(isPickedUp);
  const showFooter = !isReadOnly || showCopy;
  // Label already includes "+" in locale — use text without icon, or strip leading "+"
  const addEmailLabel = String(t('addEmail', 'Add email')).replace(/^\+\s*/, '');

  return (
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
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
                    const emailList = emails[row.id] || [''];

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 align-top">
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
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-2">
                            {emailList.map((currentEmail, emailIdx) => (
                              <div key={`${row.id}-email-${emailIdx}`} className="flex items-center gap-2">
                                <input
                                  type="email"
                                  value={currentEmail}
                                  placeholder={t('enterEmail', 'Enter Email')}
                                  readOnly={isReadOnly}
                                  disabled={isReadOnly}
                                  onChange={(e) =>
                                    !isReadOnly &&
                                    handleEmailChange(row.id, emailIdx, e.target.value)
                                  }
                                  className={`flex-1 min-w-0 px-3 py-2 text-[12px] rounded-lg border outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-colors ${
                                    isReadOnly
                                      ? 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 cursor-not-allowed text-slate-600 dark:text-slate-400'
                                      : 'border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white dark:bg-slate-800'
                                  }`}
                                />
                                {!isReadOnly && emailList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeEmail(row.id, emailIdx)}
                                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300 cursor-pointer bg-transparent"
                                    aria-label={t('removeEmail', 'Remove email')}
                                    title={t('removeEmail', 'Remove email')}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}

                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => addEmail(row.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-purple-300 dark:border-purple-700 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer"
                              >
                                <Plus size={13} />
                                {addEmailLabel}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top text-center text-[12px] font-semibold text-slate-900 dark:text-white">
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

        {showFooter && (
          <div className="mv-modal-footer flex items-center justify-center gap-3 px-6 py-4 border-t border-[var(--border)]">
            {showCopy && (
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!trackingUrl}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer transition-colors ${
                  copied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : trackingUrl
                      ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800'
                }`}
                title={t('copyTrackingLink', 'Copy tracking link')}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied
                  ? t('trackingLinkCopied', 'Copied')
                  : t('copyLink', 'Copy link')}
              </button>
            )}

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-8 py-2 rounded-lg text-sm font-semibold text-white bg-[#9B51E0] hover:bg-[#883cd1] transition-all cursor-pointer shadow-sm"
              >
                {t('done', 'Done')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
