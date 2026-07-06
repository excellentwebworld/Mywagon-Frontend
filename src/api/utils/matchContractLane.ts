import type { Step3ContractLane } from '../mappers/mapPartnerToStep3Carrier';

function normalizeCity(value: string | undefined | null): string {
  return String(value ?? '').trim().toLowerCase();
}

export function matchContractLane(
  lanes: Step3ContractLane[] | undefined,
  pickupCity: string | undefined,
  deliveryCity: string | undefined
): Step3ContractLane | undefined {
  if (!lanes || lanes.length === 0) {
    return undefined;
  }

  const origin = normalizeCity(pickupCity);
  const destination = normalizeCity(deliveryCity);

  if (origin && destination) {
    const matched = lanes.find(
      (lane) =>
        normalizeCity(lane.origin) === origin && normalizeCity(lane.destination) === destination
    );
    if (matched) {
      return matched;
    }
  }

  return lanes[0];
}

export function resolveRouteCities(stops: Array<{ locationCity?: string; lines?: Array<{ action?: string }> }>): {
  pickupCity?: string;
  deliveryCity?: string;
  routeLabel: string;
} {
  const cities = (stops || [])
    .map((stop) => stop.locationCity?.trim())
    .filter((city): city is string => Boolean(city));

  const firstPickupStop = (stops || []).find((stop) =>
    (stop.lines || []).some((line) => line.action === 'pickup')
  );
  const lastDropoffStop = [...(stops || [])]
    .reverse()
    .find((stop) => (stop.lines || []).some((line) => line.action === 'dropoff'));

  const pickupCity = firstPickupStop?.locationCity?.trim();
  const deliveryCity = lastDropoffStop?.locationCity?.trim();
  const routeLabel = cities.length > 0 ? cities.join(' → ') : '—';

  return { pickupCity, deliveryCity, routeLabel };
}
