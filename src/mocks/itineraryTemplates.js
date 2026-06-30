/**
 * itineraryTemplates.js — Mock saved itinerary templates + auto-learned lanes.
 */

export const ITINERARY_TEMPLATES = [
  {
    id: 'TPL-IT-001', name: 'Monday water run', usageCount: 12, lastUsedAt: '2026-05-19',
    stops: [
      { locationId: 'LOC-001', locationName: 'ΒΙΚΟΣ Κεντρική Αποθήκη', locationCompany: 'ΒΙΚΟΣ Α.Ε.', locationCity: 'Ιωάννινα', locationCountry: 'GR',
        noteCarrier: 'Report to Gate B. Driver must wear PPE.', noteInternal: '', contactName: 'Γιώργος Μπακόλας', contactPhone: '+30 26510 42100',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'pickup', qty: '22', unit: 'Pallets', weight: '4400', wtUnit: 'kg', customerId: '', customerName: '', orderId: '', orderRef: '' },
        ],
      },
      { locationId: 'LOC-002', locationName: 'Αποθήκη Καλύβια', locationCompany: 'ΒΙΚΟΣ Α.Ε.', locationCity: 'Καλύβια', locationCountry: 'GR',
        noteCarrier: 'Dock assignment at gate.', noteInternal: 'Main Attica hub.', contactName: '', contactPhone: '',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'dropoff', qty: '22', unit: 'Pallets', weight: '4400', wtUnit: 'kg', customerId: 'PR-080', customerName: 'FreshCo S.A.', orderId: '', orderRef: '' },
        ],
      },
    ],
  },
  {
    id: 'TPL-IT-002', name: 'Thessaloniki multi-drop', usageCount: 5, lastUsedAt: '2026-05-15',
    stops: [
      { locationId: 'LOC-001', locationName: 'ΒΙΚΟΣ Κεντρική Αποθήκη', locationCompany: 'ΒΙΚΟΣ Α.Ε.', locationCity: 'Ιωάννινα', locationCountry: 'GR',
        noteCarrier: '', noteInternal: '', contactName: 'Γιώργος Μπακόλας', contactPhone: '+30 26510 42100',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'pickup', qty: '15', unit: 'Pallets', weight: '3000', wtUnit: 'kg', customerId: '', customerName: '', orderId: '', orderRef: '' },
          { productId: 'SKU-004', productName: 'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)', action: 'pickup', qty: '8', unit: 'Pallets', weight: '1600', wtUnit: 'kg', customerId: '', customerName: '', orderId: '', orderRef: '' },
        ],
      },
      { locationId: 'LOC-003', locationName: 'Αποθήκη Λαμίας', locationCompany: 'ΒΙΚΟΣ Α.Ε.', locationCity: 'Λαμία', locationCountry: 'GR',
        noteCarrier: '', noteInternal: '', contactName: '', contactPhone: '',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'dropoff', qty: '5', unit: 'Pallets', weight: '1000', wtUnit: 'kg', customerId: 'PR-082', customerName: 'Lidl Hellas', orderId: '', orderRef: '' },
        ],
      },
      { locationId: 'LOC-005', locationName: 'Αποθήκη Θεσσαλονίκης', locationCompany: 'ΒΙΚΟΣ Α.Ε.', locationCity: 'Θεσσαλονίκη', locationCountry: 'GR',
        noteCarrier: '', noteInternal: '', contactName: '', contactPhone: '',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'dropoff', qty: '10', unit: 'Pallets', weight: '2000', wtUnit: 'kg', customerId: 'PR-081', customerName: 'Σκλαβενίτης Α.Ε.Ε.', orderId: '', orderRef: '' },
          { productId: 'SKU-004', productName: 'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)', action: 'dropoff', qty: '8', unit: 'Pallets', weight: '1600', wtUnit: 'kg', customerId: 'PR-081', customerName: 'Σκλαβενίτης Α.Ε.Ε.', orderId: '', orderRef: '' },
        ],
      },
    ],
  },
  {
    id: 'TPL-IT-003', name: 'Crete weekly restock', usageCount: 3, lastUsedAt: '2026-05-12',
    stops: [
      { locationId: 'LOC-002', locationName: 'Αποθήκη Καλύβια', locationCompany: 'ΒΙΚΟΣ Α.Ε.', locationCity: 'Καλύβια', locationCountry: 'GR',
        noteCarrier: '', noteInternal: '', contactName: '', contactPhone: '',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'pickup', qty: '30', unit: 'Pallets', weight: '6000', wtUnit: 'kg', customerId: '', customerName: '', orderId: '', orderRef: '' },
        ],
      },
      { locationId: 'LOC-006', locationName: 'Αποθήκη Ηρακλείου', locationCompany: 'Lidl Hellas', locationCity: 'Ηράκλειο', locationCountry: 'GR',
        noteCarrier: '', noteInternal: '', contactName: '', contactPhone: '',
        lines: [
          { productId: 'SKU-001', productName: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', action: 'dropoff', qty: '30', unit: 'Pallets', weight: '6000', wtUnit: 'kg', customerId: 'PR-082', customerName: 'Lidl Hellas', orderId: '', orderRef: '' },
        ],
      },
    ],
  },
];
