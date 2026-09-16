import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erpOrdersService } from '../api';
import { mapApiListItemToOrder } from '../api/mappers/erpOrdersMapper';
import type { ErpOrder, ErpOrderLine } from '../pages/ErpOrders/types';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

type StopLineLike = {
  orderId?: string;
  orderRef?: string;
  productId?: string;
  productName?: string;
  customerId?: string;
  customerName?: string;
  action?: string;
  qty?: string;
  unit?: string;
  weight?: string;
  wtUnit?: string;
  orderLineId?: string;
};

type StopLike = { lines?: StopLineLike[] };

/**
 * When GET /erp-orders/{id} fails (linked/planned order, reference stored as id,
 * or remote API without id-or-reference lookup), rebuild enough order detail from
 * cargo lines already on the shipment so the wizard can re-select the same order.
 */
export function buildOrderDetailFromStops(
  orderKey: string,
  stops: StopLike[] | null | undefined,
): ErpOrder | null {
  const key = String(orderKey || '').trim();
  if (!key) return null;

  const matches: StopLineLike[] = [];
  for (const stop of stops || []) {
    for (const line of stop.lines || []) {
      const oid = String(line.orderId || '');
      const oref = String(line.orderRef || '');
      if (oid === key || oref === key) matches.push(line);
    }
  }
  if (!matches.length) return null;

  type Acc = ErpOrderLine & { hasPickup: boolean };
  const byProduct = new Map<string, Acc>();

  for (const line of matches) {
    const productId = String(line.productId || '');
    if (!productId) continue;
    const isPickup = line.action === 'pickup';
    const qty = parseFloat(String(line.qty ?? ''));
    const weight = parseFloat(String(line.weight ?? ''));
    let acc = byProduct.get(productId);
    if (!acc) {
      acc = {
        id:
          line.orderLineId && /^\d+$/.test(line.orderLineId)
            ? Number(line.orderLineId)
            : undefined,
        productSkuId: /^\d+$/.test(productId) ? Number(productId) : null,
        productName: line.productName || '',
        quantity: null,
        unit: line.unit || 'EUR Pallets',
        weight: null,
        weightUnit: line.wtUnit || 'kg',
        hasPickup: false,
      };
      byProduct.set(productId, acc);
    }
    if (line.productName) acc.productName = line.productName;
    if (line.unit) acc.unit = line.unit;
    if (line.wtUnit) acc.weightUnit = line.wtUnit;

    if (isPickup) {
      if (!acc.hasPickup) {
        acc.quantity = 0;
        acc.weight = 0;
        acc.hasPickup = true;
      }
      acc.quantity = (acc.quantity || 0) + (Number.isFinite(qty) ? qty : 0);
      acc.weight = (acc.weight || 0) + (Number.isFinite(weight) ? weight : 0);
    } else if (!acc.hasPickup) {
      // No pickup on the shipment yet — use dropoff totals as the available pool.
      acc.quantity = (acc.quantity || 0) + (Number.isFinite(qty) ? qty : 0);
      acc.weight = (acc.weight || 0) + (Number.isFinite(weight) ? weight : 0);
    }
  }

  if (byProduct.size === 0) return null;

  const first = matches[0];
  const lines: ErpOrderLine[] = [...byProduct.values()].map(
    ({ hasPickup: _hp, ...line }) => line,
  );
  const orderId = String(first.orderId || key);
  const orderRef = String(first.orderRef || key);

  return {
    id: orderId,
    orderReference: orderRef,
    erpReference: '',
    customerName: first.customerName || '',
    companyEntityId:
      first.customerId && /^\d+$/.test(String(first.customerId))
        ? Number(first.customerId)
        : null,
    originLocationId: null,
    destLocationId: null,
    shipFrom: '',
    shipTo: '',
    shipDate: '',
    deliveryDate: '',
    productsPreview: lines
      .map((l) => l.productName)
      .filter(Boolean)
      .join(', '),
    productCount: lines.length,
    status: 'planned',
    highPriority: false,
    orderValue: null,
    linkedLoadSid: '',
    linkedLoadId: '',
    updatedAt: '',
    canEdit: false,
    notes: '',
    lines,
  };
}

/** Prefer API detail with lines; otherwise rebuild from shipment cargo. */
export function resolveOrderDetailForWizard(
  orderKey: string,
  fetched: ErpOrder | null | undefined,
  stops: StopLike[] | null | undefined,
): ErpOrder | null {
  if (fetched?.lines?.length) return fetched;
  const synthetic = buildOrderDetailFromStops(orderKey, stops);
  if (synthetic?.lines?.length) return synthetic;
  return fetched ?? null;
}

export function useCreateShipmentOrders() {
  const queryClient = useQueryClient();
  const detailCacheRef = useRef(new Map<string, ErpOrder>());

  const ordersQuery = useQuery({
    queryKey: wizardQueryKeys.unlinkedOrders,
    queryFn: async () => {
      const result = await erpOrdersService.listOrders({
        available_for_shipment: true,
        per_page: 100,
        page: 1,
        sort: 'updated_at',
        sort_dir: 'desc',
      });
      return result.items.map(mapApiListItemToOrder);
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const orders = ordersQuery.data ?? [];

  const invalidateOrderDetail = useCallback((orderId: string) => {
    if (!orderId) return;
    detailCacheRef.current.delete(orderId);
  }, []);

  const fetchOrderDetail = useCallback(
    async (orderId: string, options?: { force?: boolean }): Promise<ErpOrder | null> => {
      if (!orderId) return null;
      const key = String(orderId);
      if (!options?.force) {
        const cached = detailCacheRef.current.get(key);
        if (cached?.lines?.length) return cached;
      }

      try {
        const mapped = await erpOrdersService.getOrder(key);
        detailCacheRef.current.set(String(mapped.id), mapped);
        if (mapped.orderReference) {
          detailCacheRef.current.set(String(mapped.orderReference), mapped);
        }
        // Keep the requested key mapped even when it was a reference alias.
        detailCacheRef.current.set(key, mapped);
        return mapped;
      } catch {
        return null;
      }
    },
    []
  );

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
        if (list.some((o) => o.id === order.id)) {
          return list.map((o) => (o.id === order.id ? order : o));
        }
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
    invalidateOrderDetail,
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
    const remaining =
      line.remainingQuantity != null
        ? Number(line.remainingQuantity)
        : line.quantity != null
          ? Number(line.quantity)
          : null;
    // Hide products already fully shipped on prior loads.
    if (remaining != null && remaining <= 0) return;

    const key = line.productSkuId
      ? String(line.productSkuId)
      : line.id != null
        ? String(line.id)
        : line.productName || line.sku || `line-${lineIndex}`;
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({
      value: key,
      label: line.productName || line.sku || `Item ${lineIndex + 1}`,
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
  const target = String(productId).trim();
  return (
    order.lines.find(
      (line) =>
        (line.productSkuId != null && String(line.productSkuId) === target) ||
        (line.id != null && String(line.id) === target) ||
        (line.id != null && `line:${line.id}` === target) ||
        (line.productName && line.productName === target) ||
        (line.sku && line.sku === target)
    ) ?? null
  );
}
