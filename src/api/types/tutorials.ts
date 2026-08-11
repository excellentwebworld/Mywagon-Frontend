export interface TutorialVideo {
  id: number;
  slug: string;
  topic_en: string;
  topic_el: string;
  link: string | null;
  embed_id: string | null;
  ordering: number;
}

export interface TutorialModule {
  section: string;
  slug: string;
  ordering: number;
  videos: TutorialVideo[];
}

export interface TutorialsCatalogData {
  modules: TutorialModule[];
}

export interface TutorialsCatalogMeta {
  module_count: number;
  video_count: number;
}

export interface TutorialsApiResponse {
  success: boolean;
  message: string;
  data: TutorialsCatalogData;
  meta?: TutorialsCatalogMeta;
}

export interface FetchTutorialsResult {
  modules: TutorialModule[];
  meta: TutorialsCatalogMeta;
}

export interface TutorialsBySectionData {
  section: string;
  videos: TutorialVideo[];
}

export interface TutorialsBySectionApiResponse {
  success: boolean;
  message: string;
  data: TutorialsBySectionData;
}

export function getTutorialVideoTitle(video: TutorialVideo, locale: string): string {
  return locale === 'el' ? video.topic_el : video.topic_en;
}
