import { useCallback, useEffect, useRef, useState } from 'react';
import { erpOrdersService } from '../api';
import { mapApiListItemToOrder } from '../api/mappers/erpOrdersMapper';
import type { ErpOrder } from '../pages/ErpOrders/types';

export function useCreateShipmentOrders() {
  const [orders, setOrders] = useState<ErpOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef<Map<string, ErpOrder>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    erpOrdersService
      .listOrders({ unlinked: true, status: 'unplanned', per_page: 100, page: 1, sort: 'updated_at', sort_dir: 'desc' })
      .then((result) => {
        if (cancelled) return;
        setOrders(result.items.map(mapApiListItemToOrder));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchOrderDetail = useCallback(async (orderId: string): Promise<ErpOrder | null> => {
    if (!orderId) return null;
    const cached = detailCache.current.get(orderId);
    if (cached?.lines?.length) return cached;

    try {
      const mapped = await erpOrdersService.getOrder(orderId);
      detailCache.current.set(orderId, mapped);
      return mapped;
    } catch {
      const fallback = orders.find((o) => o.id === orderId);
      if (fallback) {
        detailCache.current.set(orderId, fallback);
        return fallback;
      }
      return null;
    }
  }, [orders]);

  const addOrder = useCallback((order: ErpOrder) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev];
    });
    detailCache.current.set(order.id, order);
  }, []);

  const orderOptions = orders.map((order) => ({
    value: order.id,
    label: order.orderReference,
    sublabel: `${order.customerName}${order.productCount ? ` · ${order.productCount} lines` : ''}`,
  }));

  return {
    orders,
    orderOptions,
    loading,
    error,
    fetchOrderDetail,
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

export function getProductOptionsForCargoLine(
  order: ErpOrder | null | undefined,
  line: { productId?: string; productName?: string }
) {
  const options = getProductOptionsForOrder(order);
  const productId = line.productId ? String(line.productId) : '';
  if (!productId || options.some((option) => option.value === productId)) {
    return options;
  }

  return [
    {
      value: productId,
      label: line.productName || productId,
      sublabel: undefined,
      lineIndex: -1,
    },
    ...options,
  ];
}

export function findOrderLineForProduct(order: ErpOrder | null | undefined, productId: string) {
  if (!order?.lines?.length || !productId) return null;
  return order.lines.find((line) => String(line.productSkuId) === String(productId)) ?? null;
}
