import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../../api/services/chatService';
import { useTranslation } from '../../hooks/useTranslation';
import type { Conversation } from '../../pages/Messages/types';

const PREVIEW_LIMIT = 5;

export const MessagesPreview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatService
      .getConversations()
      .then((list) => {
        if (!cancelled) setConversations((list ?? []).slice(0, PREVIEW_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openConversation = (c: Conversation) => {
    if (c.partnerId != null && c.partnerType) {
      const params = new URLSearchParams({
        userId: String(c.partnerId),
        userType: c.partnerType,
      });
      if (c.name) params.set('name', c.name);
      navigate(`/messages?${params.toString()}`);
      return;
    }
    navigate('/messages');
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{t('dashMessagesTitle')}</span>
        </h3>
        <span className="card-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/messages')}>
          {t('dashViewMessages')}
        </span>
      </div>

      {loading && <div className="dash-messages-empty">{t('loading')}</div>}

      {!loading && conversations.length === 0 && (
        <div className="dash-messages-empty">
          <p>{t('dashNoMessages')}</p>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="dash-messages-list">
          {conversations.map((c) => (
            <button
              key={String(c.id)}
              type="button"
              className="dash-msg-row"
              onClick={() => openConversation(c)}
            >
              <div className="dash-msg-avatar">
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" />
                ) : (
                  c.initials || '?'
                )}
              </div>
              <div className="dash-msg-body">
                <div className="dash-msg-top">
                  <span className="dash-msg-name">{c.name || t('dashMessagesTitle')}</span>
                  <span className="dash-msg-time">{c.lastTime}</span>
                </div>
                <div className="dash-msg-preview">{c.lastMsg || '—'}</div>
              </div>
              {c.unread > 0 ? <span className="dash-msg-unread">{c.unread > 99 ? '99+' : c.unread}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
