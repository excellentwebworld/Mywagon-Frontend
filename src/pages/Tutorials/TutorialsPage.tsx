import React from 'react';
import { BookOpen, LayoutGrid, PlayCircle, Sparkles } from 'lucide-react';
import {
  ModuleCard,
  ModuleFilterBar,
  NeedHelpCard,
  TutorialSearchBar,
  TutorialsEmptyState,
  TutorialsLoadingSkeleton,
  TutorialVideoModal,
} from '../../components/Tutorials';
import { useTutorialsPage } from './hooks/useTutorialsPage';
import '../../styles/tutorials.css';

export const TutorialsPage: React.FC = () => {
  const page = useTutorialsPage();

  return (
    <div className="tut-page animate-fade-in">
      <section className="tut-hero" aria-label={page.t('tutorials.pageTitle')}>
        <div className="tut-hero-content">
          <span className="tut-hero-badge">
            <Sparkles size={12} aria-hidden />
            {page.t('tutorials.heroBadge')}
          </span>
          <p className="tut-hero-subtitle">{page.t('tutorials.pageSubtitle')}</p>
          {!page.loading && page.mergedModules.length > 0 && (
            <div className="tut-hero-stats">
              <span className="tut-stat-chip">
                <BookOpen size={14} aria-hidden />
                {page.t('tutorials.statsModules', { count: page.meta.module_count })}
              </span>
              <span className="tut-stat-chip">
                <PlayCircle size={14} aria-hidden />
                {page.t('tutorials.statsVideos', { count: page.meta.video_count })}
              </span>
            </div>
          )}
        </div>
        <div className="tut-hero-visual" aria-hidden>
          <div className="tut-hero-ring tut-hero-ring--1" />
          <div className="tut-hero-ring tut-hero-ring--2" />
          <PlayCircle className="tut-hero-icon" size={48} strokeWidth={1.25} />
        </div>
      </section>

      {page.error && (
        <div className="tut-error-banner" role="alert">
          <span>{page.error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => page.refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="tut-toolbar">
        <TutorialSearchBar
          value={page.searchQuery}
          onChange={page.setSearchQuery}
          placeholder={page.t('tutorials.searchPlaceholder')}
        />

        {!page.loading && page.mergedModules.length > 0 && (
          <ModuleFilterBar
            modules={page.mergedModules.map((m) => ({ slug: m.slug, config: m.config }))}
            activeFilter={page.activeModuleFilter}
            onFilterChange={page.setActiveModuleFilter}
            allLabel={page.t('tutorials.filterAll')}
            getPillLabel={(config) => page.t(config.filterPillLabelKey)}
          />
        )}
      </div>

      <div className="tut-section-header">
        <h2 className="tut-section-title">
          <LayoutGrid size={18} aria-hidden />
          {page.t('tutorials.allModulesHeading')}
        </h2>
        {!page.loading && page.visibleModules.length > 0 && (
          <span className="tut-section-count">
            {page.visibleModules.length}{' '}
            {page.visibleModules.length === 1
              ? page.t('tutorials.moduleSingular')
              : page.t('tutorials.modulePlural')}
          </span>
        )}
      </div>

      {page.loading ? (
        <TutorialsLoadingSkeleton />
      ) : page.visibleModules.length === 0 ? (
        <TutorialsEmptyState
          title={page.t('tutorials.emptyTitle')}
          subtitle={page.t('tutorials.emptySubtitle')}
          onClearFilters={
            page.searchQuery || page.activeModuleFilter !== 'all'
              ? () => {
                  page.setSearchQuery('');
                  page.setActiveModuleFilter('all');
                }
              : undefined
          }
          clearLabel={page.t('tutorials.clearFilters')}
        />
      ) : (
        <div className="tut-mod-grid">
          {page.visibleModules.map((mod) => (
            <ModuleCard
              key={mod.slug}
              config={mod.config}
              videos={mod.videos}
              lang={page.lang}
              moduleTitle={page.t(mod.config.titleKey)}
              moduleDescription={page.t(mod.config.descriptionKey)}
              videoCountLabel={page.t('tutorials.videoCount', { count: mod.videos.length })}
              onVideoClick={(video) => page.openVideo(video, mod.slug)}
            />
          ))}
        </div>
      )}

      <NeedHelpCard
        title={page.t('tutorials.needHelp')}
        description={page.t('tutorials.needHelpDesc')}
        buttonLabel={page.t('tutorials.contactSupport')}
        onContactSupport={page.contactSupport}
      />

      <TutorialVideoModal
        open={page.modalVideo !== null}
        video={page.modalVideo}
        moduleTitle={page.modalModuleTitle}
        playlist={page.modalPlaylist}
        lang={page.lang}
        onClose={page.closeModal}
        onSelectVideo={page.selectVideo}
        onPrev={page.prevVideo}
        onNext={page.nextVideo}
        hasPrev={page.hasPrev}
        hasNext={page.hasNext}
        previousLabel={page.t('tutorials.modalPrevious')}
        nextLabel={page.t('tutorials.modalNext')}
        playlistLabel={page.t('tutorials.playlist')}
      />
    </div>
  );
};
