import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportRequestThreadMessage } from '../../types';

interface RequestThreadProps {
  messages: SupportRequestThreadMessage[];
}

function formatDateTime(value: string, lang: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RequestThread({ messages }: RequestThreadProps) {
  const { t, lang } = useTranslation();

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="support-drawer-thread">
      <div className="support-drawer-thread-title">{t('support.requests.thread.conversation')}</div>
      {messages.map((message) => (
        <div
          key={`${message.id}-${message.created_at}`}
          className={`support-thread-msg ${message.author_type === 'shipper' ? 'user' : 'agent'}`}
        >
          <div className="support-thread-msg-head">
            <span className="who">{message.author_label}</span>
            <span className="when">{formatDateTime(message.created_at, lang)}</span>
          </div>
          <div className="support-thread-msg-body">{message.body}</div>
        </div>
      ))}
    </div>
  );
}
