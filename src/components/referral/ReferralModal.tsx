import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Copy,
  Mail,
  Share2,
  TrendingUp,
  Award,
  HelpCircle,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useReferralSummary } from '../../hooks/useReferral';
import type { ReferralStatus, ReferralActivityItem } from '../../api/services/referralService';
import '../../styles/referral-modal.css';

export type { ReferralStatus };
export type ReferralActivity = ReferralActivityItem;

export interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReferralCode?: string;
  availableCredit?: number;
  maxPoints?: number;
  pointsPerReferral?: number;
  initialActivity?: ReferralActivity[];
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  defaultReferralCode = '',
  availableCredit: propAvailableCredit,
  maxPoints: propMaxPoints,
  pointsPerReferral: propPointsPerReferral,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const { user: authUser } = useAuth();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Dynamic API queries
  const summaryQuery = useReferralSummary(isOpen);

  // Derive dynamic data with fallbacks
  const referralCode = summaryQuery.data?.referral_code || authUser?.referralCode || defaultReferralCode || '—';

  const pointsPerReferral = summaryQuery.data?.program_rules.points_per_referral ?? propPointsPerReferral ?? 50;
  const maxPoints = summaryQuery.data?.program_rules.max_points_cap ?? propMaxPoints ?? pointsPerReferral;
  const requiredShipments = summaryQuery.data?.program_rules.required_shipments ?? 1;

  const countSignedUp = summaryQuery.data?.stats.signed_up_count ?? 0;
  const countQualified = summaryQuery.data?.stats.qualified_count ?? 0;
  const earnedPoints = summaryQuery.data?.stats.points_earned ?? 0;
  const pendingPoints = summaryQuery.data?.stats.points_pending ?? 0;
  const availableCredit = summaryQuery.data?.stats.available_credit_balance ?? propAvailableCredit ?? 0;

  const isSummaryLoading = summaryQuery.isLoading && !summaryQuery.data;



  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const getShareMessage = (lang: string) => {
    if (lang === 'el') {
      return `Εγγραφείτε στο MYVAGON, την 1η ψηφιακή πλατφόρμα διαχείρισης φορτίων. Χρησιμοποιήστε τον κωδικό σύστασής μου "${referralCode}" κατά την εγγραφή σας στο https://myvagon.com για να κερδίσουμε και οι δύο ανταμοιβές!`;
    }
    return `Join MYVAGON, Greece's premier digital freight platform. Use my Referral Code "${referralCode}" when you sign up at https://myvagon.com to start booking trucks and earn rewards!`;
  };

  const copyToClipboard = async (text: string, labelType: 'code' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      if (labelType === 'code') {
        showToast(t('referral.toastCopiedCode', '✅ Code copied to clipboard'));
      } else {
        showToast(t('referral.toastCopiedMsg', '✅ Referral message copied!'));
      }
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(t('referral.toastCopiedMsg', '✅ Copied to clipboard!'));
    }
  };

  const handleShare = (channel: 'email' | 'whatsapp' | 'viber' | 'linkedin') => {
    const msg = getShareMessage(currentLang);
    let shareUrl = '';
    const emailSubject = currentLang === 'el'
      ? 'Δοκιμάστε το MYVAGON — Έξυπνη Πλατφόρμα Logistics'
      : 'Try MYVAGON — Smart Logistics Platform';

    switch (channel) {
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(msg)}`;
        window.location.href = shareUrl;
        showToast(`${t('referral.toastOpening', '🔗 Opening')} Email...`);
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        showToast(`${t('referral.toastOpening', '🔗 Opening')} WhatsApp...`);
        break;
      case 'viber': {
        try {
          navigator.clipboard?.writeText(msg);
        } catch {
          // ignore
        }

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = `viber://forward?text=${encodeURIComponent(msg)}`;
        } else {
          // Try launching desktop app protocol via hidden anchor
          const viberLink = document.createElement('a');
          viberLink.href = `viber://forward?text=${encodeURIComponent(msg)}`;
          viberLink.style.display = 'none';
          document.body.appendChild(viberLink);
          viberLink.click();
          document.body.removeChild(viberLink);

          // Open viber.com web page in a new tab
          window.open('https://www.viber.com', '_blank', 'noopener,noreferrer');
        }
        showToast(t('referral.toastViber', '💬 Opening Viber... Message copied to clipboard!'));
        break;
      }

      case 'linkedin':
        try {
          navigator.clipboard?.writeText(msg);
        } catch {
          // ignore
        }
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://myvagon.com')}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        showToast(`${t('referral.toastOpening', '🔗 Opening')} LinkedIn...`);
        break;
    }
  };





  if (!isOpen) return null;

  return createPortal(
    <div
      className={`ref-modal-bg ${isOpen ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ref-modal-title"
    >
      <div className="ref-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ref-header">
          <div className="ref-header-icon">
            <Users size={22} />
          </div>
          <div className="ref-header-text">
            <h2 id="ref-modal-title">{t('referral.refTitle', 'Refer MYVAGON')}</h2>
            <p>
              {t('referral.refSubtitlePrefix', 'Earn up to')}{' '}
              {summaryQuery.isLoading && !summaryQuery.data ? (
                <span className="ref-skel ref-skel--dark ref-skel-hdr" />
              ) : (
                <strong>{maxPoints} {t('referral.creditPoints', 'Credit Points')}</strong>
              )}{' '}
              — {t('referral.refSubtitleSuffix', 'credits apply to subscription & commission invoices')}
            </p>
          </div>
          <button
            type="button"
            className="ref-close"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ref-body">
          {/* Top 2 Columns Grid */}
          <div className="ref-cols">
            {/* Column 1: Share & Invite */}
            <div className="share-section">
              <h3>
                <Share2 size={17} />
                <span>{t('referral.shareTitle', 'Share & Invite')}</span>
              </h3>

              {/* Referral Code */}
              <div className="ref-input-group">
                <label>{t('referral.refCodeLabel', 'Referral Code')}</label>
                <div className="ref-input-row">
                  {summaryQuery.isLoading && !referralCode ? (
                    <div style={{ flex: 1, padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                      <span className="ref-skel ref-skel-code" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={referralCode}
                      readOnly
                      id="refCodeInput"
                    />
                  )}
                  <button type="button" onClick={() => copyToClipboard(referralCode, 'code')}>
                    <Copy size={13} />
                    <span>{t('referral.copy', 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* Copy Full Message Button */}
              <button
                type="button"
                className="share-msg-btn"
                onClick={() => copyToClipboard(getShareMessage(currentLang), 'msg')}
              >
                <Copy size={14} />
                <span>{t('referral.copyMsg', 'Copy Referral Message')}</span>
              </button>

              {/* Social Channels (Email, WhatsApp, Viber, LinkedIn) */}
              <div className="share-channels">
                <button type="button" className="share-ch email" onClick={() => handleShare('email')}>
                  <Mail size={14} /> Email
                </button>
                <button type="button" className="share-ch whatsapp" onClick={() => handleShare('whatsapp')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.66 0-3.203-.507-4.484-1.371l-.32-.191-2.871.852.852-2.871-.191-.32A7.963 7.963 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                  </svg>
                  WhatsApp
                </button>
                <button type="button" className="share-ch viber" onClick={() => handleShare('viber')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M19.389 16.035c-.487-.272-2.883-1.424-3.327-1.587-.446-.164-.77-.246-1.096.246-.324.492-1.258 1.587-1.543 1.913-.284.327-.568.368-1.056.123-.487-.245-2.057-.758-3.918-2.417-1.448-1.291-2.426-2.887-2.711-3.375-.284-.488-.03-.752.213-.994.22-.218.487-.568.73-1.056.245-.487.325-.813.488-1.138.163-.325.081-.61-.04-.854-.122-.244-1.097-2.642-1.503-3.618-.396-.951-.798-.822-1.097-.838-.284-.014-.609-.017-.934-.017-.325 0-.853.122-1.299.61-.447.487-1.706 1.666-1.706 4.064 0 2.398 1.747 4.715 1.99 5.04.244.326 3.435 5.245 8.324 7.354 1.163.502 2.07.802 2.778 1.025 1.168.372 2.23.319 3.07.194.937-.14 2.883-1.179 3.29-2.317.406-1.138.406-2.114.284-2.317-.121-.203-.446-.325-.934-.597z"/>
                  </svg>
                  Viber
                </button>
                <button type="button" className="share-ch linkedin" onClick={() => handleShare('linkedin')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/>
                  </svg>
                  LinkedIn
                </button>
              </div>
            </div>

            {/* Column 2: Progress & Rewards */}
            <div className="progress-section">
              <h3>
                <TrendingUp size={17} />
                <span>{t('referral.progressTitle', 'Progress & Rewards')}</span>
              </h3>

              {/* 2 Stats: Signed Up & Qualified */}
              <div className="stats-grid stats-grid--two">
                <div className="stat-box">
                  <div className="stat-val">
                    {summaryQuery.isLoading && !summaryQuery.data ? (
                      <div className="ref-skel ref-skel-val" />
                    ) : (
                      countSignedUp
                    )}
                  </div>
                  <div className="stat-lbl">{t('referral.statSignedUp', 'Signed Up')}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-val purple">
                    {summaryQuery.isLoading && !summaryQuery.data ? (
                      <div className="ref-skel ref-skel-val" />
                    ) : (
                      countQualified
                    )}
                  </div>
                  <div className="stat-lbl">{t('referral.statQualified', 'Qualified')}</div>
                </div>
              </div>

              {/* 2 Reward Cards: Earned & Pending */}
              <div className="reward-bar">
                <div className="reward-card earned">
                  <div className="rw-val">
                    {summaryQuery.isLoading && !summaryQuery.data ? (
                      <div className="ref-skel ref-skel-rw" />
                    ) : (
                      `${earnedPoints} pts`
                    )}
                  </div>
                  <div className="rw-lbl">{t('referral.rwEarned', 'Earned')}</div>
                </div>
                <div className="reward-card pending">
                  <div className="rw-val">
                    {summaryQuery.isLoading && !summaryQuery.data ? (
                      <div className="ref-skel ref-skel-rw" />
                    ) : (
                      `${pendingPoints} pts`
                    )}
                  </div>
                  <div className="rw-lbl">{t('referral.rwPending', 'Pending')}</div>
                </div>
              </div>

              {/* Available Credit Points Balance */}
              <div className="credit-mini">
                <div className="cm-icon">
                  <Award size={18} />
                </div>
                <div className="cm-text">
                  <div className="cm-lbl">{t('referral.creditLabel', 'Available Credit Balance')}</div>
                  {summaryQuery.isLoading && !summaryQuery.data ? (
                    <div className="ref-skel ref-skel--green ref-skel-cm" style={{ marginTop: 3 }} />
                  ) : (
                    <div className="cm-val">{availableCredit} pts</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="ref-footer">
          <a
            href={summaryQuery.data?.program_rules.how_it_works_url || 'https://myvagon.com/systaseis'}
            target="_blank"
            rel="noopener noreferrer"
            className="ref-footer-how-btn"
          >
            <HelpCircle size={15} />
            <span>{t('referral.footerHow', 'How does referral work?')}</span>
          </a>
        </div>
      </div>

      {/* Floating Toast inside modal portal */}
      <div className={`ref-toast ${toastMessage ? 'show' : ''}`} role="status">
        {toastMessage}
      </div>
    </div>,
    document.body
  );
};

