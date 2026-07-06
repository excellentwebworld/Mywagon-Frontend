const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export const createNewCargoLine = (action: 'pickup' | 'dropoff' = 'pickup') => ({
  id: makeId('l'),
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
    vehicleSpecs: {
      'semi-trailer': [] as string[],
      'road-train': [] as string[],
      triaxle: [] as string[],
      van: [] as string[],
    } as Record<string, string[]>,
    broadcastType: 'private' as 'private' | 'public',
    selectedCarriers: ['krp', 'dntinos'] as string[],
    targetPrice: '790',
    trackingEmails: {} as Record<string, string[]>,
    driverNotes: 'Driver must wear safety equipment on arrival.',
    gpsRequired: true,
    bulkMode: 'single' as 'single' | 'qty' | 'dates' | 'rec',
    bulkQty: 5,
    bulkDates: [
      { date: '2026-06-21', qty: 3 },
      { date: '2026-06-22', qty: 3 },
    ] as { date: string; qty: number }[],
    bulkRecQty: 5,
    bulkRecType: 'weekly' as 'daily' | 'weekly' | 'monthly',
    bulkRecOccurrences: 7,
  };
}
