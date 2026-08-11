import React, { useState } from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';

interface RequestReplyComposerProps {
  canReply: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: (body: string) => Promise<boolean>;
}

export function RequestReplyComposer({ canReply, loading, error, onSubmit }: RequestReplyComposerProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  if (!canReply) {
    return (
      <div className="support-drawer-foot support-drawer-foot--closed">
        <p className="support-drawer-reply-closed">{t('support.requests.thread.replyClosed')}</p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = value.trim();
    if (!body || loading) return;

    const success = await onSubmit(body);
    if (success) {
      setValue('');
    }
  };

  return (
    <form className="support-drawer-foot" onSubmit={handleSubmit}>
      <textarea
        className="support-drawer-reply"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t('support.requests.thread.replyPlaceholder')}
        rows={2}
        maxLength={5000}
        disabled={loading}
      />
      <button type="submit" className="support-request-btn" disabled={loading || !value.trim()}>
        {loading ? t('support.requests.thread.sending') : t('support.requests.thread.send')}
      </button>
      {error ? <div className="support-drawer-reply-error">{t('support.requests.thread.replyError')}</div> : null}
    </form>
  );
}
