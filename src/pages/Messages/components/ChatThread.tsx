import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info,
  Paperclip,
  RotateCcw,
  ExternalLink,
  X,
  FileText,
  Download,
} from 'lucide-react';
import type { ChatMessage, Conversation } from '../types';
import { VoicePlayer } from './VoicePlayer';
import { useAuth } from '../../../context/AuthContext';
import { extractInitials } from '../../../api/services/chatService';
import { formatMessageTime } from '../../../utils/timezone';
import {
  formatShipmentAutoId,
  getDocumentDisplayName,
  isChatDocumentMessage,
  isChatImageMessage,
} from '../../../utils/chatPartnerUtils';

interface ChatThreadProps {
  messages: ChatMessage[];
  conversation: Conversation;
  isTyping: boolean;
  shipmentFilter: string;
  activeShipmentLabel?: string | null;
  activeShipmentDbId?: string | null;
  filterSids?: string[];
  onShipmentFilterChange: (sid: string) => void;
  onRetryMessage?: (msg: ChatMessage) => void;
  t: (key: string, defaultValue?: string) => string;
  lang: string;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  conversation,
  isTyping,
  shipmentFilter,
  activeShipmentLabel,
  activeShipmentDbId,
  filterSids = [],
  onShipmentFilterChange,
  onRetryMessage,
  t,
  lang,
}) => {
  const { user } = useAuth();
  const msgAreaRef = useRef<HTMLDivElement>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const navigate = useNavigate();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const userInitials = React.useMemo(() => {
    const first = (user?.first_name || '').trim();
    const last = (user?.last_name || '').trim();
    if (first || last) {
      const i1 = first ? Array.from(first)[0] : '';
      const i2 = last ? Array.from(last)[0] : '';
      const combined = `${i1}${i2}`.trim().toUpperCase();
      if (combined) return combined;
    }
    if (user?.company_name?.trim()) {
      return extractInitials(user.company_name);
    }
    return 'SV';
  }, [user?.first_name, user?.last_name, user?.company_name]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (msgAreaRef.current) {
      msgAreaRef.current.scrollTo({
        top: msgAreaRef.current.scrollHeight,
        behavior,
      });
    }
    if (msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!msgAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = msgAreaRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
    const t1 = setTimeout(() => scrollToBottom('smooth'), 60);
    const t2 = setTimeout(() => scrollToBottom('smooth'), 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('auto');
    const t1 = setTimeout(() => scrollToBottom('auto'), 50);
    const t2 = setTimeout(() => scrollToBottom('auto'), 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [conversation.id, shipmentFilter, scrollToBottom]);

  useEffect(() => {
    const el = msgAreaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    let previousHeight = el.scrollHeight;
    const ro = new ResizeObserver(() => {
      if (!el) return;
      if (el.scrollHeight !== previousHeight) {
        previousHeight = el.scrollHeight;
        if (isNearBottomRef.current) {
          scrollToBottom('smooth');
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxUrl]);

  const formatDisplaySid = (sid: string) => {
    if (sid === 'all') return t('chatModule.filterAllMessages') || 'All Messages';
    const formatted = formatShipmentAutoId(sid);
    if (formatted) return formatted;
    if (
      activeShipmentDbId &&
      /^\d+$/.test(String(sid).trim()) &&
      String(sid).trim() === String(activeShipmentDbId) &&
      activeShipmentLabel
    ) {
      return activeShipmentLabel;
    }
    return sid;
  };

  const allSids = React.useMemo(() => {
    const seen = new Set<string>();
    const sids: string[] = [];
    for (const sid of filterSids) {
      const display = formatShipmentAutoId(sid) || sid;
      const key = display.toUpperCase();
      if (!display || seen.has(key)) continue;
      seen.add(key);
      sids.push(display);
    }
    return sids;
  }, [filterSids]);

  const handleSidClick = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    navigate(`/manage-shipments?sid=${encodeURIComponent(formatDisplaySid(sid))}`);
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
              {formatDisplaySid(sid)}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Area */}
      <div className="msg-area" ref={msgAreaRef} onScroll={handleScroll}>
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
            const sidText = formatDisplaySid(
              m.shipmentId || conversation.activeShipmentId || (allSids.length > 0 ? allSids[0] : '') || ''
            );

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
          const isVoice =
            m.messages_type === 'voice' ||
            !!m.voiceUrl ||
            (typeof m.text === 'string' &&
              (m.text.includes('chat-voices') || /\.(webm|m4a|mp3|wav|ogg|caf)/i.test(m.text)));
          const isImage =
            !isVoice &&
            isChatImageMessage(m.messages_type, m.text, m.imageUrl);
          const isDocument =
            !isVoice &&
            !isImage &&
            (m.messages_type === 'document' || isChatDocumentMessage(m.messages_type, m.text, m.fileUrl));
          const docUrl = m.fileUrl || m.text || '';
          const docName = m.fileName || getDocumentDisplayName(docUrl);
          const docExt = (docName.split('.').pop() || 'file').toUpperCase();
          const imageSrc = m.imageUrl || m.text || '';
          const nonImageAttachments = (m.attachments || []).filter(
            (att) => !isChatImageMessage('media', att.url || att.name)
          );
          const hasRenderableBody =
            isVoice ||
            isImage ||
            isDocument ||
            Boolean(m.attachments?.length) ||
            Boolean(String(m.text || '').trim());

          if (!isSent && !hasRenderableBody) {
            return null;
          }

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
                    userInitials || m.initials || 'SV'
                  )
                ) : (
                  conversation.avatarUrl ? (
                    <img src={conversation.avatarUrl} alt={conversation.name} style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    conversation.initials || extractInitials(conversation.name)
                  )
                )}
              </div>
              <div className="msg-content">
                <div className="msg-sender">{isSent ? 'You' : conversation.name}</div>
                <div className={`msg-bubble ${isImage ? 'msg-bubble-image' : ''} ${isDocument ? 'msg-bubble-doc' : ''}`}>
                  {isVoice ? (
                    <VoicePlayer voiceUrl={m.voiceUrl || m.text || ''} duration={m.duration} isSent={isSent} />
                  ) : isImage ? (
                    <button
                      type="button"
                      className="msg-image-btn"
                      onClick={() => imageSrc && setLightboxUrl(imageSrc)}
                      title={t('chatModule.viewImage') || 'View image'}
                    >
                      <img
                        src={imageSrc}
                        alt={t('chatModule.photo', 'Photo')}
                        className="msg-image"
                        onLoad={() => {
                          if (isNearBottomRef.current) {
                            scrollToBottom('smooth');
                          }
                        }}
                      />
                    </button>
                  ) : isDocument ? (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="msg-doc-card"
                      title={docName}
                      download={docName}
                    >
                      <div className={`msg-doc-icon-wrap ${docExt.toLowerCase()}`}>
                        <FileText size={20} />
                        <span className="msg-doc-badge">{docExt.slice(0, 4)}</span>
                      </div>
                      <div className="msg-doc-info">
                        <span className="msg-doc-name">{docName}</span>
                        <div className="msg-doc-meta">
                          {m.fileSize && <span className="msg-doc-size">{m.fileSize}</span>}
                          {m.fileSize && <span className="msg-doc-dot">•</span>}
                          <span className="msg-doc-action-text">{t('chatModule.openDocument', 'Open')}</span>
                        </div>
                      </div>
                      <div className="msg-doc-action-btn" title={t('chatModule.downloadDocument', 'Download')}>
                        <Download size={15} />
                      </div>
                    </a>
                  ) : (
                    <span>{m.text}</span>
                  )}

                  {nonImageAttachments.length > 0 && (
                    <div className="msg-attach-list">
                      {nonImageAttachments.map((att, aIdx) => (
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
              {conversation.initials || extractInitials(conversation.name)}
            </div>
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={msgEndRef} className="msg-scroll-anchor" style={{ height: 20, minHeight: 20, flexShrink: 0 }} />
      </div>

      {lightboxUrl && (
        <div
          className="msg-image-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="msg-image-lightbox-close"
            onClick={() => setLightboxUrl(null)}
            title={t('chatModule.close') || 'Close'}
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt={t('chatModule.photo') || 'Photo'}
            className="msg-image-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            className="msg-image-lightbox-open"
            href={lightboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {t('chatModule.openInNewTab', 'Open in new tab')}
          </a>
        </div>
      )}
    </div>
  );
};
