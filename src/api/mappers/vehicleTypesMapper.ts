import type { ApiVehicleType } from '../types/createShipment';
import type { WizardVehicleType } from '../../components/CreateShipmentWizard/vehicleTypes';

export function mapApiVehicleTypes(types: ApiVehicleType[]): WizardVehicleType[] {
  return types
    .filter((type) => type.features?.length)
    .map((type) => ({
      formKey: String(type.id),
      name: type.name_en,
      nameEl: type.name_el,
      subtitle: type.features.map((feature) => feature.name_en).join(' · '),
      image: type.image ?? null,
      categories: type.features.map((feature) => ({
        id: String(feature.id),
        label: feature.name_en,
        labelEl: feature.name_el,
        items: feature.categories.map((category) => ({
          id: String(category.id),
          label: category.name_en,
          labelEl: category.name_el,
        })),
      })),
    }));
}
