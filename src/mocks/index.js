/**
 * Centralized mock data for development.
 *
 * When API integration begins, replace imports from this file
 * with actual API calls from src/services/api.js.
 */

export const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Shipment SHP-1234 delivered', desc: 'Arrived at Rotterdam port', time: '2m ago', read: false },
  { id: 2, title: 'New quote received', desc: 'OceanLine offered €3,200 for SHP-1238', time: '15m ago', read: false },
  { id: 3, title: 'Driver assigned', desc: 'Dimitris K. assigned to SHP-1240', time: '1h ago', read: true },
  { id: 4, title: 'Document approved', desc: 'CMR for SHP-1230 verified', time: '3h ago', read: true },
];

export const MOCK_CONVERSATIONS = [
  { id: 1, name: 'Maria Papadaki', company: 'OceanLine', lastMsg: 'The container will arrive by Friday', time: '5m ago', unread: 2 },
  { id: 2, name: 'Nikos Stavros', company: 'EuroTrans', lastMsg: 'Invoice has been sent', time: '1h ago', unread: 0 },
  { id: 3, name: 'Elena Kosta', company: 'MedFreight', lastMsg: 'Can you confirm the pickup time?', time: '3h ago', unread: 1 },
];

export const MOCK_MESSAGES = [
  { id: 1, from: 'them', text: 'Hi, the container will arrive by Friday at Piraeus.', time: '10:30 AM' },
  { id: 2, from: 'me', text: 'Perfect, is there any delay expected?', time: '10:32 AM' },
  { id: 3, from: 'them', text: "No delays. The vessel is on schedule. I'll send tracking once it departs.", time: '10:34 AM' },
  { id: 4, from: 'them', text: 'The container will arrive by Friday', time: '10:35 AM' },
];

export const MOCK_DASHBOARD_SHIPMENTS = [
  { id: 'SHP-1234', origin: 'Athens, GR', destination: 'Rotterdam, NL', status: 'in_transit', eta: '2026-03-05' },
  { id: 'SHP-1235', origin: 'Thessaloniki, GR', destination: 'Hamburg, DE', status: 'delivered', eta: '2026-02-28' },
  { id: 'SHP-1236', origin: 'Piraeus, GR', destination: 'Barcelona, ES', status: 'pending', eta: '2026-03-10' },
];

export const MOCK_SCHEDULE = [
  { id: 1, time: '09:00', title: 'SHP-1240 pickup', location: 'Piraeus Port', type: 'pickup' },
  { id: 2, time: '11:30', title: 'SHP-1238 customs', location: 'Athens Customs', type: 'customs' },
  { id: 3, time: '14:00', title: 'SHP-1234 delivery', location: 'Rotterdam Port', type: 'delivery' },
];
