import { useQuery } from '@tanstack/react-query';
import { partnersService } from '../api/services/partnersService';
import { mapPartnerToStep3Carrier, type Step3Carrier } from '../api/mappers/mapPartnerToStep3Carrier';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

let partnersInflight: Promise<Step3Carrier[]> | null = null;
let partnersCache: Step3Carrier[] | null = null;

async function loadCreateShipmentPartners(): Promise<Step3Carrier[]> {
  if (partnersCache) return partnersCache;
  if (partnersInflight) return partnersInflight;

  partnersInflight = Promise.all([
    partnersService.listPartnersMapped('carrier_company', ['active'], [], '', 1, 100, '', ''),
    partnersService.listPartnersMapped('freelancer_driver', ['active'], [], '', 1, 100, '', ''),
  ])
    .then(([carrierResult, freelancerResult]) => {
      const merged = [...carrierResult.partners, ...freelancerResult.partners].map(mapPartnerToStep3Carrier);
      partnersCache = merged;
      return merged;
    })
    .finally(() => {
      partnersInflight = null;
    });

  return partnersInflight;
}

export function useCreateShipmentPartners() {
  const query = useQuery({
    queryKey: wizardQueryKeys.partners,
    queryFn: loadCreateShipmentPartners,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const carriersList = (query.data ?? []).filter(
    (p) => p.status === 'active' && (p.type === 'carrier_company' || p.type === 'freelancer_driver')
  );

  return {
    carriersList,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Failed to load partners.' : null,
  };
}
