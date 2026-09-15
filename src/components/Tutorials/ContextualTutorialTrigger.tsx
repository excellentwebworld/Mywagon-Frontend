import React from 'react';
import { Loader2 } from 'lucide-react';
import type { ContextualTutorialKey } from '../../config/contextualTutorials';
import { useContextualTutorial } from '../../hooks/useContextualTutorial';
import { TutorialVideoModal } from './TutorialVideoModal';
import { assetUrl } from '../../utils/assetUrl';
import '../../styles/tutorials.css';

interface ContextualTutorialTriggerProps {
  tutorialKey: ContextualTutorialKey;
  className?: string;
}

export const ContextualTutorialTrigger: React.FC<ContextualTutorialTriggerProps> = ({
  tutorialKey,
  className,
}) => {
  const ctx = useContextualTutorial(tutorialKey);
  const label = ctx.t('tutorials.contextual.watchTutorial');

  return (
    <>
      <button
        type="button"
        className={`tut-context-trigger${className ? ` ${className}` : ''}`}
        onClick={() => void ctx.openTutorial()}
        disabled={ctx.loading}
        title={label}
        aria-label={label}
      >
        {ctx.loading ? (
          <Loader2 size={24} className="tut-context-trigger-spin" aria-hidden />
        ) : (
          <img
            src={assetUrl('assets/images/ic_youtube.png')}
            alt=""
            style={{ width: 27, height: 27, objectFit: 'contain', display: 'block' }}
            aria-hidden
          />
        )}
      </button>

      <TutorialVideoModal
        open={ctx.modalVideo !== null}
        video={ctx.modalVideo}
        moduleTitle={ctx.moduleTitle}
        playlist={ctx.modalPlaylist}
        lang={ctx.lang}
        onClose={ctx.closeModal}
        onSelectVideo={ctx.selectVideo}
        onPrev={ctx.prevVideo}
        onNext={ctx.nextVideo}
        hasPrev={ctx.hasPrev}
        hasNext={ctx.hasNext}
        previousLabel={ctx.t('tutorials.modalPrevious')}
        nextLabel={ctx.t('tutorials.modalNext')}
        playlistLabel={ctx.t('tutorials.playlist')}
      />
    </>
  );
};
