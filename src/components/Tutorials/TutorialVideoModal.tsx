import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X } from 'lucide-react';
import type { TutorialVideo } from '../../api/types/tutorials';
import { getTutorialVideoTitle } from '../../api/types/tutorials';
import { useTranslation } from '../../hooks/useTranslation';
import { TutorialSharePopup, type TutorialShareChannel } from './TutorialSharePopup';

interface TutorialVideoModalProps {
  open: boolean;
  video: TutorialVideo | null;
  moduleTitle: string;
  playlist: TutorialVideo[];
  lang: string;
  onClose: () => void;
  onSelectVideo: (video: TutorialVideo) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  previousLabel: string;
  nextLabel: string;
  playlistLabel: string;
}

function getTutorialVideoShareUrl(embedId: string): string {
  return `https://youtu.be/${embedId}`;
}

function buildTutorialShareChannels(url: string, title: string): TutorialShareChannel[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — ${url}`);

  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`,
    },
  ];
}

export const TutorialVideoModal: React.FC<TutorialVideoModalProps> = ({
  open,
  video,
  moduleTitle,
  playlist,
  lang,
  onClose,
  onSelectVideo,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  previousLabel,
  nextLabel,
  playlistLabel,
}) => {
  const { t } = useTranslation();
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        if (shareOpen) {
          setShareOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, shareOpen]);

  useEffect(() => {
    if (!open) {
      setShareOpen(false);
    }
  }, [open, video?.id]);

  const videoTitle = video ? getTutorialVideoTitle(video, lang) : '';
  const shareUrl = video?.embed_id ? getTutorialVideoShareUrl(video.embed_id) : '';
  const shareChannels = useMemo(
    () => (shareUrl ? buildTutorialShareChannels(shareUrl, videoTitle) : []),
    [shareUrl, videoTitle]
  );

  if (!open || !video) return null;

  const embedSrc = video.embed_id
    ? `https://www.youtube.com/embed/${video.embed_id}?rel=0&modestbranding=1`
    : '';

  return createPortal(
    <div
      className={`tut-modal-overlay${open ? ' show' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tut-modal-title"
    >
      <div className="tut-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tut-modal-head">
          <div className="tut-modal-head-info">
            <h3 id="tut-modal-title">{videoTitle}</h3>
            <div className="tut-modal-head-sub">{moduleTitle}</div>
          </div>
          <button type="button" className="tut-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="tut-modal-body">
          <div className="tut-player-area">
            <div className="tut-embed">
              {embedSrc ? (
                <iframe
                  key={video.id}
                  src={embedSrc}
                  title={videoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>
            <div className="tut-modal-actions">
              {video.embed_id ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm tut-share-trigger"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 size={14} aria-hidden />
                  {t('tutorials.share')}
                </button>
              ) : null}
              <div className="tut-modal-nav">
                {hasPrev && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onPrev}>
                    {previousLabel}
                  </button>
                )}
                {hasNext && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={onNext}>
                    {nextLabel}
                  </button>
                )}
              </div>
            </div>

            <TutorialSharePopup
              open={shareOpen}
              title={t('tutorials.share')}
              url={shareUrl}
              copyLabel={t('tutorials.shareCopyLink')}
              copiedLabel={t('tutorials.linkCopied')}
              channels={shareChannels}
              onClose={() => setShareOpen(false)}
            />
          </div>
          <div className="tut-playlist">
            <div className="tut-playlist-head">
              {playlistLabel} · {playlist.length}
            </div>
            <div className="tut-playlist-list">
              {playlist.map((item, index) => {
                const isActive = item.id === video.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`tut-pl-item${isActive ? ' active' : ''}`}
                    onClick={() => onSelectVideo(item)}
                  >
                    <span className="tut-pl-num">{index + 1}</span>
                    <span className="tut-pl-title">{getTutorialVideoTitle(item, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
