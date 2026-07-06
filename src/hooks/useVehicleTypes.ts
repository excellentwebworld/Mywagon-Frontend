import { useQuery } from '@tanstack/react-query';
import { createShipmentService } from '../api';
import { mapApiVehicleTypes } from '../api/mappers/vehicleTypesMapper';
import type { WizardVehicleType } from '../components/CreateShipmentWizard/vehicleTypes';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

export function useVehicleTypes() {
  const query = useQuery({
    queryKey: wizardQueryKeys.vehicleTypes,
    queryFn: async (): Promise<WizardVehicleType[]> => {
      const types = await createShipmentService.getVehicleTypes();
      return mapApiVehicleTypes(types);
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    vehicleTypes: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Failed to load vehicle types' : null,
    refetch: query.refetch,
  };
}
