import type { QueryClient } from '@tanstack/react-query';
import type { LocationItem, SKU } from '../../context/AppContext';
import { wizardQueryKeys } from '../../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

/**
 * Shared React Query keys for master-data dropdowns.
 * App QueryClient uses refetchOnMount:false by default; Orders lists use
 * refetchOnMount:'always'. Prefer invalidate + optimistic prepend so
 * dropdowns keep showing cached options while refetching (no empty flash).
 */
export const masterDataKeys = {
  productMaster: ['product-master'] as const,
  skusForOrders: ['product-master', 'skus', 'erp-orders'] as const,
  locationsAddressBook: ['locations'] as const,
  locationsForOrders: ['address-book', 'locations', 'erp-orders'] as const,
  addressBookSummary: ['addressBookSummary'] as const,
  erpCustomers: ['erp-orders', 'customers'] as const,
  partners: ['partners'] as const,
  wizardPartners: wizardQueryKeys.partners,
  unlinkedOrders: wizardQueryKeys.unlinkedOrders,
};

function prependById<T extends { id: string | number }>(list: T[] | undefined, item: T): T[] {
  const prev = list ?? [];
  if (prev.some((x) => String(x.id) === String(item.id))) return prev;
  return [item, ...prev];
}

/**
 * After SKU create / update / archive / restore.
 * Keeps Product Master, Orders Create Order, and AppContext (wizard) in sync.
 */
export function syncSkuDropdownCaches(
  queryClient: QueryClient,
  opts?: {
    sku?: SKU;
    refreshSkusFromApi?: (force?: boolean) => Promise<void>;
  }
) {
  if (opts?.sku) {
    queryClient.setQueryData<SKU[]>(masterDataKeys.skusForOrders, (old) =>
      prependById(old, opts.sku!)
    );
    // Refresh Product Master grids, but do not refetch the Orders SKU list
    // immediately (avoids racing away the optimistic prepend).
    void queryClient.invalidateQueries({
      queryKey: masterDataKeys.productMaster,
      predicate: (query) =>
        !(
          query.queryKey.length === masterDataKeys.skusForOrders.length &&
          query.queryKey.every((k, i) => k === masterDataKeys.skusForOrders[i])
        ),
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: masterDataKeys.productMaster });
  }
  void opts?.refreshSkusFromApi?.(true);
}

/**
 * After location create / update / archive / restore.
 * Keeps Address Book, Orders location dropdowns, and AppContext (wizard) in sync.
 */
export function syncLocationDropdownCaches(
  queryClient: QueryClient,
  opts?: {
    location?: LocationItem;
    refreshLocationsFromApi?: (force?: boolean) => Promise<void>;
  }
) {
  if (opts?.location) {
    queryClient.setQueryData<LocationItem[]>(masterDataKeys.locationsForOrders, (old) =>
      prependById(old, opts.location!)
    );
    void queryClient.invalidateQueries({ queryKey: masterDataKeys.locationsAddressBook });
    void queryClient.invalidateQueries({ queryKey: masterDataKeys.addressBookSummary });
  } else {
    void queryClient.invalidateQueries({ queryKey: masterDataKeys.locationsAddressBook });
    void queryClient.invalidateQueries({ queryKey: masterDataKeys.addressBookSummary });
    void queryClient.invalidateQueries({ queryKey: masterDataKeys.locationsForOrders });
  }
  void opts?.refreshLocationsFromApi?.(true);
}

/** After company / customer entity create — Orders customer dropdown. */
export function syncCustomerDropdownCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: masterDataKeys.erpCustomers });
}

/**
 * After partner invite / accept / status change.
 * Clears sticky module cache used by Create Shipment Step 3.
 */
export function syncPartnerDropdownCaches(
  queryClient: QueryClient,
  clearModuleCache?: () => void
) {
  clearModuleCache?.();
  void queryClient.invalidateQueries({ queryKey: masterDataKeys.partners });
  void queryClient.resetQueries({ queryKey: [...masterDataKeys.wizardPartners], exact: true });
}
