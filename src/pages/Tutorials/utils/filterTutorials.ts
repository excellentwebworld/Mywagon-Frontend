import type { TutorialModuleConfig } from '../../../config/tutorialModules';
import type { TutorialVideo } from '../../../api/types/tutorials';
import { getTutorialVideoTitle } from '../../../api/types/tutorials';

export interface MergedTutorialModule {
  section: string;
  slug: string;
  ordering: number;
  config: TutorialModuleConfig;
  videos: TutorialVideo[];
}

export interface FilteredTutorialModule extends MergedTutorialModule {
  videos: TutorialVideo[];
}

export function mergeTutorialModules(
  apiModules: Array<{ section: string; slug: string; ordering: number; videos: TutorialVideo[] }>,
  getConfig: (slug: string) => TutorialModuleConfig | undefined
): MergedTutorialModule[] {
  return apiModules
    .map((mod) => {
      const config = getConfig(mod.slug);
      if (!config) return null;
      return {
        section: mod.section,
        slug: mod.slug,
        ordering: mod.ordering,
        config,
        videos: [...mod.videos].sort((a, b) => a.ordering - b.ordering),
      };
    })
    .filter((m): m is MergedTutorialModule => m !== null)
    .sort((a, b) => a.ordering - b.ordering);
}

export function filterTutorials(
  modules: MergedTutorialModule[],
  searchQuery: string,
  activeModuleFilter: string,
  lang: string,
  getModuleTitle: (config: TutorialModuleConfig) => string
): FilteredTutorialModule[] {
  const query = searchQuery.trim().toLowerCase();
  const result: FilteredTutorialModule[] = [];

  for (const mod of modules) {
    if (activeModuleFilter !== 'all' && mod.slug !== activeModuleFilter) {
      continue;
    }

    const moduleTitle = getModuleTitle(mod.config).toLowerCase();

    if (!query) {
      result.push({ ...mod, videos: mod.videos });
      continue;
    }

    if (moduleTitle.includes(query)) {
      result.push({ ...mod, videos: mod.videos });
      continue;
    }

    const matchedVideos = mod.videos.filter((video) =>
      getTutorialVideoTitle(video, lang).toLowerCase().includes(query)
    );

    if (matchedVideos.length > 0) {
      result.push({ ...mod, videos: matchedVideos });
    }
  }

  return result;
}
