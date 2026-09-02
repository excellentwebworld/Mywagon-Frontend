import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, DollarSign } from 'lucide-react';
import type { PartnerBidItem } from './BidsCard';
import { CarrierAvatar } from '../ManageShipments/CarrierAvatar';

interface CounterOfferModalProps {
  open: boolean;
  bid: PartnerBidItem | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (amount: number, notes?: string) => Promise<void> | void;
  t: (key: string, fallback?: string) => string;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({
  open,
  bid,
  submitting = false,
  onClose,
  onSubmit,
  t,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setNotes('');
      setError(null);
    }
  }, [open, bid]);

  if (!open || !bid) return null;

  const currentPrice = bid.bidAmount != null
    ? `€ ${bid.bidAmount.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError(t('counterOfferPriceRequired', 'Please enter a valid counter price'));
      return;
    }
    setError(null);
    onSubmit(val, notes.trim() || undefined);
  };

  return createPortal(
    <div
      className="mv-modal-bg fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mv-modal bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 relative border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mv-modal-header px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <ArrowRightLeft size={16} />
            </div>
            <h2 className="text-[16px] font-bold text-slate-900 dark:text-white m-0">
              {t('counterBidTitle', 'Counter-Bid')}
            </h2>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800"
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Partner & Current Offer details */}
          <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-slate-950/60 border border-purple-200 dark:border-purple-900/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <CarrierAvatar
                size={34}
                avatar={bid.avatar}
                name={bid.name}
                initials={bid.initials}
                className="carrier-av rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-2xs"
              />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                  {bid.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {bid.transporterType === 'freelancer' ? 'Freelancer' : 'Carrier'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('currentOfferPrice', 'Current Offer Price')}
              </div>
              <div className="text-[15px] font-bold font-mono text-purple-700 dark:text-purple-300">
                {currentPrice}
              </div>
            </div>
          </div>

          {/* Counter Price Input */}
          <div>
            <label className="text-[12px] font-bold text-slate-900 dark:text-white mb-1.5 block">
              {t('yourCounterPrice', 'Your Counter Price')} (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-[14px]">
                €
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
                placeholder={t('enterCounterPrice', 'Enter your counter price')}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full pl-8 pr-4 py-2.5 text-[14px] font-mono rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all ${
                  error
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900'
                    : 'border-slate-300 dark:border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                }`}
              />
            </div>
            {error && (
              <p className="text-red-500 text-[11px] font-medium mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-[12px] font-bold text-slate-900 dark:text-white mb-1.5 block">
              {t('notes', 'Notes')} <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">({t('optional', 'Optional')})</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder={t('addCounterNotePlaceholder', 'Add a note for the carrier/driver...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] shadow-xs active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              {submitting ? t('sending', 'Sending…') : t('sendCounterBid', 'Send Counter-Bid')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
