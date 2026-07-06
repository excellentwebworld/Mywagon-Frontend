import { useQuery } from '@tanstack/react-query';
import { createShipmentService } from '../api';
import { mapApiVehicleTypes } from '../api/mappers/vehicleTypesMapper';
import type { WizardVehicleType } from '../components/CreateShipmentWizard/vehicleTypes';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

let vehicleTypesInflight: Promise<WizardVehicleType[]> | null = null;
let vehicleTypesCache: WizardVehicleType[] | null = null;

async function loadVehicleTypes(): Promise<WizardVehicleType[]> {
  if (vehicleTypesCache) return vehicleTypesCache;
  if (vehicleTypesInflight) return vehicleTypesInflight;

  vehicleTypesInflight = createShipmentService
    .getVehicleTypes()
    .then((types) => {
      const mapped = mapApiVehicleTypes(types);
      vehicleTypesCache = mapped;
      return mapped;
    })
    .finally(() => {
      vehicleTypesInflight = null;
    });

  return vehicleTypesInflight;
}

export function useVehicleTypes() {
  const query = useQuery({
    queryKey: wizardQueryKeys.vehicleTypes,
    queryFn: loadVehicleTypes,
    staleTime: Infinity,
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
