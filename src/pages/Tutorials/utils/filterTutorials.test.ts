import { describe, expect, it } from 'vitest';
import type { TutorialModuleConfig } from '../../../config/tutorialModules';
import type { TutorialVideo } from '../../../api/types/tutorials';
import { filterTutorials, mergeTutorialModules, type MergedTutorialModule } from './filterTutorials';

const mockConfig = (slug: string, titleKey: string): TutorialModuleConfig => ({
  slug,
  section: slug,
  filterPillLabelKey: `${titleKey}.filterLabel`,
  titleKey,
  descriptionKey: `${titleKey}.description`,
  icon: 'dashboard',
  color: '#000',
  bg: '#fff',
});

const video = (id: number, topic_en: string, topic_el: string): TutorialVideo => ({
  id,
  slug: `video-${id}`,
  topic_en,
  topic_el,
  link: 'https://youtu.be/abc123',
  embed_id: 'abc123',
  ordering: id,
});

describe('mergeTutorialModules', () => {
  it('merges API modules with config and sorts by ordering', () => {
    const result = mergeTutorialModules(
      [
        { section: 'B', slug: 'b', ordering: 2, videos: [video(2, 'B video', 'B el')] },
        { section: 'A', slug: 'dashboard', ordering: 1, videos: [video(1, 'A video', 'A el')] },
      ],
      (slug) => (slug === 'dashboard' ? mockConfig('dashboard', 'tutorials.module.dashboard') : undefined)
    );

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('dashboard');
  });
});

describe('filterTutorials', () => {
  const modules: MergedTutorialModule[] = [
    {
      section: 'Dashboard',
      slug: 'dashboard',
      ordering: 1,
      config: mockConfig('dashboard', 'tutorials.module.dashboard'),
      videos: [video(1, 'Overview', 'Επισκόπηση')],
    },
    {
      section: 'Create Shipment',
      slug: 'create-shipment',
      ordering: 2,
      config: mockConfig('create-shipment', 'tutorials.module.createShipment'),
      videos: [
        video(2, 'Pending', 'Εκκρεμές'),
        video(3, 'On Trip', 'Σε διαδρομή'),
      ],
    },
  ];

  const getModuleTitle = (config: TutorialModuleConfig) =>
    config.slug === 'dashboard' ? 'Dashboard' : 'Create Shipment';

  it('returns all modules when search and filter are empty', () => {
    const result = filterTutorials(modules, '', 'all', 'en', getModuleTitle);
    expect(result).toHaveLength(2);
  });

  it('filters by module pill', () => {
    const result = filterTutorials(modules, '', 'create-shipment', 'en', getModuleTitle);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('create-shipment');
  });

  it('filters by video title case-insensitively', () => {
    const result = filterTutorials(modules, 'pending', 'all', 'en', getModuleTitle);
    expect(result).toHaveLength(1);
    expect(result[0].videos).toHaveLength(1);
    expect(result[0].videos[0].topic_en).toBe('Pending');
  });

  it('includes all module videos when module name matches', () => {
    const result = filterTutorials(modules, 'create', 'all', 'en', getModuleTitle);
    expect(result).toHaveLength(1);
    expect(result[0].videos).toHaveLength(2);
  });

  it('hides modules with no matches', () => {
    const result = filterTutorials(modules, 'nonexistent', 'all', 'en', getModuleTitle);
    expect(result).toHaveLength(0);
  });

  it('matches Greek video titles when locale is el', () => {
    const result = filterTutorials(modules, 'εκκρεμές', 'all', 'el', getModuleTitle);
    expect(result).toHaveLength(1);
    expect(result[0].videos[0].topic_el).toBe('Εκκρεμές');
  });
});
