import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erpOrdersService } from '../api';
import { mapApiListItemToOrder } from '../api/mappers/erpOrdersMapper';
import type { ErpOrder } from '../pages/ErpOrders/types';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

export function useCreateShipmentOrders() {
  const queryClient = useQueryClient();
  const detailCacheRef = useRef(new Map<string, ErpOrder>());

  const ordersQuery = useQuery({
    queryKey: wizardQueryKeys.unlinkedOrders,
    queryFn: async () => {
      const result = await erpOrdersService.listOrders({
        unlinked: true,
        status: 'unplanned',
        per_page: 100,
        page: 1,
        sort: 'updated_at',
        sort_dir: 'desc',
      });
      return result.items.map(mapApiListItemToOrder);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const orders = ordersQuery.data ?? [];

  const fetchOrderDetail = useCallback(async (orderId: string): Promise<ErpOrder | null> => {
    if (!orderId) return null;
    const cached = detailCacheRef.current.get(orderId);
    if (cached?.lines?.length) return cached;

    try {
      const mapped = await erpOrdersService.getOrder(orderId);
      detailCacheRef.current.set(orderId, mapped);
      return mapped;
    } catch {
      return null;
    }
  }, []);

  const getCachedOrder = useCallback((orderId: string) => {
    return detailCacheRef.current.get(orderId) ?? null;
  }, []);

  const getOrderValue = useCallback((orderId: string): number | null => {
    return detailCacheRef.current.get(orderId)?.orderValue ?? null;
  }, []);

  const addOrder = useCallback(
    (order: ErpOrder) => {
      detailCacheRef.current.set(order.id, order);
      queryClient.setQueryData<ErpOrder[]>(wizardQueryKeys.unlinkedOrders, (prev) => {
        const list = prev ?? [];
        if (list.some((o) => o.id === order.id)) return list;
        return [order, ...list];
      });
    },
    [queryClient]
  );

  const orderOptions = orders.map((order) => ({
    value: order.id,
    label: order.orderReference,
    sublabel: [
      order.customerName,
      order.erpReference ? order.erpReference : null,
      order.productCount ? `${order.productCount} lines` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  return {
    orders,
    orderOptions,
    loading: ordersQuery.isLoading,
    error:
      ordersQuery.error instanceof Error
        ? ordersQuery.error.message
        : ordersQuery.error
          ? 'Failed to load orders'
          : null,
    fetchOrderDetail,
    getCachedOrder,
    getOrderValue,
    addOrder,
  };
}

export function getProductOptionsForOrder(order: ErpOrder | null | undefined) {
  if (!order?.lines?.length) return [];

  const seen = new Set<string>();
  const options: { value: string; label: string; sublabel?: string; lineIndex: number }[] = [];

  order.lines.forEach((line, lineIndex) => {
    const skuId = line.productSkuId ? String(line.productSkuId) : '';
    if (!skuId || seen.has(skuId)) return;
    seen.add(skuId);
    options.push({
      value: skuId,
      label: line.productName || line.sku || 'Product',
      sublabel: line.sku || undefined,
      lineIndex,
    });
  });

  return options;
}

export function countUnmappedOrderLines(order: ErpOrder | null | undefined): number {
  if (!order?.lines?.length) return 0;
  return order.lines.filter((line) => !line.productSkuId).length;
}

export function getProductOptionsForCargoLine(order: ErpOrder | null | undefined) {
  return getProductOptionsForOrder(order);
}

export function findOrderLineForProduct(order: ErpOrder | null | undefined, productId: string) {
  if (!order?.lines?.length || !productId) return null;
  return order.lines.find((line) => String(line.productSkuId) === String(productId)) ?? null;
}
