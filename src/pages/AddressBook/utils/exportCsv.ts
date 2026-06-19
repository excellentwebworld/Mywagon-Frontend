import type { LocationItem } from '../../../context/AppContext';

export function locationsToCsv(locations: LocationItem[]): string {
  const headers = [
    'ID',
    'Name',
    'Company',
    'VAT',
    'Group',
    'Address',
    'City',
    'Postal',
    'Role',
    'Type',
    'Phone',
    'Email',
    'Appointment',
    'Hours',
    'Status',
    'Last Used',
    'Shipments 30d',
    'Shipments 90d',
    'OTD %',
  ];

  const escape = (value: string | number | boolean) => {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = locations.map((l) =>
    [
      l.id,
      l.name,
      l.company,
      l.companyVat,
      l.group,
      l.address,
      l.city,
      l.postalCode ?? '',
      l.role,
      l.type,
      l.phone ?? '',
      l.email ?? '',
      l.appt ? 'Yes' : 'No',
      l.hours,
      l.status,
      l.lastUsed,
      l.shipments30,
      l.shipments90,
      l.otd,
    ]
      .map(escape)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
