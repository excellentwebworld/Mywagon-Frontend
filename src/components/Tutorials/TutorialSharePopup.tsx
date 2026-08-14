import React, { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface TutorialShareChannel {
  id: string;
  label: string;
  href: string;
}

interface TutorialSharePopupProps {
  open: boolean;
  title: string;
  url: string;
  copyLabel: string;
  copiedLabel: string;
  channels: TutorialShareChannel[];
  onClose: () => void;
  onCopy?: () => void;
}

export const TutorialSharePopup: React.FC<TutorialSharePopupProps> = ({
  open,
  title,
  url,
  copyLabel,
  copiedLabel,
  channels,
  onClose,
  onCopy,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return undefined;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      popupRef.current?.focus();
    }
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopy?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; user can still select the URL field.
    }
  }, [url, onCopy]);

  if (!open) return null;

  return (
    <div
      className="tut-share-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        ref={popupRef}
        className="tut-share-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tut-share-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tut-share-head">
          <h4 id="tut-share-title">{title}</h4>
          <button
            type="button"
            className="tut-share-close"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="tut-share-url-row">
          <input
            type="text"
            className="tut-share-url"
            value={url}
            readOnly
            aria-label={title}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" className="btn btn-secondary btn-sm tut-share-copy" onClick={handleCopy}>
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>

        <ul className="tut-share-list">
          {channels.map((channel) => (
            <li key={channel.id}>
              <a
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tut-share-link"
              >
                {channel.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
