import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  confirmLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  confirmLoading = false,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Set colors and icons based on type
  let titleColor = 'var(--text-primary)';
  let iconBg = 'var(--info-bg)';
  let iconStroke = 'var(--info)';
  let confirmBtnClass = 'btn-primary';

  if (type === 'danger') {
    titleColor = 'var(--danger)';
    iconBg = 'var(--danger-bg)';
    iconStroke = 'var(--danger)';
    confirmBtnClass = 'btn-danger';
  } else if (type === 'warning') {
    titleColor = 'var(--warning)';
    iconBg = 'var(--warning-bg)';
    iconStroke = 'var(--warning)';
    confirmBtnClass = 'btn-primary'; // Usually warning button falls back to primary or custom class
  } else if (type === 'success') {
    titleColor = 'var(--success)';
    iconBg = 'var(--success-bg)';
    iconStroke = 'var(--success)';
    confirmBtnClass = 'btn-primary';
  }

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        );
      case 'warning':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'success':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return createPortal(
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2 style={{ color: titleColor }}>{title}</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-md)',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            {getIcon()}
          </div>
          {message}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={confirmLoading}>
            {cancelText}
          </button>
          <button type="button" className={`btn ${confirmBtnClass}`} onClick={onConfirm} disabled={confirmLoading}>
            {confirmLoading ? '...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
