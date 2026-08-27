import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info,
  Paperclip,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import type { ChatMessage, Conversation } from '../types';
import { VoicePlayer } from './VoicePlayer';
import { useAuth } from '../../../context/AuthContext';
import { formatMessageTime } from '../../../utils/timezone';

interface ChatThreadProps {
  messages: ChatMessage[];
  conversation: Conversation;
  isTyping: boolean;
  shipmentFilter: string;
  onShipmentFilterChange: (sid: string) => void;
  onRetryMessage?: (msg: ChatMessage) => void;
  t: (key: string) => string;
  lang: string;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  conversation,
  isTyping,
  shipmentFilter,
  onShipmentFilterChange,
  onRetryMessage,
  t,
  lang,
}) => {
  const { user } = useAuth();
  const msgEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Build unique chronological SIDs list from conversation chips and messages (most recent at top)
  const allSids = React.useMemo(() => {
    const sids: string[] = [];
    if (conversation.chips && Array.isArray(conversation.chips)) {
      conversation.chips.forEach((sid) => {
        if (sid && !sids.includes(sid)) sids.push(sid);
      });
    }
    messages.forEach((m) => {
      if (m.shipmentId && !sids.includes(m.shipmentId)) {
        sids.push(m.shipmentId);
      }
    });
    return sids;
  }, [conversation.chips, messages]);

  const handleSidClick = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    navigate(`/manage-shipments?sid=${encodeURIComponent(sid)}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Context Filter Bar */}
      <div className="ctx-bar">
        <span className="ctx-label">{t('chatModule.filterBy') || 'Filter by:'}</span>
        <select
          className="ctx-select"
          value={shipmentFilter}
          onChange={(e) => onShipmentFilterChange(e.target.value)}
        >
          <option value="all">{t('chatModule.filterAllMessages') || 'All Messages'}</option>
          {allSids.map((sid) => (
            <option key={sid} value={sid}>
              {sid}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Area */}
      <div className="msg-area">
        {messages.length === 0 && !isTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', textAlign: 'center', color: 'var(--t3, #8E8E9A)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: '#6C3AED' }}>
              <Info size={24} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1, #121217)', marginBottom: 4 }}>
              {t('chatModule.noMessagesYet') || 'No messages yet'}
            </p>
            <p style={{ fontSize: 12, maxWidth: 300, margin: 0 }}>
              {t('chatModule.noMessagesDesc') || `Send a message below or use quick templates to start the conversation with ${conversation.name}.`}
            </p>
          </div>
        )}
        {messages.map((m, idx) => {
          if (m.type === 'date') {
            let txt = lang === 'el' ? (m.textEL || m.textEN) : (m.textEN || m.textEL);
            if (m.key === 'today' || m.textEN === 'Today' || m.textEL === 'Today') {
              txt = lang === 'el' ? 'Σήμερα' : 'Today';
            } else if (m.key === 'yesterday' || m.textEN === 'Yesterday' || m.textEL === 'Yesterday') {
              txt = lang === 'el' ? 'Χθες' : 'Yesterday';
            }
            return (
              <div key={idx} className="msg-date-sep">
                {txt}
              </div>
            );
          }

          if (m.type === 'system') {
            const sidText = m.shipmentId || conversation.activeShipmentId || (allSids.length > 0 ? allSids[0] : null);

            return (
              <div key={idx} className="msg-system-wrap">
                {sidText ? (
                  <div className="msg-linked-oval" onClick={(e) => handleSidClick(e, sidText)}>
                    <Info size={13} />
                    <span>
                      {t('chatModule.chatLinkedTo') || 'Chat Linked To'}{' '}
                      <strong className="linked-sid-link">
                        {sidText} <ExternalLink size={11} style={{ display: 'inline', marginLeft: 2 }} />
                      </strong>
                    </span>
                  </div>
                ) : (
                  <div className={`msg-system ${m.variant || ''}`}>
                    <Info size={14} />
                    <span>{m.customText || (m.key ? t(`chatModule.${m.key}`) : '')}</span>
                  </div>
                )}
              </div>
            );
          }

          const isSent = m.type === 'sent';
          const isVoice = m.messages_type === 'voice' || !!m.voiceUrl || (typeof m.text === 'string' && (m.text.includes('chat-voices') || /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(m.text)));

          return (
            <div key={idx} className={`msg-row ${m.type} ${m.isFailed ? 'failed' : ''}`}>
              <div
                className="msg-av"
                style={{
                  background: isSent
                    ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
                    : 'linear-gradient(135deg, #6C3AED, #8B5CF6)',
                }}
              >
                {isSent ? (
                  user?.profile_picture ? (
                    <img src={user.profile_picture} alt="You" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    m.initials || 'ΕΓ'
                  )
                ) : (
                  conversation.avatarUrl ? (
                    <img src={conversation.avatarUrl} alt={conversation.name} style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    conversation.initials || 'ΗΔ'
                  )
                )}
              </div>
              <div className="msg-content">
                <div className="msg-sender">{isSent ? 'You' : conversation.name}</div>
                <div className="msg-bubble">
                  {isVoice ? (
                    <VoicePlayer voiceUrl={m.voiceUrl || m.text || ''} duration={m.duration} isSent={isSent} />
                  ) : (
                    <span>{m.text}</span>
                  )}

                  {m.attachments && m.attachments.length > 0 && (
                    <div className="msg-attach-list">
                      {m.attachments.map((att, aIdx) => (
                        <div key={aIdx} className="msg-attach" onClick={() => att.url && window.open(att.url, '_blank')}>
                          <Paperclip size={14} />
                          <span className="ma-name">{att.name}</span>
                          <span className="ma-size">{att.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="msg-meta">
                  <span className="msg-time">{formatMessageTime(m.created_at || m.time)}</span>
                  {m.isFailed && (
                    <button
                      type="button"
                      className="msg-retry-btn"
                      onClick={() => onRetryMessage && onRetryMessage(m)}
                      title="Failed to send. Click to retry"
                    >
                      <RotateCcw size={12} />
                      <span>{t('chatModule.retrySend') || 'Retry'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="typing-indicator">
            <div
              className="msg-av"
              style={{ background: 'linear-gradient(135deg, #6C3AED, #8B5CF6)' }}
            >
              {conversation.initials}
            </div>
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={msgEndRef} />
      </div>
    </div>
  );
};
