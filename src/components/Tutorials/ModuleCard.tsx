import React from 'react';
import type { TutorialModuleConfig } from '../../config/tutorialModules';
import type { TutorialVideo } from '../../api/types/tutorials';
import { getTutorialVideoTitle } from '../../api/types/tutorials';
import { TutorialModuleIcon } from './TutorialModuleIcon';
import { ModuleVideoRow } from './ModuleVideoRow';

interface ModuleCardProps {
  config: TutorialModuleConfig;
  videos: TutorialVideo[];
  lang: string;
  moduleTitle: string;
  moduleDescription: string;
  onVideoClick: (video: TutorialVideo) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  config,
  videos,
  lang,
  moduleTitle,
  moduleDescription,
  onVideoClick,
}) => {
  return (
    <article className="tut-mod-card">
      <div className="tut-mod-card-head">
        <TutorialModuleIcon icon={config.icon} color={config.color} bg={config.bg} />
        <div className="tut-mod-info">
          <h4>{moduleTitle}</h4>
          <p>{moduleDescription}</p>
        </div>
      </div>
      <div className="tut-mod-tutorials">
        {videos.map((video) => (
          <ModuleVideoRow
            key={video.id}
            title={getTutorialVideoTitle(video, lang)}
            onClick={() => onVideoClick(video)}
          />
        ))}
      </div>
    </article>
  );
};
