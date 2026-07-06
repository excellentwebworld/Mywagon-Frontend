import { useQuery } from '@tanstack/react-query';
import { erpOrdersService } from '../api';
import type { ErpOrder } from '../pages/ErpOrders/types';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

export const EMPTY_STEP3_ORDERS: ErpOrder[] = [];

export function useStep3OrderDetails(orderIdsKey: string) {
  return useQuery({
    queryKey: wizardQueryKeys.step3Orders(orderIdsKey),
    queryFn: async (): Promise<ErpOrder[]> => {
      const ids = orderIdsKey.split(',').filter(Boolean);
      if (ids.length === 0) return EMPTY_STEP3_ORDERS;
      return Promise.all(ids.map((id) => erpOrdersService.getOrder(id)));
    },
    enabled: orderIdsKey.length > 0,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
