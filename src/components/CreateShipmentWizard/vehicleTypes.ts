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
  categories: VehicleCategory[];
}

export const WIZARD_VEHICLE_TYPES: WizardVehicleType[] = [
  {
    formKey: 'semi-trailer',
    name: 'Semi-Trailer',
    nameEl: 'Επικαθήμενο',
    subtitle: 'Tilt trailer',
    categories: [
      {
        id: 'dry',
        label: 'Dry',
        labelEl: 'Ξηρό',
        items: [
          { id: 'curtainside', label: 'Curtainside', labelEl: 'Μουσαμάς' },
          { id: 'box', label: 'Box', labelEl: 'Κλειστό' },
          { id: 'platform', label: 'Platform', labelEl: 'Πλατφόρμα' },
          { id: 'flatbed', label: 'Flatbed', labelEl: 'Επίπεδο' },
        ],
      },
      {
        id: 'reefer',
        label: 'Reefer',
        labelEl: 'Ψυγείο',
        items: [
          { id: 'temp', label: 'Temperature-controlled', labelEl: 'Ψυγείο' },
          { id: 'multitemp', label: 'Multi-temp', labelEl: 'Πολυθερμοκρ.' },
        ],
      },
      {
        id: 'other',
        label: 'Other',
        labelEl: 'Άλλο',
        items: [
          { id: 'tanker', label: 'Tanker', labelEl: 'Βυτιοφόρο' },
          { id: 'silo', label: 'Silo', labelEl: 'Σιλό' },
        ],
      },
    ],
  },
  {
    formKey: 'road-train',
    name: 'Truck with Trailer',
    nameEl: 'Συρρόμενο',
    subtitle: 'Curtainsider',
    categories: [
      {
        id: 'dry',
        label: 'Dry',
        labelEl: 'Ξηρό',
        items: [
          { id: 'standard', label: 'Standard', labelEl: 'Στάνταρ' },
          { id: 'mega', label: 'Mega (3m+)', labelEl: 'Μέγα (3μ+)' },
        ],
      },
      {
        id: 'reefer',
        label: 'Reefer',
        labelEl: 'Ψυγείο',
        items: [{ id: 'refr', label: 'Refrigerated', labelEl: 'Ψυγείο' }],
      },
    ],
  },
  {
    formKey: 'triaxle',
    name: 'Rigid Truck (7-12t)',
    nameEl: 'Τριαξονικό',
    subtitle: '7.5T – 12.0T',
    categories: [
      {
        id: 'dry',
        label: 'Dry',
        labelEl: 'Ξηρό',
        items: [
          { id: 'box', label: 'Box', labelEl: 'Κλειστό' },
          { id: 'flatbed', label: 'Flatbed', labelEl: 'Επίπεδο' },
        ],
      },
      {
        id: 'reefer',
        label: 'Reefer',
        labelEl: 'Ψυγείο',
        items: [{ id: 'refr', label: 'Refrigerated', labelEl: 'Ψυγείο' }],
      },
    ],
  },
  {
    formKey: 'van',
    name: 'Van',
    nameEl: 'Βαν',
    subtitle: 'Van / LCV',
    categories: [
      {
        id: 'dry',
        label: 'Dry',
        labelEl: 'Ξηρό',
        items: [
          { id: 'small', label: 'Small Van', labelEl: 'Μικρό Βαν' },
          { id: 'large', label: 'Large Van (Sprinter)', labelEl: 'Μεγάλο Βαν' },
        ],
      },
      {
        id: 'reefer',
        label: 'Reefer',
        labelEl: 'Ψυγείο',
        items: [{ id: 'refr', label: 'Refrigerated Van', labelEl: 'Ψυγείο Βαν' }],
      },
    ],
  },
];

export function allItemsForType(vt: WizardVehicleType): string[] {
  return vt.categories.flatMap((cat) => cat.items.map((item) => item.id));
}

export function findSpecLabel(
  vt: WizardVehicleType,
  itemId: string,
  lang: 'en' | 'el'
): string {
  for (const cat of vt.categories) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) return lang === 'el' ? item.labelEl : item.label;
  }
  return itemId;
}

export function formatVehicleSelectionSummary(
  vehicleSpecs: Record<string, string[]>,
  lang: 'en' | 'el'
): { types: string[]; specs: string[] } {
  const types: string[] = [];
  const specs: string[] = [];

  WIZARD_VEHICLE_TYPES.forEach((vt) => {
    const selected = vehicleSpecs[vt.formKey] || [];
    if (selected.length === 0) return;
    types.push(lang === 'el' ? vt.nameEl : vt.name);
    selected.forEach((id) => specs.push(findSpecLabel(vt, id, lang)));
  });

  return { types, specs };
}

export function hasVehicleSelection(vehicleSpecs: Record<string, string[]> | undefined): boolean {
  if (!vehicleSpecs) return false;
  return Object.values(vehicleSpecs).some((items) => items.length > 0);
}
