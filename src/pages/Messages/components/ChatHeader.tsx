import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  Phone,
  Mail,
  User,
  Copy,
  Check,
} from 'lucide-react';
import type { Conversation } from '../types';
import { useTransporterProfileOptional } from '../../../components/TransporterProfile/TransporterProfileContext';

interface ChatHeaderProps {
  conversation: Conversation;
  ctxPaneOpen: boolean;
  onToggleCtxPane: () => void;
  onBackMobile: () => void;
  onShowToast: (msg: string) => void;
  t: (key: string) => string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  ctxPaneOpen,
  onToggleCtxPane,
  onBackMobile,
  onShowToast,
  t,
}) => {
  const [phonePopoverOpen, setPhonePopoverOpen] = useState(false);
  const [emailPopoverOpen, setEmailPopoverOpen] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [conversation.id, conversation.avatarUrl]);

  const phoneRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);

  const { openTransporterProfile } = useTransporterProfileOptional();

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) {
        setPhonePopoverOpen(false);
      }
      if (emailRef.current && !emailRef.current.contains(e.target as Node)) {
        setEmailPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBadgeLabel = (type: string) => {
    if (type === 'company') return t('chatModule.badgeCompany');
    if (type === 'freelancer') return t('chatModule.badgeFreelancer');
    if (type === 'driver') return t('chatModule.badgeDriver');
    if (type === 'admin') return 'Support';
    return type;
  };

  const handleCopyPhone = () => {
    const phone = conversation.phone || '+30 694 123 4567';
    navigator.clipboard.writeText(phone);
    setPhoneCopied(true);
    onShowToast(`📋 ${t('chatModule.phoneCopied') || 'Phone number copied to clipboard'}`);
    setTimeout(() => setPhoneCopied(false), 2000);
  };

  const handleCopyEmail = () => {
    const email = conversation.email || 'partner@myvagon.com';
    navigator.clipboard.writeText(email);
    setEmailCopied(true);
    onShowToast(`📋 ${t('chatModule.emailCopied') || 'Email address copied to clipboard'}`);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleOpenProfile = () => {
    const numericId = typeof conversation.partnerId === 'number'
      ? conversation.partnerId
      : (typeof conversation.id === 'number' ? conversation.id : parseInt(String(conversation.id).replace(/\D/g, '') || '1', 10));

    const transporterType = conversation.type === 'company' ? 'carrier' : 'driver';

    openTransporterProfile({
      id: numericId,
      type: transporterType,
      name: conversation.name,
    });
  };

  return (
    <div className="chat-head">
      <button
        type="button"
        className="ch-btn mobile-back-btn"
        onClick={onBackMobile}
        aria-label="Go back"
      >
        <ChevronLeft size={18} />
      </button>

      <div className={`ch-avatar ${conversation.avatarClass || 'carrier'}`}>
        {conversation.avatarUrl && !imgError ? (
          <img
            src={conversation.avatarUrl}
            alt={conversation.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }}
          />
        ) : (
          conversation.initials || 'ΗΔ'
        )}
      </div>

      <div className="ch-info">
        <div className="ch-name">
          {conversation.name}
          <span className={`ci-badge ${conversation.type}`}>
            {getBadgeLabel(conversation.type)}
          </span>
          {conversation.isPartner && (
            <span className="ci-badge partner-badge">
              {t('chatModule.partnerBadge') || 'Partner'}
            </span>
          )}
        </div>
      </div>

      <div className="ch-actions">
        {/* Phone Popover */}
        <div className="ch-popover-anchor" ref={phoneRef}>
          <button
            type="button"
            className={`ch-btn ${phonePopoverOpen ? 'active' : ''}`}
            title={t('chatModule.phoneTitle') || 'Phone Number'}
            onClick={() => {
              setPhonePopoverOpen((prev) => !prev);
              setEmailPopoverOpen(false);
            }}
          >
            <Phone size={16} />
          </button>

          {phonePopoverOpen && (
            <div className="ch-popover">
              <div className="ch-popover-label">{t('chatModule.phoneLabel') || 'Phone Number'}</div>
              <div className="ch-popover-val-row">
                <span className="ch-popover-val">{conversation.phone || '+30 694 123 4567'}</span>
                <button
                  type="button"
                  className="ch-popover-copy-btn"
                  onClick={handleCopyPhone}
                  title="Copy to clipboard"
                >
                  {phoneCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email Popover */}
        <div className="ch-popover-anchor" ref={emailRef}>
          <button
            type="button"
            className={`ch-btn ${emailPopoverOpen ? 'active' : ''}`}
            title={t('chatModule.emailTitle') || 'Email Address'}
            onClick={() => {
              setEmailPopoverOpen((prev) => !prev);
              setPhonePopoverOpen(false);
            }}
          >
            <Mail size={16} />
          </button>

          {emailPopoverOpen && (
            <div className="ch-popover">
              <div className="ch-popover-label">{t('chatModule.emailLabel') || 'Email Address'}</div>
              <div className="ch-popover-val-row">
                <span className="ch-popover-val">{conversation.email || 'info@partner-trans.gr'}</span>
                <button
                  type="button"
                  className="ch-popover-copy-btn"
                  onClick={handleCopyEmail}
                  title="Copy to clipboard"
                >
                  {emailCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Button */}
        <button
          type="button"
          className="ch-btn"
          title={t('chatModule.profileTitle') || 'View Transporter Profile'}
          onClick={handleOpenProfile}
        >
          <User size={16} />
        </button>

        {/* Context Pane Toggle */}
        <button
          type="button"
          className={`ch-btn ${ctxPaneOpen ? 'active' : ''}`}
          id="ctxToggle"
          title="Shipment context"
          onClick={onToggleCtxPane}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </button>
      </div>
    </div>
  );
};
