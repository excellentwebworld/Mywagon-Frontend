import { apiRequest } from '../client';
import type {
  FetchTutorialsResult,
  TutorialsApiResponse,
  TutorialsBySectionApiResponse,
  TutorialsBySectionData,
  TutorialsCatalogData,
  TutorialVideo,
} from '../types/tutorials';

export type { FetchTutorialsResult } from '../types/tutorials';

export const tutorialsService = {
  async fetchCatalog(): Promise<FetchTutorialsResult> {
    const res = await apiRequest<TutorialsCatalogData>('/tutorials') as TutorialsApiResponse;

    const meta = res.meta as { module_count?: number; video_count?: number } | undefined;

    return {
      modules: res.data?.modules ?? [],
      meta: {
        module_count: meta?.module_count ?? 0,
        video_count: meta?.video_count ?? 0,
      },
    };
  },

  async fetchBySection(section: string): Promise<TutorialVideo[]> {
    const params = new URLSearchParams({ section });
    const res = await apiRequest<TutorialsBySectionData>(
      `/tutorials/by-section?${params.toString()}`
    ) as TutorialsBySectionApiResponse;

    return res.data?.videos ?? [];
  },
};
