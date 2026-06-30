/**
 * schedulingData.js — Mock data for the Scheduling (config) and Manage Docks (live) modules.
 */

export const LOADING_POINTS = [
  { id: 'LP-001', locationId: 'LOC-001', name: 'Dock A', type: 'dock_ramp', direction: 'both', maxTruckSize: 'trailer', maxWeight: 24000, clearanceHeight: 4.5, equipment: ['ramp', 'forklift'], adr: false, adrClasses: [], tempControlled: false, tempRange: null, active: true, maintenanceNote: '', sortOrder: 1, color: '#2563EB' },
  { id: 'LP-002', locationId: 'LOC-001', name: 'Dock B', type: 'dock_ramp', direction: 'both', maxTruckSize: 'mega', maxWeight: 28000, clearanceHeight: 5.0, equipment: ['ramp', 'forklift', 'conveyor'], adr: true, adrClasses: ['3', '8'], tempControlled: false, tempRange: null, active: true, maintenanceNote: '', sortOrder: 2, color: '#5E3BEE' },
  { id: 'LP-003', locationId: 'LOC-001', name: 'Ground East', type: 'ground_area', direction: 'inbound', maxTruckSize: 'trailer', maxWeight: 24000, clearanceHeight: 0, equipment: ['crane', 'forklift'], adr: false, adrClasses: [], tempControlled: false, tempRange: null, active: true, maintenanceNote: '', sortOrder: 3, color: '#D97706' },
  { id: 'LP-004', locationId: 'LOC-002', name: 'Ramp 1', type: 'dock_ramp', direction: 'outbound', maxTruckSize: 'trailer', maxWeight: 24000, clearanceHeight: 4.2, equipment: ['ramp', 'pallet_jack'], adr: false, adrClasses: [], tempControlled: true, tempRange: { min: 2, max: 8 }, active: true, maintenanceNote: '', sortOrder: 1, color: '#2563EB' },
  { id: 'LP-005', locationId: 'LOC-002', name: 'Ramp 2', type: 'dock_ramp', direction: 'both', maxTruckSize: 'rigid', maxWeight: 18000, clearanceHeight: 3.8, equipment: ['ramp'], adr: false, adrClasses: [], tempControlled: false, tempRange: null, active: true, maintenanceNote: '', sortOrder: 2, color: '#5E3BEE' },
  { id: 'LP-006', locationId: 'LOC-003', name: 'Dock 1', type: 'dock_ramp', direction: 'both', maxTruckSize: 'trailer', maxWeight: 24000, clearanceHeight: 4.5, equipment: ['ramp', 'forklift'], adr: false, adrClasses: [], tempControlled: false, tempRange: null, active: true, maintenanceNote: '', sortOrder: 1, color: '#2563EB' },
];

export const SCHEDULE_TEMPLATES = [
  { id: 'TPL-001', loadingPointId: 'LP-001', name: 'Standard hours', active: true, effectiveFrom: '2026-01-01', effectiveTo: null },
  { id: 'TPL-002', loadingPointId: 'LP-002', name: 'Standard hours', active: true, effectiveFrom: '2026-01-01', effectiveTo: null },
  { id: 'TPL-003', loadingPointId: 'LP-003', name: 'Morning only', active: true, effectiveFrom: '2026-01-01', effectiveTo: null },
  { id: 'TPL-004', loadingPointId: 'LP-004', name: 'Standard hours', active: true, effectiveFrom: '2026-01-01', effectiveTo: null },
  { id: 'TPL-005', loadingPointId: 'LP-005', name: 'Standard hours', active: true, effectiveFrom: '2026-01-01', effectiveTo: null },
  { id: 'TPL-006', loadingPointId: 'LP-006', name: 'Full day', active: true, effectiveFrom: '2026-01-01', effectiveTo: null },
];

export const SCHEDULE_RULES = [
  { id: 'RUL-001', templateId: 'TPL-001', recurrence: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], specificDate: null, dateFrom: null, dateTo: null, startTime: '07:00', endTime: '17:00', slotDuration: 60, bufferBetween: 15, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 1 },
  { id: 'RUL-002', templateId: 'TPL-001', recurrence: 'weekly', daysOfWeek: [6], specificDate: null, dateFrom: null, dateTo: null, startTime: '08:00', endTime: '13:00', slotDuration: 60, bufferBetween: 15, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 1 },
  { id: 'RUL-003', templateId: 'TPL-002', recurrence: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], specificDate: null, dateFrom: null, dateTo: null, startTime: '06:00', endTime: '18:00', slotDuration: 60, bufferBetween: 10, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [{ hour: 6, maxConcurrent: 2, slotDuration: 30 }, { hour: 7, maxConcurrent: 2, slotDuration: 30 }], priority: 1 },
  { id: 'RUL-004', templateId: 'TPL-003', recurrence: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], specificDate: null, dateFrom: null, dateTo: null, startTime: '07:00', endTime: '13:00', slotDuration: 90, bufferBetween: 30, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 1 },
  { id: 'RUL-005', templateId: 'TPL-004', recurrence: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], specificDate: null, dateFrom: null, dateTo: null, startTime: '07:00', endTime: '16:00', slotDuration: 60, bufferBetween: 15, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 1 },
  { id: 'RUL-006', templateId: 'TPL-005', recurrence: 'weekly', daysOfWeek: [1, 2, 3, 4, 5], specificDate: null, dateFrom: null, dateTo: null, startTime: '08:00', endTime: '15:00', slotDuration: 45, bufferBetween: 15, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 1 },
  { id: 'RUL-007', templateId: 'TPL-006', recurrence: 'weekly', daysOfWeek: [1, 2, 3, 4, 5, 6], specificDate: null, dateFrom: null, dateTo: null, startTime: '06:00', endTime: '20:00', slotDuration: 60, bufferBetween: 0, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 1 },
  // Specific date override: Christmas eve short day
  { id: 'RUL-008', templateId: 'TPL-001', recurrence: 'specific_date', daysOfWeek: [], specificDate: '2026-12-24', dateFrom: null, dateTo: null, startTime: '08:00', endTime: '12:00', slotDuration: 60, bufferBetween: 15, maxConcurrent: 1, slotMode: 'fixed_grid', hourlyOverrides: [], priority: 10 },
];

export const BOOKING_POLICIES = [
  { locationId: 'LOC-001', selfScheduling: true, autoApprove: true, minLeadTime: 2, maxLeadTime: 168, freeCancelDeadline: 4, lateCancelPenalty: 'flag', noShowGracePeriod: 30, noShowPenalty: 'flag', requireTruckPlate: true, requireDriverName: false, maxBookingsPerDay: 0, confirmationEmail: true, reminderHoursBefore: [24, 2], notifyOnCancel: true, notifyOnNoShow: true },
  { locationId: 'LOC-002', selfScheduling: true, autoApprove: false, minLeadTime: 4, maxLeadTime: 336, freeCancelDeadline: 8, lateCancelPenalty: 'none', noShowGracePeriod: 30, noShowPenalty: 'flag', requireTruckPlate: true, requireDriverName: true, maxBookingsPerDay: 2, confirmationEmail: true, reminderHoursBefore: [24], notifyOnCancel: true, notifyOnNoShow: true },
  { locationId: 'LOC-003', selfScheduling: false, autoApprove: true, minLeadTime: 2, maxLeadTime: 168, freeCancelDeadline: 4, lateCancelPenalty: 'none', noShowGracePeriod: 30, noShowPenalty: 'none', requireTruckPlate: false, requireDriverName: false, maxBookingsPerDay: 0, confirmationEmail: true, reminderHoursBefore: [24, 2], notifyOnCancel: true, notifyOnNoShow: false },
];

export const BLACKOUT_PERIODS = [
  { id: 'BLK-001', scope: 'location', loadingPointId: null, locationId: 'LOC-001', dateFrom: '2026-12-24', dateTo: '2026-12-26', allDay: true, timeFrom: null, timeTo: null, reason: 'Holiday closure', recurring: true },
  { id: 'BLK-002', scope: 'loading_point', loadingPointId: 'LP-003', locationId: 'LOC-001', dateFrom: '2026-06-15', dateTo: '2026-06-15', allDay: false, timeFrom: '08:00', timeTo: '14:00', reason: 'Crane maintenance', recurring: false },
];

// Today's bookings for the live board
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

export const BOOKINGS = [
  { id: 'BKG-001', loadingPointId: 'LP-001', locationId: 'LOC-001', date: TODAY, startTime: '07:00', endTime: '08:00', carrierId: 'PR-090', carrierName: 'EuroTrans S.A.', driverName: 'Αλέξης Κωνσταντίνου', driverPhone: '+30 694 111 2222', truckPlate: 'ΑΧΕ-4521', trailerPlate: 'ΝΒΕ-8832', shipmentId: 'MV-A1B2C', stopIndex: 0, cargoSummary: '18 pallets Soda 330ml (2.7t)', status: 'completed', bookedAt: '2026-05-19T10:30:00Z', confirmedAt: '2026-05-19T10:30:00Z', checkedInAt: `${TODAY}T06:48:00`, atDockAt: `${TODAY}T06:55:00`, loadingStartAt: `${TODAY}T07:02:00`, completedAt: `${TODAY}T07:48:00`, cancelledAt: null, source: 'self_service', autoApproved: true, cancellationReason: '', notes: '' },
  { id: 'BKG-002', loadingPointId: 'LP-001', locationId: 'LOC-001', date: TODAY, startTime: '08:00', endTime: '09:00', carrierId: 'PR-091', carrierName: 'TransCo Logistics', driverName: 'Νίκος Παπαδόπουλος', driverPhone: '+30 694 555 1234', truckPlate: 'ΙΟΑ-4521', trailerPlate: 'ΝΒΕ-9911', shipmentId: 'MV-K3R9A', stopIndex: 0, cargoSummary: '22 pallets Water 500ml (4.4t)', status: 'checked_in', bookedAt: '2026-05-18T14:00:00Z', confirmedAt: '2026-05-18T14:00:00Z', checkedInAt: `${TODAY}T07:52:00`, atDockAt: null, loadingStartAt: null, completedAt: null, cancelledAt: null, source: 'self_service', autoApproved: true, cancellationReason: '', notes: '' },
  { id: 'BKG-003', loadingPointId: 'LP-002', locationId: 'LOC-001', date: TODAY, startTime: '08:00', endTime: '09:00', carrierId: 'PR-092', carrierName: 'LogiCorp A.E.E.', driverName: '', driverPhone: '', truckPlate: '', trailerPlate: '', shipmentId: 'MV-B2X7P', stopIndex: 1, cargoSummary: '14 pallets Juice 1L (2.1t)', status: 'pending', bookedAt: '2026-05-20T09:00:00Z', confirmedAt: null, checkedInAt: null, atDockAt: null, loadingStartAt: null, completedAt: null, cancelledAt: null, source: 'self_service', autoApproved: false, cancellationReason: '', notes: 'Requesting morning slot' },
  { id: 'BKG-004', loadingPointId: 'LP-001', locationId: 'LOC-001', date: TODAY, startTime: '09:00', endTime: '10:00', carrierId: 'PR-093', carrierName: 'FreightPro Ltd', driverName: 'Δημήτρης Βασιλείου', driverPhone: '+30 697 888 3333', truckPlate: 'ΒΟΛ-2233', trailerPlate: 'ΑΤΤ-4455', shipmentId: 'MV-N8WL4', stopIndex: 0, cargoSummary: '30 pallets Mixed beverages (5.8t)', status: 'loading', bookedAt: '2026-05-17T11:00:00Z', confirmedAt: '2026-05-17T11:01:00Z', checkedInAt: `${TODAY}T08:35:00`, atDockAt: `${TODAY}T08:40:00`, loadingStartAt: `${TODAY}T08:45:00`, completedAt: null, cancelledAt: null, source: 'dispatcher', autoApproved: true, cancellationReason: '', notes: '' },
  { id: 'BKG-005', loadingPointId: 'LP-002', locationId: 'LOC-001', date: TODAY, startTime: '09:00', endTime: '10:00', carrierId: 'PR-094', carrierName: 'HaulFast Express', driverName: 'Σπύρος Αντωνίου', driverPhone: '+30 693 444 5555', truckPlate: 'ΘΕΣ-6677', trailerPlate: '', shipmentId: 'MV-R5TQ2', stopIndex: 0, cargoSummary: '8 pallets Mineral water 750ml (1.2t)', status: 'confirmed', bookedAt: '2026-05-19T16:00:00Z', confirmedAt: '2026-05-19T16:01:00Z', checkedInAt: null, atDockAt: null, loadingStartAt: null, completedAt: null, cancelledAt: null, source: 'self_service', autoApproved: true, cancellationReason: '', notes: '' },
  { id: 'BKG-006', loadingPointId: 'LP-003', locationId: 'LOC-001', date: TODAY, startTime: '07:00', endTime: '08:30', carrierId: 'PR-095', carrierName: 'QuickHaul S.A.', driverName: 'Γιώργος Μάρκου', driverPhone: '+30 698 222 6666', truckPlate: 'ΠΑΤ-8899', trailerPlate: 'ΛΑΡ-1100', shipmentId: 'MV-X9Y8Z', stopIndex: 0, cargoSummary: '10 pallets Steel beams (8.5t)', status: 'completed', bookedAt: '2026-05-18T08:00:00Z', confirmedAt: '2026-05-18T08:00:00Z', checkedInAt: `${TODAY}T06:50:00`, atDockAt: `${TODAY}T07:05:00`, loadingStartAt: `${TODAY}T07:10:00`, completedAt: `${TODAY}T07:55:00`, cancelledAt: null, source: 'dispatcher', autoApproved: true, cancellationReason: '', notes: 'Side loading — crane required' },
  { id: 'BKG-007', loadingPointId: 'LP-001', locationId: 'LOC-001', date: TODAY, startTime: '10:00', endTime: '11:00', carrierId: 'PR-096', carrierName: 'SpeedLine Transport', driverName: 'Κώστας Ελευθερίου', driverPhone: '+30 694 777 8888', truckPlate: 'ΗΡΑ-3344', trailerPlate: 'ΑΧΕ-5566', shipmentId: 'MV-Q4W5E', stopIndex: 1, cargoSummary: '16 pallets Bottled water assorted (3.2t)', status: 'confirmed', bookedAt: '2026-05-20T07:00:00Z', confirmedAt: '2026-05-20T07:00:00Z', checkedInAt: null, atDockAt: null, loadingStartAt: null, completedAt: null, cancelledAt: null, source: 'self_service', autoApproved: true, cancellationReason: '', notes: '' },
  { id: 'BKG-008', loadingPointId: 'LP-002', locationId: 'LOC-001', date: TODAY, startTime: '10:00', endTime: '11:00', carrierId: 'PR-097', carrierName: 'CargoLink A.E.', driverName: '', driverPhone: '', truckPlate: 'ΚΑΒ-9900', trailerPlate: '', shipmentId: 'MV-L7M8N', stopIndex: 0, cargoSummary: '6 pallets ADR chemicals (1.8t)', status: 'confirmed', bookedAt: '2026-05-20T11:00:00Z', confirmedAt: '2026-05-20T11:01:00Z', checkedInAt: null, atDockAt: null, loadingStartAt: null, completedAt: null, cancelledAt: null, source: 'self_service', autoApproved: true, cancellationReason: '', notes: 'ADR Class 3 — flammable liquids' },
];

export const EXTERNAL_SYNCS = [];

// Slot generation helper
export function generateSlots(loadingPointId, date, rules, bookings, blackouts) {
  const dow = new Date(date).getDay();
  const matchingRules = rules.filter(r => {
    if (r.recurrence === 'specific_date') return r.specificDate === date;
    if (r.recurrence === 'weekly') return r.daysOfWeek.includes(dow);
    if (r.recurrence === 'date_range') return date >= r.dateFrom && date <= r.dateTo;
    return false;
  }).sort((a, b) => b.priority - a.priority);

  if (!matchingRules.length) return [];
  const rule = matchingRules[0];

  // Check blackouts
  const blocked = blackouts.some(b =>
    (b.loadingPointId === loadingPointId || (!b.loadingPointId && b.locationId === rules[0]?.locationId)) &&
    date >= b.dateFrom && date <= b.dateTo &&
    (b.allDay || true)
  );
  if (blocked) return [];

  const slots = [];
  const [sh, sm] = rule.startTime.split(':').map(Number);
  const [eh, em] = rule.endTime.split(':').map(Number);
  let cursor = sh * 60 + sm;
  const end = eh * 60 + em;

  while (cursor + rule.slotDuration <= end) {
    const startH = String(Math.floor(cursor / 60)).padStart(2, '0');
    const startM = String(cursor % 60).padStart(2, '0');
    const endMin = cursor + rule.slotDuration;
    const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
    const endM = String(endMin % 60).padStart(2, '0');

    const existing = bookings.filter(b => b.loadingPointId === loadingPointId && b.date === date && b.startTime === `${startH}:${startM}` && b.status !== 'cancelled');
    const available = existing.length < rule.maxConcurrent;

    slots.push({
      loadingPointId,
      date,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      status: available ? 'available' : 'booked',
      booking: existing[0] || null,
    });

    cursor = endMin + rule.bufferBetween;
  }
  return slots;
}
