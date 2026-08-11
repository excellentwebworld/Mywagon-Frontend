import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../../../hooks/useTranslation';
import { useApp } from '../../../context/AppContext';
import { tutorialsService } from '../../../api/services/tutorialsService';
import type { TutorialVideo } from '../../../api/types/tutorials';
import { getModuleConfigBySlug } from '../../../config/tutorialModules';
import {
  filterTutorials,
  mergeTutorialModules,
  type FilteredTutorialModule,
  type MergedTutorialModule,
} from '../utils/filterTutorials';

export function useTutorialsPage() {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeModuleFilter, setActiveModuleFilter] = useState('all');
  const [modalVideo, setModalVideo] = useState<TutorialVideo | null>(null);
  const [modalPlaylist, setModalPlaylist] = useState<TutorialVideo[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tutorials', 'catalog'],
    queryFn: () => tutorialsService.fetchCatalog(),
  });

  const mergedModules = useMemo<MergedTutorialModule[]>(() => {
    if (!data?.modules) return [];
    return mergeTutorialModules(data.modules, getModuleConfigBySlug);
  }, [data?.modules]);

  const getModuleTitle = useCallback(
    (config: { titleKey: string }) => t(config.titleKey),
    [t]
  );

  const visibleModules = useMemo<FilteredTutorialModule[]>(() => {
    return filterTutorials(mergedModules, searchQuery, activeModuleFilter, lang, getModuleTitle);
  }, [mergedModules, searchQuery, activeModuleFilter, lang, getModuleTitle]);

  const modalIndex = useMemo(() => {
    if (!modalVideo) return -1;
    return modalPlaylist.findIndex((v) => v.id === modalVideo.id);
  }, [modalVideo, modalPlaylist]);

  const modalModuleTitle = useMemo(() => {
    if (!modalVideo) return '';
    const mod = mergedModules.find((m) => m.videos.some((v) => v.id === modalVideo.id));
    return mod ? t(mod.config.titleKey) : '';
  }, [modalVideo, mergedModules, t]);

  const openVideo = useCallback(
    (video: TutorialVideo, moduleSlug: string) => {
      if (!video.embed_id) {
        showToast(t('tutorials.loadError'), 'error');
        return;
      }
      const fullModule = mergedModules.find((m) => m.slug === moduleSlug);
      const playlist = fullModule?.videos ?? [];
      setModalPlaylist(playlist);
      setModalVideo(video);
    },
    [mergedModules, showToast, t]
  );

  const closeModal = useCallback(() => {
    setModalVideo(null);
    setModalPlaylist([]);
  }, []);

  const selectVideo = useCallback(
    (video: TutorialVideo) => {
      if (!video.embed_id) {
        showToast(t('tutorials.loadError'), 'error');
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

  const contactSupport = useCallback(() => {
    navigate('/support');
  }, [navigate]);

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
    searchQuery,
    setSearchQuery,
    activeModuleFilter,
    setActiveModuleFilter,
    mergedModules,
    visibleModules,
    loading: isLoading,
    error: isError ? t('tutorials.loadError') : null,
    refetch,
    modalVideo,
    modalPlaylist,
    modalModuleTitle,
    modalIndex,
    hasPrev: modalIndex > 0,
    hasNext: modalIndex >= 0 && modalIndex < modalPlaylist.length - 1,
    openVideo,
    closeModal,
    selectVideo,
    prevVideo,
    nextVideo,
    contactSupport,
  };
}
