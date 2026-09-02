import React, { useRef } from 'react';
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
import type { QuickTemplate, ShipmentContextInfo } from '../types';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

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
  onShowToast,
  t,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onAttachFile) {
        onAttachFile(file);
      } else {
        onShowToast(`📎 ${t('chatModule.toastAttach') || 'Attached'}: ${file.name}`);
      }
      e.target.value = '';
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

  const linkedSid = shipmentContext?.sid || activeShipmentId;

  return (
    <div className="composer">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
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
          {shipmentContext?.origin && shipmentContext?.destination && (
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
              title="Attach file"
              onClick={handleAttachClick}
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              className="cmp-tool"
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

            <TemplateDropdown
              templates={templates}
              isOpen={tplDropdownOpen}
              onSelectTemplate={onSelectTemplate}
              onClose={onCloseTemplates}
              t={t}
            />
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
