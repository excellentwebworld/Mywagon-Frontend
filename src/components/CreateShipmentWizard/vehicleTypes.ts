export interface VehicleSpecItem {
  id: string;
  label: string;
  labelEl: string;
}

export interface VehicleCategory {
  id: string;
  label: string;
  labelEl: string;
  items: VehicleSpecItem[];
}

export interface WizardVehicleType {
  formKey: string;
  name: string;
  nameEl: string;
  subtitle: string;
  image?: string | null;
  categories: VehicleCategory[];
}

export function allItemsForType(vt: WizardVehicleType): string[] {
  return vt.categories.flatMap((cat) => cat.items.map((item) => item.id));
}

export function findSpecLabel(
  vehicleTypes: WizardVehicleType[],
  vt: WizardVehicleType,
  itemId: string,
  lang: 'en' | 'el'
): string {
  for (const cat of vt.categories) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) return lang === 'el' ? item.labelEl : item.label;
  }

  for (const type of vehicleTypes) {
    for (const cat of type.categories) {
      const item = cat.items.find((i) => i.id === itemId);
      if (item) return lang === 'el' ? item.labelEl : item.label;
    }
  }

  return itemId;
}

export function formatVehicleSelectionSummary(
  vehicleSpecs: Record<string, string[]>,
  lang: 'en' | 'el',
  vehicleTypes: WizardVehicleType[]
): { types: string[]; specs: string[] } {
  const types: string[] = [];
  const specs: string[] = [];

  vehicleTypes.forEach((vt) => {
    const selected = vehicleSpecs[vt.formKey] || [];
    if (selected.length === 0) return;
    types.push(lang === 'el' ? vt.nameEl : vt.name);
    selected.forEach((id) => specs.push(findSpecLabel(vehicleTypes, vt, id, lang)));
  });

  return { types, specs };
}

export function hasVehicleSelection(vehicleSpecs: Record<string, string[]> | undefined): boolean {
  if (!vehicleSpecs) return false;
  return Object.values(vehicleSpecs).some((items) => items.length > 0);
}

export function iconKeyFromVehicleName(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('semi') || normalized.includes('επικαθ')) return 'semi-trailer';
  if (normalized.includes('trailer') || normalized.includes('συρρ')) return 'road-train';
  if (normalized.includes('van') || normalized.includes('βαν')) return 'van';
  if (normalized.includes('rigid') || normalized.includes('triax') || normalized.includes('τριαξ')) {
    return 'triaxle';
  }
  return 'default';
}
