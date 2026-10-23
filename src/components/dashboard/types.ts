export interface BoardItem {
  sid: string;
  from: string;
  to: string;
  status: string;
  statusLabel: { en: string; el: string };
  statusClass: string;
  ms: { en: string; el: string };
  dt: { en: string; el: string };
  carrier: string;
  ci: string;
  rate: number;
  ref: string;
  vehicle: { en: string; el: string };
  weight: { en: string; el: string };
  cargo: { en: string; el: string };
  distance: string;
  issue: { en: string; el: string } | null;
  notes: { en: string; el: string };
  sortDate: number; // timestamp or numeric representation for date sorting
}
