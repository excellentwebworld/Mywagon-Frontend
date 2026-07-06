import { useQuery } from '@tanstack/react-query';
import { addressBookService, erpOrdersService } from '../api';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

const EMPTY_CUSTOMER_EMAILS: Record<string, string> = {};

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

let trackingEmailInflight: Promise<Record<string, string>> | null = null;
let trackingEmailCache: Record<string, string> | null = null;

async function loadTrackingCustomerEmailsCached(): Promise<Record<string, string>> {
  if (trackingEmailCache) return trackingEmailCache;
  if (trackingEmailInflight) return trackingEmailInflight;

  trackingEmailInflight = loadTrackingCustomerEmails()
    .then((result) => {
      trackingEmailCache = result;
      return result;
    })
    .finally(() => {
      trackingEmailInflight = null;
    });

  return trackingEmailInflight;
}

export function useTrackingEmailLookup() {
  const query = useQuery({
    queryKey: wizardQueryKeys.trackingEmailLookup,
    queryFn: loadTrackingCustomerEmailsCached,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    byCustomerId: query.data ?? EMPTY_CUSTOMER_EMAILS,
    loading: query.isLoading,
  };
}
