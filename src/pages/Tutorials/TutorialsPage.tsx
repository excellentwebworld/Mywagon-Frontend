import React from 'react';
import { LayoutGrid } from 'lucide-react';
import {
  ModuleCard,
  ModuleFilterBar,
  NeedHelpCard,
  TutorialSearchBar,
  TutorialsEmptyState,
  TutorialVideoModal,
} from '../../components/Tutorials';
import { useTutorialsPage } from './hooks/useTutorialsPage';
import '../../styles/tutorials.css';

export const TutorialsPage: React.FC = () => {
  const page = useTutorialsPage();

  return (
    <div className="tut-wrap">
      <header className="tut-pg-head">
        <h1>{page.t('tutorials.pageTitle')}</h1>
        <p>{page.t('tutorials.pageSubtitle')}</p>
      </header>

      {page.error && (
        <div className="tut-error-banner" role="alert">
          <span>{page.error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => page.refetch()}>
            Retry
          </button>
        </div>
      )}

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

      <div className="tut-section-header">
        <h2>
          <LayoutGrid size={18} aria-hidden />
          {page.t('tutorials.allModulesHeading')}
        </h2>
      </div>

      {page.loading ? (
        <div className="tut-loading">{page.t('tutorials.loading')}</div>
      ) : page.visibleModules.length === 0 ? (
        <TutorialsEmptyState
          title={page.t('tutorials.emptyTitle')}
          subtitle={page.t('tutorials.emptySubtitle')}
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
