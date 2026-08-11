import React, { useEffect } from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportRequestDetail } from '../../types';
import { RequestStatusPill } from './RequestStatusPill';
import { RequestThread } from './RequestThread';
import { RequestReplyComposer } from './RequestReplyComposer';

interface RequestDetailDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  detail: SupportRequestDetail | null;
  ticketNumber: string | null;
  replyLoading: boolean;
  replyError: string | null;
  onClose: () => void;
  onSubmitReply: (body: string) => Promise<boolean>;
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
  replyLoading,
  replyError,
  onClose,
  onSubmitReply,
}: RequestDetailDrawerProps) {
  const { t, lang } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = detail?.title ?? ticketNumber ?? '';

  return (
    <>
      <div className="support-drawer-overlay show" role="presentation" onClick={onClose} />
      <aside
        className="support-drawer show"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-request-drawer-title"
      >
        <div className="support-drawer-head">
          <h3 id="support-request-drawer-title">
            {ticketNumber ? `${ticketNumber} — ${title}` : title}
          </h3>
          <button type="button" className="support-drawer-close" onClick={onClose} aria-label={t('support.requests.close')}>
            ×
          </button>
        </div>

        <div className="support-drawer-body">
          {loading ? (
            <div className="kb-message">{t('support.requests.loadingDetail')}</div>
          ) : error ? (
            <div className="kb-message kb-message--error">{t('support.requests.detailError')}</div>
          ) : detail ? (
            <>
              <div className="support-drawer-badges">
                <span className={`type-badge ${typeBadgeClass(detail.type)}`}>{detail.type}</span>
                <RequestStatusPill status={detail.status} label={detail.status_label} />
              </div>

              <div className="support-drawer-field">
                <div className="df-label">{t('support.requests.drawer.category')}</div>
                <div className="df-val">{detail.category}</div>
              </div>

              <div className="support-drawer-field">
                <div className="df-label">{t('support.requests.drawer.created')}</div>
                <div className="df-val">{formatDateTime(detail.created_at, lang)}</div>
              </div>

              <div className="support-drawer-field">
                <div className="df-label">{t('support.requests.drawer.updated')}</div>
                <div className="df-val">{formatDateTime(detail.updated_at, lang)}</div>
              </div>

              {detail.attachments.length > 0 ? (
                <div className="support-drawer-field">
                  <div className="df-label">{t('support.requests.drawer.attachments')}</div>
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

              <RequestThread messages={detail.thread} />
            </>
          ) : null}
        </div>

        {detail && !loading && !error ? (
          <RequestReplyComposer
            canReply={detail.can_reply}
            loading={replyLoading}
            error={replyError}
            onSubmit={onSubmitReply}
          />
        ) : null}
      </aside>
    </>
  );
}
