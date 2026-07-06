import { useQuery } from '@tanstack/react-query';
import { addressBookService, erpOrdersService } from '../api';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

export type TrackingEmailLookup = {
  byCustomerId: Record<string, string>;
  byOrderId: Record<string, string>;
};

async function loadTrackingCustomerEmails(): Promise<Record<string, string>> {
  const [entities, customers] = await Promise.all([
    addressBookService.listCompanyEntities(),
    erpOrdersService.listCustomers(),
  ]);

  const byCustomerId: Record<string, string> = {};
  [...entities, ...customers].forEach((entity) => {
    if (entity.id && entity.email) {
      byCustomerId[String(entity.id)] = entity.email;
    }
  });

  return byCustomerId;
}

export function useTrackingEmailLookup() {
  const query = useQuery({
    queryKey: wizardQueryKeys.trackingEmailLookup,
    queryFn: loadTrackingCustomerEmails,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    byCustomerId: query.data ?? {},
    loading: query.isLoading,
  };
}
