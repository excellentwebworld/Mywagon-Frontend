import { useQuery } from '@tanstack/react-query';
import { createShipmentService } from '../api';
import { mapApiVehicleTypes } from '../api/mappers/vehicleTypesMapper';
import type { WizardVehicleType } from '../components/CreateShipmentWizard/vehicleTypes';

export function useVehicleTypes() {
  const query = useQuery({
    queryKey: ['create-shipment', 'vehicle-types'],
    queryFn: async (): Promise<WizardVehicleType[]> => {
      const types = await createShipmentService.getVehicleTypes();
      return mapApiVehicleTypes(types);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    vehicleTypes: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Failed to load vehicle types' : null,
    refetch: query.refetch,
  };
}
