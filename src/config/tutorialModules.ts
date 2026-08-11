/**
 * PDS-949 — Tutorial module metadata (icons, colors, i18n keys).
 * Video titles come from API (topic_en / topic_el).
 * DB section values map to slug via sectionToSlug().
 */

export type TutorialModuleIcon =
  | 'dashboard'
  | 'create-shipment'
  | 'search-trucks'
  | 'product-master'
  | 'address-book'
  | 'partners'
  | 'profile'
  | 'notifications'
  | 'chat'
  | 'user-management';

export interface TutorialModuleConfig {
  slug: string;
  section: string;
  filterPillLabelKey: string;
  titleKey: string;
  descriptionKey: string;
  icon: TutorialModuleIcon;
  color: string;
  bg: string;
}

export const TUTORIAL_MODULES: TutorialModuleConfig[] = [
  {
    slug: 'dashboard',
    section: 'Dashboard',
    filterPillLabelKey: 'tutorials.module.dashboard.filterLabel',
    titleKey: 'tutorials.module.dashboard.title',
    descriptionKey: 'tutorials.module.dashboard.description',
    icon: 'dashboard',
    color: '#6C3AED',
    bg: '#F5F3FF',
  },
  {
    slug: 'create-shipment',
    section: 'Create Shipment',
    filterPillLabelKey: 'tutorials.module.createShipment.filterLabel',
    titleKey: 'tutorials.module.createShipment.title',
    descriptionKey: 'tutorials.module.createShipment.description',
    icon: 'create-shipment',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    slug: 'search-trucks',
    section: 'Search Available Trucks',
    filterPillLabelKey: 'tutorials.module.searchTrucks.filterLabel',
    titleKey: 'tutorials.module.searchTrucks.title',
    descriptionKey: 'tutorials.module.searchTrucks.description',
    icon: 'search-trucks',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    slug: 'product-master',
    section: 'Product Master',
    filterPillLabelKey: 'tutorials.module.productMaster.filterLabel',
    titleKey: 'tutorials.module.productMaster.title',
    descriptionKey: 'tutorials.module.productMaster.description',
    icon: 'product-master',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    slug: 'address-book',
    section: 'Address Book',
    filterPillLabelKey: 'tutorials.module.addressBook.filterLabel',
    titleKey: 'tutorials.module.addressBook.title',
    descriptionKey: 'tutorials.module.addressBook.description',
    icon: 'address-book',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    slug: 'partners',
    section: 'Partners',
    filterPillLabelKey: 'tutorials.module.partners.filterLabel',
    titleKey: 'tutorials.module.partners.title',
    descriptionKey: 'tutorials.module.partners.description',
    icon: 'partners',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    slug: 'profile',
    section: 'Profile',
    filterPillLabelKey: 'tutorials.module.profile.filterLabel',
    titleKey: 'tutorials.module.profile.title',
    descriptionKey: 'tutorials.module.profile.description',
    icon: 'profile',
    color: '#64748B',
    bg: '#F8FAFC',
  },
  {
    slug: 'notifications',
    section: 'Notifications',
    filterPillLabelKey: 'tutorials.module.notifications.filterLabel',
    titleKey: 'tutorials.module.notifications.title',
    descriptionKey: 'tutorials.module.notifications.description',
    icon: 'notifications',
    color: '#E11D48',
    bg: '#FFF1F2',
  },
  {
    slug: 'chat',
    section: 'Chat',
    filterPillLabelKey: 'tutorials.module.chat.filterLabel',
    titleKey: 'tutorials.module.chat.title',
    descriptionKey: 'tutorials.module.chat.description',
    icon: 'chat',
    color: '#0EA5E9',
    bg: '#F0F9FF',
  },
  {
    slug: 'dispatcher-user-management',
    section: 'Dispatcher User Management',
    filterPillLabelKey: 'tutorials.module.userManagement.filterLabel',
    titleKey: 'tutorials.module.userManagement.title',
    descriptionKey: 'tutorials.module.userManagement.description',
    icon: 'user-management',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
];

const sectionToSlugMap = Object.fromEntries(
  TUTORIAL_MODULES.map((m) => [m.section.toLowerCase(), m.slug])
) as Record<string, string>;

export function sectionToSlug(section: string): string {
  return sectionToSlugMap[section.toLowerCase()] ?? section.toLowerCase().replace(/\s+/g, '-');
}

export function getModuleConfigBySlug(slug: string): TutorialModuleConfig | undefined {
  return TUTORIAL_MODULES.find((m) => m.slug === slug);
}

export function getModuleConfigBySection(section: string): TutorialModuleConfig | undefined {
  return TUTORIAL_MODULES.find((m) => m.section.toLowerCase() === section.toLowerCase());
}
