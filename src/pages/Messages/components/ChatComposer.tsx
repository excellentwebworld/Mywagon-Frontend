import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  Paperclip,
  LayoutTemplate,
  Send,
  Mic,
  Trash2,
  Square,
  Play,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { TemplateDropdown } from './TemplateDropdown';
import type { QuickTemplate, ShipmentContextInfo, ChatContext } from '../types';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { formatShipmentAutoId } from '../../../utils/chatPartnerUtils';

interface ChatComposerProps {
  messageInput: string;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
  onSendVoiceNote: (audioBlob: Blob, durationFormatted: string) => void;
  onAttachFile?: (file: File) => void;
  templates: QuickTemplate[];
  tplDropdownOpen: boolean;
  onToggleTemplates: () => void;
  onCloseTemplates: () => void;
  onSelectTemplate: (tpl: QuickTemplate) => void;
  shipmentContext: ShipmentContextInfo | null;
  activeShipmentId?: string;
  chatContext?: ChatContext | null;
  onShowToast: (msg: string) => void;
  t: (key: string) => string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  messageInput,
  onInputChange,
  onSendMessage,
  onSendVoiceNote,
  onAttachFile,
  templates,
  tplDropdownOpen,
  onToggleTemplates,
  onCloseTemplates,
  onSelectTemplate,
  shipmentContext,
  activeShipmentId,
  chatContext,
  onShowToast,
  t,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tplToggleRef = useRef<HTMLButtonElement>(null);
  const tplDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    isRecording,
    isPreviewing,
    recordingTime,
    previewDuration,
    previewCurrentTime,
    isPlayingPreview,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    discardPreview,
    togglePlayPreview,
    seekPreview,
    formatTimer,
  } = useVoiceRecorder();

  useEffect(() => {
    if (!tplDropdownOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (tplDropdownRef.current?.contains(target)) return;
      if (tplToggleRef.current?.contains(target)) return;
      onCloseTemplates();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseTemplates();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [tplDropdownOpen, onCloseTemplates]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1 MB (as requested)
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isImage =
      ALLOWED_IMAGE_TYPES.includes(file.type) ||
      /\.(jpe?g|png|gif|webp)$/i.test(file.name);

    const isDocument =
      ALLOWED_DOC_TYPES.includes(file.type) ||
      /\.(pdf|docx?|xlsx?|txt|csv)$/i.test(file.name);

    if (!isImage && !isDocument) {
      onShowToast(t('chatModule.fileTypeInvalid', 'Please select an image or document (JPG, PNG, PDF, DOC, XLS, TXT, CSV).'));
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      onShowToast(t('chatModule.fileTooLarge', 'File size must be 1 MB or smaller.'));
      return;
    }

    if (onAttachFile) {
      onAttachFile(file);
    } else {
      const icon = isImage ? '📷' : '📄';
      onShowToast(`${icon} ${t('chatModule.toastAttach', 'Attached')}: ${file.name}`);
    }
  };

  const handleSendVoice = () => {
    if (!audioBlob) return;
    // Use actual seconds from previewDuration (audio metadata) or fallback to recordingTime
    const durSeconds = (Number.isFinite(previewDuration) && previewDuration > 0)
      ? previewDuration
      : (recordingTime > 0 ? recordingTime : 1);
    // Send duration as milliseconds string — same format Laravel uses:
    // voiceDurationMs = Math.round(recordedDuration * 1000) → String(voiceDurationMs)
    const durationMs = String(Math.round(durSeconds * 1000));
    onSendVoiceNote(audioBlob, durationMs);
    discardPreview();
  };

  const handleSidNavigation = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    navigate(`/manage-shipments?sid=${encodeURIComponent(sid)}`);
  };

  const linkedSid =
    chatContext?.mode === 'shipment'
      ? (formatShipmentAutoId(shipmentContext?.sid) ||
          formatShipmentAutoId(chatContext?.shipmentLabel) ||
          formatShipmentAutoId(activeShipmentId))
      : null;

  return (
    <div className="composer">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
        onChange={handleFileChange}
      />

      {/* Linked to SID Quick Access Bar */}
      {linkedSid && (
        <div
          className="cmp-link"
          onClick={(e) => handleSidNavigation(e, linkedSid)}
          title="Click to view shipment details"
        >
          <Link2 size={13} />
          <span>{t('chatModule.linkedTo') || 'Linked to'}</span>
          <strong className="cmp-link-sid">
            {linkedSid}
          </strong>{' '}
          {shipmentContext?.origin &&
            shipmentContext?.destination &&
            shipmentContext.origin !== '—' &&
            shipmentContext.destination !== '—' &&
            shipmentContext.origin !== 'Origin' &&
            shipmentContext.destination !== 'Destination' && (
              <span>· {shipmentContext.origin} → {shipmentContext.destination}</span>
            )}
          <ExternalLink size={11} style={{ marginLeft: 4, opacity: 0.7 }} />
        </div>
      )}

      {/* Active Recording Bar */}
      {isRecording && (
        <div className="cmp-voice-recording-bar">
          <div className="cvr-status">
            <span className="cvr-pulse-dot" />
            <span className="cvr-timer">{formatTimer(recordingTime)}</span>
            <span className="cvr-recording-text">{t('chatModule.recordingVoice') || 'Recording voice note...'}</span>
          </div>

          <div className="cvr-controls">
            <button
              type="button"
              className="cvr-btn cancel"
              onClick={cancelRecording}
              title={t('chatModule.cancelRecording') || 'Cancel'}
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              className="cvr-btn stop"
              onClick={stopRecording}
              title={t('chatModule.stopAndPreview') || 'Stop & Preview'}
            >
              <Square size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Preview Voice Note Bar */}
      {isPreviewing && !isRecording && (
        <div className="cmp-voice-preview-bar">
          <button
            type="button"
            className="cvp-play-btn"
            onClick={togglePlayPreview}
            title={isPlayingPreview ? 'Pause' : 'Play'}
          >
            {isPlayingPreview ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
          </button>

          <div
            className="cvp-track"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              seekPreview(Math.max(0, Math.min(100, pct)));
            }}
          >
            <div
              className="cvp-progress"
              style={{
                width: `${previewDuration > 0 ? (previewCurrentTime / previewDuration) * 100 : 0}%`,
              }}
            />
          </div>

          <span className="cvp-time">
            {formatTimer(
              Math.round(
                isPlayingPreview
                  ? (Number.isFinite(previewCurrentTime) ? previewCurrentTime : 0)
                  : (Number.isFinite(previewDuration) && previewDuration > 0 ? previewDuration : (recordingTime > 0 ? recordingTime : 1))
              )
            )}
          </span>

          <div className="cvp-actions">
            <button
              type="button"
              className="cvp-btn discard"
              onClick={discardPreview}
              title={t('chatModule.discardVoice') || 'Discard'}
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              className="cvp-btn send"
              onClick={handleSendVoice}
              title={t('chatModule.sendVoiceNote') || 'Send Voice Note'}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Standard Text Composer */}
      {!isRecording && !isPreviewing && (
        <div className="cmp-row">
          <div className="cmp-tools">
            <button
              type="button"
              className="cmp-tool"
              title={t('chatModule.attachImage') || 'Attach image'}
              onClick={handleAttachClick}
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              ref={tplToggleRef}
              className={`cmp-tool ${tplDropdownOpen ? 'active' : ''}`}
              title="Templates"
              onClick={onToggleTemplates}
            >
              <LayoutTemplate size={18} />
            </button>

            <button
              type="button"
              className="cmp-tool voice-mic-btn"
              title={t('chatModule.recordVoice') || 'Record Voice Note'}
              onClick={startRecording}
            >
              <Mic size={18} />
            </button>
          </div>

          <div className="cmp-input-wrap">
            <textarea
              ref={textareaRef}
              className="cmp-input"
              rows={1}
              value={messageInput}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t('chatModule.composerPlaceholder')}
            />

            <div ref={tplDropdownRef}>
              <TemplateDropdown
                templates={templates}
                isOpen={tplDropdownOpen}
                onSelectTemplate={onSelectTemplate}
                onClose={onCloseTemplates}
                t={t}
              />
            </div>
          </div>

          <button
            type="button"
            className="cmp-send"
            onClick={() => onSendMessage()}
            disabled={!messageInput.trim()}
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
