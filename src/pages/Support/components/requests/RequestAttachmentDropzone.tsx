import React, { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { RequestAttachmentPreview } from '../../types';

interface RequestAttachmentDropzoneProps {
  attachments: RequestAttachmentPreview[];
  maxAttachments: number;
  errorKey: string | null;
  disabled?: boolean;
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
}

export function RequestAttachmentDropzone({
  attachments,
  maxAttachments,
  errorKey,
  disabled,
  onAdd,
  onRemove,
}: RequestAttachmentDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const errorMessage = errorKey ? t(`support.request.errors.${errorKey}`) : null;

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;
    onAdd(files);
  };

  return (
    <div className="request-attachments">
      <div
        className={`drop-zone${dragOver ? ' dragover' : ''}${disabled ? ' drop-zone--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="dz-icon-wrap" aria-hidden>
          <Paperclip size={22} strokeWidth={1.75} />
        </div>
        <div className="dz-text">{t('support.request.attachmentsDrop')}</div>
        <div className="dz-hint">
          {t('support.request.attachmentsHint', { max: maxAttachments })}
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      {attachments.length > 0 ? (
        <div className="attachment-previews">
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
    </div>
  );
}
