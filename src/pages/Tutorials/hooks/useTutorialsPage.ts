import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../../../hooks/useTranslation';
import { useApp } from '../../../context/AppContext';
import { tutorialsService } from '../../../api/services/tutorialsService';
import type { TutorialVideo } from '../../../api/types/tutorials';
import { getModuleConfigBySlug, TUTORIAL_MODULES } from '../../../config/tutorialModules';
import { TUTORIALS_COMING_SOON } from '../../../config/tutorialsFeature';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const comingSoon = TUTORIALS_COMING_SOON;

  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';

  const setSearchQuery = useCallback(
    (val: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (val.trim()) {
            next.set('q', val);
          } else {
            next.delete('q');
            next.delete('search');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const [activeModuleFilter, setActiveModuleFilter] = useState('all');
  const [modalVideo, setModalVideo] = useState<TutorialVideo | null>(null);
  const [modalPlaylist, setModalPlaylist] = useState<TutorialVideo[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tutorials', 'catalog'],
    queryFn: () => tutorialsService.fetchCatalog(),
    enabled: !comingSoon,
  });

  const mergedModules = useMemo<MergedTutorialModule[]>(() => {
    if (comingSoon) {
      return TUTORIAL_MODULES.map((config, index) => ({
        slug: config.slug,
        section: config.section,
        ordering: index + 1,
        config,
        videos: [],
      }));
    }
    if (!data?.modules) return [];
    return mergeTutorialModules(data.modules, getModuleConfigBySlug);
  }, [comingSoon, data?.modules]);

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
      if (comingSoon) {
        showToast(t('tutorials.comingSoonToast'), 'info');
        return;
      }
      if (!video.embed_id) {
        showToast(t('tutorials.loadError'), 'error');
        return;
      }
      const fullModule = mergedModules.find((m) => m.slug === moduleSlug);
      const playlist = fullModule?.videos ?? [];
      setModalPlaylist(playlist);
      setModalVideo(video);
    },
    [comingSoon, mergedModules, showToast, t]
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

  const meta = data?.meta ?? {
    module_count: mergedModules.length,
    video_count: mergedModules.reduce((sum, m) => sum + m.videos.length, 0),
  };

  return {
    t,
    lang,
    comingSoon,
    meta,
    searchQuery,
    setSearchQuery,
    activeModuleFilter,
    setActiveModuleFilter,
    mergedModules,
    visibleModules,
    loading: comingSoon ? false : isLoading,
    error: comingSoon ? null : isError ? t('tutorials.loadError') : null,
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
