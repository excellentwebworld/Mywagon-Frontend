import React, { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { RequestAttachmentPreview } from '../../types';

interface RequestAttachmentDropzoneProps {
  attachments: RequestAttachmentPreview[];
  maxAttachments: number;
  maxAttachmentSizeMb: number;
  errorKey: string | null;
  disabled?: boolean;
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
}

export function RequestAttachmentDropzone({
  attachments,
  maxAttachments,
  maxAttachmentSizeMb,
  errorKey,
  disabled,
  onAdd,
  onRemove,
}: RequestAttachmentDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const errorMessage = errorKey ? t(`support.request.errors.${errorKey}`) : null;
  const atMax = attachments.length >= maxAttachments;
  const dropDisabled = disabled || atMax;

  const handleFiles = (files: FileList | null) => {
    if (!files || dropDisabled) return;
    onAdd(files);
  };

  return (
    <div className="request-attachments">
      {attachments.length > 0 ? (
        <div className="attachment-previews" aria-live="polite">
          {attachments.map((item) => (
            <div key={item.id} className="attachment-preview">
              <img src={item.previewUrl} alt={item.file.name} />
              <button
                type="button"
                className="attachment-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                aria-label={t('support.request.removeAttachment')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={`drop-zone${dragOver ? ' dragover' : ''}${dropDisabled ? ' drop-zone--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dropDisabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !dropDisabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!dropDisabled) inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={dropDisabled ? -1 : 0}
        aria-disabled={dropDisabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          multiple
          hidden
          disabled={dropDisabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="dz-icon-wrap" aria-hidden>
          <Paperclip size={22} strokeWidth={1.75} />
        </div>
        <div className="dz-text">
          {atMax ? t('support.request.attachmentsMaxReached') : t('support.request.attachmentsDrop')}
        </div>
        <div className="dz-hint">
          {t('support.request.attachmentsHint', {
            max: maxAttachments,
            maxMb: maxAttachmentSizeMb,
          })}
        </div>
      </div>

      <div
        className={`request-attachments-count${atMax ? ' is-full' : ''}`}
        aria-live="polite"
      >
        {t('support.request.attachmentsCount', {
          count: attachments.length,
          max: maxAttachments,
        })}
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
    </div>
  );
}
