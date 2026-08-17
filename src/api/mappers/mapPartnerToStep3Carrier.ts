import type { Partner } from '../../pages/Partners/types';

export interface Step3ContractLane {
  id: string;
  origin: string;
  destination: string;
  unit: string;
  price: number;
  status: string;
}

export interface Step3Carrier {
  id: string;
  name: string;
  type: 'carrier_company' | 'freelancer_driver' | 'supplier';
  status: 'active' | 'invited' | 'pending' | 'suspended';
  region: string;
  rating: number | null;
  loadsLifetime: number;
  contractLanes?: Step3ContractLane[];
  trucks?: { type: string }[];
  capabilities?: string[];
}

function mapContractLaneForStep3(lane: NonNullable<Partner['contractLanes']>[number]): Step3ContractLane {
  return {
    id: lane.id,
    origin: lane.originCity,
    destination: lane.destinationCity,
    unit: lane.unit === 'pallet' ? 'per_pallet' : lane.unit,
    price: lane.price,
    status: lane.status,
  };
}

export function mapPartnerToStep3Carrier(partner: Partner): Step3Carrier {
  return {
    id: partner.id,
    name: partner.name,
    type:
      partner.type === 'freelancer_driver'
        ? 'freelancer_driver'
        : partner.type === 'supplier'
        ? 'supplier'
        : 'carrier_company',
    status: partner.status,
    region: partner.region,
    rating: partner.rating,
    loadsLifetime: partner.trips ?? 0,
    contractLanes: (partner.contractLanes ?? []).map(mapContractLaneForStep3),
    trucks: (partner.capabilities ?? []).map((cap) => ({ type: cap })),
    capabilities: partner.capabilities,
  };
}
