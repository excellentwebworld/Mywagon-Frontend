const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export const createNewCargoLine = (action: 'pickup' | 'dropoff' = 'pickup') => ({
  id: makeId('l'),
  orderLineId: '',
  productId: '',
  productName: '',
  customerId: '',
  customerName: '',
  orderId: '',
  orderRef: '',
  action,
  qty: '',
  unit: 'EUR Pallets',
  weight: '',
  wtUnit: 'Kgs',
  mirrorOf: '',
});

export const createNewStop = (expanded = true) => ({
  id: makeId('s'),
  locationId: '',
  locationName: '',
  locationCompany: '',
  locationCity: '',
  locationCountry: '',
  dateFrom: '',
  timeFrom: '',
  dateTo: '',
  timeTo: '',
  expanded,
  lines: [createNewCargoLine()],
  noteCarrier: '',
  noteInternal: '',
  contactName: '',
  contactPhone: '',
  appointmentMode: 'fixed' as const,
  windowStart: '',
  windowEnd: '',
  allowedLoadingPoints: [] as string[],
});

export type CargoLine = ReturnType<typeof createNewCargoLine>;
export type Stop = ReturnType<typeof createNewStop>;

export function buildDefaultWizardValues(loadId = 'SHP-NEW') {
  return {
    loadId,
    custRef: '',
    coOwners: [] as string[],
    stops: [createNewStop(true), createNewStop(true)],
    itineraryConfirmed: false,
    itineraryConfirmSnapshot: '',
    routeSummary: null as { totalDistKm: number; totalDriveMin: number } | null,
    vehicleSpecs: {} as Record<string, string[]>,
    vehicleSelectionConfirmed: false,
    broadcastType: 'private' as 'private' | 'public',
    selectedCarriers: [] as string[],
    targetPrice: '',
    negotiable: true,
    trackingEmails: {} as Record<string, string[]>,
    driverNotes: 'Driver must wear safety equipment on arrival.',
    gpsRequired: true,
    orderValue: '',
  };
}
