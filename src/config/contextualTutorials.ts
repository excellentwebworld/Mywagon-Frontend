export type ContextualTutorialKey =
  | 'dashboard'
  | 'createShipment'
  | 'manageShipments'
  | 'searchTrucks'
  | 'productMaster'
  | 'addressBook'
  | 'partners'
  | 'profile'
  | 'userManagement';

export interface ContextualTutorialConfig {
  section: string;
  titleKey: string;
}

export const CONTEXTUAL_TUTORIALS: Record<ContextualTutorialKey, ContextualTutorialConfig> = {
  dashboard: {
    section: 'dashboard',
    titleKey: 'tutorials.contextual.dashboardTitle',
  },
  createShipment: {
    section: 'create shipment',
    titleKey: 'tutorials.contextual.createShipmentTitle',
  },
  manageShipments: {
    section: 'manage shipment',
    titleKey: 'tutorials.contextual.manageShipmentsTitle',
  },
  searchTrucks: {
    section: 'search available trucks',
    titleKey: 'tutorials.contextual.searchTrucksTitle',
  },
  productMaster: {
    section: 'product master',
    titleKey: 'tutorials.contextual.productMasterTitle',
  },
  addressBook: {
    section: 'address book',
    titleKey: 'tutorials.contextual.addressBookTitle',
  },
  partners: {
    section: 'partners',
    titleKey: 'tutorials.contextual.partnersTitle',
  },
  profile: {
    section: 'profile',
    titleKey: 'tutorials.contextual.profileTitle',
  },
  userManagement: {
    section: 'Dispatcher User Management',
    titleKey: 'tutorials.contextual.userManagementTitle',
  },
};

export function getContextualTutorialConfig(key: ContextualTutorialKey): ContextualTutorialConfig {
  return CONTEXTUAL_TUTORIALS[key];
}
