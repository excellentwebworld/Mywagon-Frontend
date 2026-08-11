import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuoteCalculator from './QuoteCalculator';

const mockLanes = [
  {
    id: 'LANE-001',
    status: 'active',
    isRoundTrip: false,
    tripType: 'direct',
    stops: [
      { city: 'Athens', label: 'Athens' },
      { city: 'Patras', label: 'Patras' },
    ],
    pricingRows: [
      { metric: 'unit_transport', priceEur: 40, metricValue: { type: 'eur_pallet' } },
      { metric: 'load_any_size', priceEur: 500, metricValue: { type: 'per_load' } },
    ],
  },
  {
    id: 'LANE-002',
    status: 'active',
    isRoundTrip: true,
    tripType: 'roundtrip',
    stops: [
      { city: 'Athens', label: 'Athens' },
      { city: 'Thessaloniki', label: 'Thessaloniki' },
    ],
    pricingRows: [
      { metric: 'ftl_truck_type', priceEur: 1200, metricValue: { vehicle_type: 'Curtainsider' } },
      { metric: 'weight', priceEur: 50, metricValue: { unit: 'ton' } },
    ],
  },
  {
    id: 'LANE-003',
    status: 'active',
    isRoundTrip: false,
    tripType: 'direct',
    stops: [
      { city: 'Munich', label: 'Munich' },
      { city: 'Berlin', label: 'Berlin' },
    ],
    pricingRows: [
      { metric: 'weight', priceEur: 0.1, metricValue: { unit: 'kg' } },
    ],
  },
];

describe('QuoteCalculator', () => {
  it('does not render when closed', () => {
    const { container } = render(<QuoteCalculator open={false} onClose={() => {}} lanes={mockLanes} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title and pickup input when open', () => {
    render(<QuoteCalculator open={true} onClose={() => {}} lanes={mockLanes} />);
    expect(screen.getByText('Quote Calculator')).toBeDefined();
    expect(screen.getByText('Pickup Location (Origin)')).toBeDefined();
    expect(screen.getByText('Dropoff Location (Destination)')).toBeDefined();
  });
});
