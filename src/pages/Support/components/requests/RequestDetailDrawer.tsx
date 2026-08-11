import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportRequestDetail } from '../../types';
import { RequestStatusPill } from './RequestStatusPill';
import { RequestDetailDrawerSkeleton } from './RequestDetailDrawerSkeleton';

interface RequestDetailDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  detail: SupportRequestDetail | null;
  ticketNumber: string | null;
  onClose: () => void;
}

function formatDateTime(value: string, lang: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeBadgeClass(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('bug')) return 'type-bug';
  if (normalized.includes('feedback') || normalized.includes('feature')) return 'type-feature';
  if (normalized.includes('billing')) return 'type-billing';
  return 'type-other';
}

export function RequestDetailDrawer({
  open,
  loading,
  error,
  detail,
  ticketNumber,
  onClose,
}: RequestDetailDrawerProps) {
  const { t, lang } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = detail?.title ?? '';
  const displayTicket = ticketNumber ?? detail?.ticket_number ?? '';

  return createPortal(
    <>
      <div className="support-drawer-overlay show" role="presentation" onClick={onClose} />
      <aside
        className="support-drawer show"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-request-drawer-title"
      >
        <div className="support-drawer-head">
          <div className="support-drawer-head-copy">
            {displayTicket ? (
              <span className="support-drawer-ticket">{displayTicket}</span>
            ) : null}
            <h3 id="support-request-drawer-title">{title || displayTicket}</h3>
          </div>
          <button
            type="button"
            className="support-drawer-close"
            onClick={onClose}
            aria-label={t('support.requests.close')}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="support-drawer-body">
          {loading ? (
            <RequestDetailDrawerSkeleton />
          ) : error ? (
            <div className="support-drawer-alert support-drawer-alert--error">
              {t('support.requests.detailError')}
            </div>
          ) : detail ? (
            <>
              <div className="support-drawer-badges">
                <span className={`type-badge support-drawer-type ${typeBadgeClass(detail.type)}`}>
                  {detail.type}
                </span>
                <RequestStatusPill status={detail.status} label={detail.status_label} />
              </div>

              <div className="support-drawer-meta">
                <div className="support-drawer-meta-item">
                  <span className="support-drawer-meta-label">{t('support.requests.drawer.category')}</span>
                  <span className="support-drawer-meta-value">{detail.category}</span>
                </div>
                <div className="support-drawer-meta-item">
                  <span className="support-drawer-meta-label">{t('support.requests.drawer.created')}</span>
                  <span className="support-drawer-meta-value">{formatDateTime(detail.created_at, lang)}</span>
                </div>
                <div className="support-drawer-meta-item">
                  <span className="support-drawer-meta-label">{t('support.requests.drawer.updated')}</span>
                  <span className="support-drawer-meta-value">{formatDateTime(detail.updated_at, lang)}</span>
                </div>
              </div>

              <div className="support-drawer-section">
                <div className="support-drawer-section-label">{t('support.requests.drawer.description')}</div>
                <div className="support-drawer-description-card">
                  {detail.description.trim() ? detail.description : '—'}
                </div>
              </div>

              {detail.attachments.length > 0 ? (
                <div className="support-drawer-section">
                  <div className="support-drawer-section-label">{t('support.requests.drawer.attachments')}</div>
                  <div className="support-drawer-attachments">
                    {detail.attachments.map((attachment) => (
                      <a
                        key={attachment.url}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="support-drawer-attachment"
                      >
                        <img src={attachment.url} alt={t('support.requests.drawer.attachmentAlt')} />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </>,
    document.body
  );
}
