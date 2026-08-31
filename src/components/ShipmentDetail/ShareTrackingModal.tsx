import React, { useState } from 'react';
import { Share2, Plus, Trash2, Copy, Check, X, AlertCircle } from 'lucide-react';
import type { ShareCustomerGroup } from '../../pages/ShipmentDetail/detailViewModel';

interface ShareTrackingModalProps {
  open: boolean;
  groups: ShareCustomerGroup[];
  isPickedUp?: boolean;
  onClose: () => void;
  onSend: () => void;
  t: (key: string, fallback?: string) => string;
}

export const ShareTrackingModal: React.FC<ShareTrackingModalProps> = ({
  open,
  groups,
  isPickedUp = true,
  onClose,
  onSend,
  t,
}) => {
  const [emailsState, setEmailsState] = useState<Record<string, string[]>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!open) return null;

  const getEmailsForRow = (key: string, defaultEmail: string) => {
    return emailsState[key] || [defaultEmail];
  };

  const handleAddEmail = (key: string) => {
    setEmailsState((prev) => {
      const current = prev[key] || [''];
      return { ...prev, [key]: [...current, ''] };
    });
  };

  const handleEmailChange = (key: string, index: number, value: string) => {
    setEmailsState((prev) => {
      const current = [...(prev[key] || [''])];
      current[index] = value;
      return { ...prev, [key]: current };
    });
  };

  const handleRemoveEmail = (key: string, index: number) => {
    setEmailsState((prev) => {
      const current = [...(prev[key] || [''])];
      current.splice(index, 1);
      return { ...prev, [key]: current.length > 0 ? current : [''] };
    });
  };

  const handleCopyLink = (rowKey: string, location: string) => {
    if (!isPickedUp) return;
    const url = `${window.location.origin}/track/${encodeURIComponent(rowKey)}`;
    navigator.clipboard.writeText(url);
    setCopiedKey(rowKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid #E4E4E8' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E8]">
          <div className="flex items-center gap-2">
            <Share2 size={18} style={{ color: '#9B51E0' }} />
            <h3 className="font-bold text-[16px] text-[#18181B]">
              {t('shareTrackingLinks', 'Share tracking links')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 text-[#8E8E9A] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!isPickedUp && (
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#92400E]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>
                {t(
                  'trackingLinkActiveAfterPickup',
                  'Tracking links become active and copyable once goods have been picked up from at least one location.'
                )}
              </span>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.name} className="space-y-3">
              <div
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: '#F0FDF9', border: '1px solid #A7F3D0', color: '#059669' }}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <span>🏪</span>
                  <span>{group.name}</span>
                </div>
                <span className="text-[10px] font-bold text-[#059669]">
                  {group.deliveryCount} {t('deliveries', 'deliveries')}
                </span>
              </div>

              <div className="space-y-3">
                {group.rows.map((row) => {
                  const rowKey = `${row.location}-${row.orderRef}`;
                  const emails = getEmailsForRow(rowKey, row.email);

                  return (
                    <div
                      key={rowKey}
                      className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="font-bold text-[#18181B] flex items-center gap-1.5">
                          <span>📍 {row.location}</span>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            ({row.orderRef})
                          </span>
                        </div>

                        {/* Copy tracking link button */}
                        <button
                          type="button"
                          disabled={!isPickedUp}
                          onClick={() => handleCopyLink(rowKey, row.location)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {copiedKey === rowKey ? (
                            <>
                              <Check size={12} style={{ color: '#10B981' }} />
                              <span style={{ color: '#10B981' }}>{t('copied', 'Copied!')}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>{t('copyTrackingLink', 'Copy link')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Multiple Emails for this stop */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-medium text-[#64748B]">
                          {t('recipientsEmail', 'Recipient emails for live notifications:')}
                        </div>
                        {emails.map((em, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="email"
                              value={em}
                              placeholder="customer@example.com"
                              onChange={(e) => handleEmailChange(rowKey, idx, e.target.value)}
                              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[#CBD5E1] outline-none focus:border-[#9B51E0]"
                            />
                            {emails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(rowKey, idx)}
                                className="p-1.5 rounded text-[#94A3B8] hover:text-[#EF4444] cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddEmail(rowKey)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#9B51E0] hover:underline cursor-pointer pt-1"
                        >
                          <Plus size={12} />
                          <span>{t('addAnotherEmail', '+ Add another email')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E4E4E8] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E4E4E8] text-[#5E5E6E] hover:bg-black/5 cursor-pointer"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onSend}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#9B51E0] hover:opacity-90 cursor-pointer"
          >
            {t('sendLinks', 'Send tracking links')}
          </button>
        </div>
      </div>
    </div>
  );
};
