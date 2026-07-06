import { useQuery } from '@tanstack/react-query';
import { partnersService } from '../api/services/partnersService';
import { mapPartnerToStep3Carrier, type Step3Carrier } from '../api/mappers/mapPartnerToStep3Carrier';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

async function loadCreateShipmentPartners(): Promise<Step3Carrier[]> {
  const [carrierResult, freelancerResult] = await Promise.all([
    partnersService.listPartnersMapped('carrier_company', ['active'], [], '', 1, 100, '', ''),
    partnersService.listPartnersMapped('freelancer_driver', ['active'], [], '', 1, 100, '', ''),
  ]);

  return [...carrierResult.partners, ...freelancerResult.partners].map(mapPartnerToStep3Carrier);
}

export function useCreateShipmentPartners() {
  const query = useQuery({
    queryKey: wizardQueryKeys.partners,
    queryFn: loadCreateShipmentPartners,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
