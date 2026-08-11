import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from './useTranslation';
import { useApp } from '../context/AppContext';
import { tutorialsService } from '../api/services/tutorialsService';
import type { TutorialVideo } from '../api/types/tutorials';
import {
  getContextualTutorialConfig,
  type ContextualTutorialKey,
} from '../config/contextualTutorials';

export function useContextualTutorial(tutorialKey: ContextualTutorialKey) {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const config = getContextualTutorialConfig(tutorialKey);

  const [loading, setLoading] = useState(false);
  const [modalVideo, setModalVideo] = useState<TutorialVideo | null>(null);
  const [modalPlaylist, setModalPlaylist] = useState<TutorialVideo[]>([]);

  const moduleTitle = t(config.titleKey);

  const modalIndex = useMemo(() => {
    if (!modalVideo) return -1;
    return modalPlaylist.findIndex((v) => v.id === modalVideo.id);
  }, [modalVideo, modalPlaylist]);

  const closeModal = useCallback(() => {
    setModalVideo(null);
    setModalPlaylist([]);
  }, []);

  const selectVideo = useCallback(
    (video: TutorialVideo) => {
      if (!video.embed_id) {
        showToast(t('tutorials.contextual.loadError'), 'error');
        return;
      }
      setModalVideo(video);
    },
    [showToast, t]
  );

  const prevVideo = useCallback(() => {
    if (modalIndex <= 0) return;
    const prev = modalPlaylist[modalIndex - 1];
    if (prev?.embed_id) setModalVideo(prev);
  }, [modalIndex, modalPlaylist]);

  const nextVideo = useCallback(() => {
    if (modalIndex < 0 || modalIndex >= modalPlaylist.length - 1) return;
    const next = modalPlaylist[modalIndex + 1];
    if (next?.embed_id) setModalVideo(next);
  }, [modalIndex, modalPlaylist]);

  const openTutorial = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const videos = await tutorialsService.fetchBySection(config.section);

      if (videos.length === 0) {
        showToast(t('tutorials.contextual.noTutorials'), 'info');
        return;
      }

      const playable = videos.filter((video) => video.embed_id);
      if (playable.length === 0) {
        showToast(t('tutorials.contextual.loadError'), 'error');
        return;
      }

      setModalPlaylist(playable);
      setModalVideo(playable[0]);
    } catch {
      showToast(t('tutorials.contextual.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [config.section, loading, showToast, t]);

  useEffect(() => {
    if (!modalVideo) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [modalVideo]);

  return {
    t,
    lang,
    loading,
    moduleTitle,
    modalVideo,
    modalPlaylist,
    modalIndex,
    hasPrev: modalIndex > 0,
    hasNext: modalIndex >= 0 && modalIndex < modalPlaylist.length - 1,
    openTutorial,
    closeModal,
    selectVideo,
    prevVideo,
    nextVideo,
  };
}
