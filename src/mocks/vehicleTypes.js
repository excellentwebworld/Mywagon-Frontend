/**
 * vehicleTypes.js — Vehicle type configuration data.
 * Editable via Dev Tools → Vehicle Config page.
 *
 * Structure: VehicleType → subtypes[] (each with category: dry|reefer|other)
 * Capacity: maxPallets, maxWeight (kg), maxVolume (m³)
 */

export const VEHICLE_TYPES = [
  {
    id: 'VT-001', name: 'Semi-Trailer', nameEl: 'Επικαθήμενο', desc: 'Tilt trailer',
    icon: 'semi', maxPallets: 33, maxWeightKg: 24000, maxVolumeM3: 90,
    lengthM: 13.6, widthM: 2.48, heightM: 2.7, axles: 3,
    subtypes: [
      { id: 'ST-001', name: 'Curtainside', nameEl: 'Μουσαμάς', category: 'dry', sideLoading: true, rearLoading: true, topLoading: false },
      { id: 'ST-002', name: 'Box', nameEl: 'Κλειστό', category: 'dry', sideLoading: false, rearLoading: true, topLoading: false },
      { id: 'ST-003', name: 'Platform', nameEl: 'Πλατφόρμα', category: 'dry', sideLoading: true, rearLoading: true, topLoading: true },
      { id: 'ST-004', name: 'Flatbed', nameEl: 'Επίπεδο', category: 'dry', sideLoading: true, rearLoading: true, topLoading: true },
      { id: 'ST-005', name: 'Temperature-controlled', nameEl: 'Ψυγείο', category: 'reefer', sideLoading: false, rearLoading: true, topLoading: false, tempRange: [-25, 25] },
      { id: 'ST-006', name: 'Multi-temp', nameEl: 'Πολυθερμοκρ.', category: 'reefer', sideLoading: false, rearLoading: true, topLoading: false, tempRange: [-25, 25], multiTemp: true },
      { id: 'ST-007', name: 'Tanker', nameEl: 'Βυτιοφόρο', category: 'other', sideLoading: false, rearLoading: false, topLoading: true, liquid: true },
      { id: 'ST-008', name: 'Silo', nameEl: 'Σιλό', category: 'other', sideLoading: false, rearLoading: false, topLoading: true, bulk: true },
    ],
    active: true,
  },
  {
    id: 'VT-002', name: 'Truck with Trailer', nameEl: 'Συρρόμενο', desc: 'Curtainsider',
    icon: 'truck_trailer', maxPallets: 33, maxWeightKg: 18000, maxVolumeM3: 80,
    lengthM: 7.7, widthM: 2.48, heightM: 3.0, axles: 2,
    subtypes: [
      { id: 'ST-010', name: 'Standard', nameEl: 'Στάνταρ', category: 'dry', sideLoading: true, rearLoading: true, topLoading: false },
      { id: 'ST-011', name: 'Mega (3m+)', nameEl: 'Μέγα (3μ+)', category: 'dry', sideLoading: true, rearLoading: true, topLoading: false, megaHeight: true },
      { id: 'ST-012', name: 'Refrigerated', nameEl: 'Ψυγείο', category: 'reefer', sideLoading: false, rearLoading: true, topLoading: false, tempRange: [-25, 25] },
    ],
    active: true,
  },
  {
    id: 'VT-003', name: 'Rigid Truck (7-12t)', nameEl: 'Τριαξονικό', desc: '7.5T – 12.0T',
    icon: 'rigid', maxPallets: 14, maxWeightKg: 12000, maxVolumeM3: 45,
    lengthM: 7.2, widthM: 2.45, heightM: 2.5, axles: 2,
    subtypes: [
      { id: 'ST-020', name: 'Box', nameEl: 'Κλειστό', category: 'dry', sideLoading: false, rearLoading: true, topLoading: false },
      { id: 'ST-021', name: 'Flatbed', nameEl: 'Επίπεδο', category: 'dry', sideLoading: true, rearLoading: true, topLoading: true },
      { id: 'ST-022', name: 'Refrigerated', nameEl: 'Ψυγείο', category: 'reefer', sideLoading: false, rearLoading: true, topLoading: false, tempRange: [-20, 20] },
    ],
    active: true,
  },
  {
    id: 'VT-004', name: 'Van', nameEl: 'Βαν', desc: 'Van / LCV',
    icon: 'van', maxPallets: 6, maxWeightKg: 3500, maxVolumeM3: 16,
    lengthM: 4.2, widthM: 1.8, heightM: 1.9, axles: 2,
    subtypes: [
      { id: 'ST-030', name: 'Small Van', nameEl: 'Μικρό Βαν', category: 'dry', sideLoading: false, rearLoading: true, topLoading: false },
      { id: 'ST-031', name: 'Large Van (Sprinter)', nameEl: 'Μεγάλο Βαν', category: 'dry', sideLoading: true, rearLoading: true, topLoading: false },
      { id: 'ST-032', name: 'Refrigerated Van', nameEl: 'Ψυγείο Βαν', category: 'reefer', sideLoading: false, rearLoading: true, topLoading: false, tempRange: [-20, 15] },
    ],
    active: true,
  },
];

/**
 * AI vehicle recommendation logic (mock).
 * Given cargo specs, returns ranked vehicle types with fit analysis.
 */
export function recommendVehicles(totalPallets, totalWeightKg, needsReefer, needsADR, cargoDesc) {
  return VEHICLE_TYPES.filter(vt => vt.active).map(vt => {
    const pFit = totalPallets / vt.maxPallets;
    const wFit = totalWeightKg / vt.maxWeightKg;
    const maxFit = Math.max(pFit, wFit);
    let status, reason;
    if (maxFit > 1) { status = 'too_small'; reason = `Needs ${totalPallets} plt / ${(totalWeightKg/1000).toFixed(1)}T but max is ${vt.maxPallets} plt / ${(vt.maxWeightKg/1000).toFixed(0)}T`; }
    else if (maxFit > 0.85) { status = 'tight'; reason = `${Math.round(maxFit * 100)}% capacity — tight fit but doable`; }
    else if (maxFit > 0.4) { status = 'fits'; reason = `${Math.round(maxFit * 100)}% capacity — good fit`; }
    else { status = 'oversized'; reason = `Only using ${Math.round(maxFit * 100)}% capacity — consider smaller vehicle`; }
    const hasReefer = vt.subtypes.some(s => s.category === 'reefer');
    if (needsReefer && !hasReefer) { status = 'no_reefer'; reason = 'No reefer subtypes available'; }
    const recommended = status === 'fits' || status === 'tight';
    const matchingSubtypes = needsReefer ? vt.subtypes.filter(s => s.category === 'reefer') : vt.subtypes.filter(s => s.category === 'dry');
    return { ...vt, status, reason, recommended, pFit: Math.round(pFit * 100), wFit: Math.round(wFit * 100), matchingSubtypes };
  }).sort((a, b) => {
    const order = { fits: 0, tight: 1, oversized: 2, too_small: 3, no_reefer: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });
}
