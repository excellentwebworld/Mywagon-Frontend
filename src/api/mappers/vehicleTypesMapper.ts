import type { ApiVehicleType } from '../types/createShipment';
import type { WizardVehicleType } from '../../components/CreateShipmentWizard/vehicleTypes';

export function mapApiVehicleTypes(types: ApiVehicleType[]): WizardVehicleType[] {
  return types
    .filter((type) => type.features?.length)
    .map((type) => ({
      formKey: String(type.id),
      name: type.name_en || '',
      // Prefer DB greek translation; fall back to english only if greek missing.
      nameEl: type.name_el || type.name_en || '',
      subtitle: type.features.map((feature) => feature.name_en).join(' · '),
      subtitleEl: type.features
        .map((feature) => feature.name_el || feature.name_en || '')
        .filter(Boolean)
        .join(' · '),
      image: type.image ?? null,
      categories: type.features.map((feature) => ({
        id: String(feature.id),
        label: feature.name_en || '',
        labelEl: feature.name_el || feature.name_en || '',
        items: feature.categories.map((category) => ({
          id: String(category.id),
          label: category.name_en || '',
          labelEl: category.name_el || category.name_en || '',
        })),
      })),
    }));
}
