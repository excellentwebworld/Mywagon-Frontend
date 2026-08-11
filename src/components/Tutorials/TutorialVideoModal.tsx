import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialVideo } from '../../api/types/tutorials';
import { getTutorialVideoTitle } from '../../api/types/tutorials';

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !video) return null;

  const videoTitle = getTutorialVideoTitle(video, lang);
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
            ✕
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
              <div className="tut-modal-nav">
                <button type="button" className="btn btn-secondary btn-sm" onClick={onPrev} disabled={!hasPrev}>
                  {previousLabel}
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={onNext} disabled={!hasNext}>
                  {nextLabel}
                </button>
              </div>
            </div>
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
