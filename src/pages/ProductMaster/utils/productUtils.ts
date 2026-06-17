import type { Category, ProductType, SKU } from '../../../context/AppContext';
import type { SortOption } from '../types';

export function getCategoryName(c: Category, lang: string): string {
  return typeof c.name === 'string' ? c.name : c.name[lang as 'en' | 'el'] || c.name.en;
}

export function syncDotClass(status: string): string {
  if (status === 'error') return 'sync-err';
  return `sync-${status}`;
}

export function filterSkus(
  skus: SKU[],
  productTypes: ProductType[],
  opts: {
    kpiFilter: string;
    filterSource: string;
    filterSync: string;
    filterActive: string;
    filterUnmapped: boolean;
    filterCat: string;
    activeCat: string;
    activeType: string;
    searchQuery: string;
    sortBy: SortOption;
  }
): SKU[] {
  const {
    kpiFilter,
    filterSource,
    filterSync,
    filterActive,
    filterUnmapped,
    filterCat,
    activeCat,
    activeType,
    searchQuery,
    sortBy,
  } = opts;

  return skus
    .filter((s) => {
      if (!kpiFilter) return true;
      if (kpiFilter === 'total') return s.active;
      if (kpiFilter === 'erp') return s.source === 'erp' && s.active;
      if (kpiFilter === 'manual') return s.source === 'manual' && s.active;
      if (kpiFilter === 'errors') return s.erp.status === 'error' || s.erp.status === 'conflict';
      if (kpiFilter === 'unmapped') return !s.typeId && s.active;
      if (kpiFilter === 'inactive') return !s.active;
      return true;
    })
    .filter((s) => {
      if (filterSource && s.source !== filterSource) return false;
      if (filterSync) {
        if (s.source !== 'erp') return false;
        if (s.erp.status !== filterSync) return false;
      }
      if (filterActive === 'active' && !s.active) return false;
      if (filterActive === 'inactive' && s.active) return false;
      if (filterUnmapped && (s.typeId || !s.active)) return false;
      if (filterCat && s.catId !== filterCat) return false;

      if (activeCat === 'unmapped') return !s.typeId && s.active;
      if (activeCat !== 'all' && s.catId !== activeCat) return false;
      if (activeType !== 'all' && activeType !== 'unmapped-cat' && s.typeId !== activeType) return false;
      if (activeType === 'unmapped-cat' && s.typeId) return false;

      return true;
    })
    .filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const tp = productTypes.find((x) => x.id === s.typeId);
      return (
        s.name.toLowerCase().includes(q) ||
        s.number.toLowerCase().includes(q) ||
        (s.barcode && s.barcode.toLowerCase().includes(q)) ||
        (tp && tp.name.toLowerCase().includes(q)) ||
        s.erp.extId.toLowerCase().includes(q) ||
        s.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'number') return a.number.localeCompare(b.number);
      if (sortBy === 'type') {
        const tpA = productTypes.find((x) => x.id === a.typeId)?.name || 'zzz';
        const tpB = productTypes.find((x) => x.id === b.typeId)?.name || 'zzz';
        return tpA.localeCompare(tpB);
      }
      if (sortBy === 'status') return a.active === b.active ? 0 : a.active ? -1 : 1;
      return 0;
    });
}

export function filterTypes(
  productTypes: ProductType[],
  opts: { activeCat: string; searchQuery: string }
): ProductType[] {
  const { activeCat, searchQuery } = opts;
  return productTypes
    .filter((x) => x.active)
    .filter((x) => {
      if (activeCat !== 'all' && x.catId !== activeCat) return false;
      return true;
    })
    .filter((x) => {
      if (!searchQuery) return true;
      return x.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
}
