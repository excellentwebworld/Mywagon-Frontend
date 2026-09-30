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
  subtitleEl?: string;
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
    if (item) return pickVehicleLabel(item.label, item.labelEl, lang);
  }

  for (const type of vehicleTypes) {
    for (const cat of type.categories) {
      const item = cat.items.find((i) => i.id === itemId);
      if (item) return pickVehicleLabel(item.label, item.labelEl, lang);
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
    types.push(pickVehicleLabel(vt.name, vt.nameEl, lang));
    selected.forEach((id) => specs.push(findSpecLabel(vehicleTypes, vt, id, lang)));
  });

  return { types, specs };
}

export function hasVehicleSelection(vehicleSpecs: Record<string, string[]> | undefined): boolean {
  if (!vehicleSpecs) return false;
  return Object.values(vehicleSpecs).some((items) => items.length > 0);
}

/** Fallback Greek labels when API greek field is missing/copied EN. */
const VEHICLE_LABEL_EL_FALLBACKS: Record<string, string> = {
  'Dry Cargo': 'Ξηρό φορτίο',
  'Refrigerated Cargo': 'Ψυκτικό φορτίο',
  'Other Cargo': 'Άλλο φορτίο',
  'Dry': 'Ξηρό',
  'Refrigerated': 'Ψυκτικό',
  'Other': 'Άλλο',
};

/** Pick EN/EL label from API bilingual truck type / feature / category data. */
export function pickVehicleLabel(
  labelEn: string,
  labelEl: string | null | undefined,
  lang: 'en' | 'el'
): string {
  const en = String(labelEn || '').trim();
  if (lang !== 'el') {
    return en;
  }

  const el = String(labelEl || '').trim();
  if (el && el.toLowerCase() !== en.toLowerCase()) {
    return el;
  }

  // Compound subtitle e.g. "Dry Cargo · Refrigerated Cargo"
  if (en.includes('·')) {
    return en
      .split('·')
      .map((part) => {
        const trimmed = part.trim();
        return VEHICLE_LABEL_EL_FALLBACKS[trimmed] || trimmed;
      })
      .join(' · ');
  }

  return VEHICLE_LABEL_EL_FALLBACKS[en] || el || en;
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
