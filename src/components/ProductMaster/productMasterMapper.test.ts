import { describe, expect, it } from 'vitest';
import {
  facetToListParams,
  mapApiSkuToSku,
  mapTypeGridToProductTypes,
} from '../../api/mappers/productMasterMapper';

describe('ProductMaster Mapper & Filter Parameters', () => {
  it('maps archived status filter correctly in facetToListParams', () => {
    const params = facetToListParams('all', 'all', 'archived', false, '', 1, 12, '', '');
    expect(params.status).toBe('archived');
  });

  it('maps active and inactive status filters correctly', () => {
    const activeParams = facetToListParams('all', 'all', 'active', false, '', 1, 12, '', '');
    expect(activeParams.status).toBe('active');

    const inactiveParams = facetToListParams('all', 'all', 'inactive', false, '', 1, 12, '', '');
    expect(inactiveParams.status).toBe('inactive');
  });

  it('maps archived SKU accurately from API response item', () => {
    const apiItem = {
      id: '101',
      name: 'Archived SKU Item',
      number: 'ARC-001',
      barcode: '1234567890',
      category_id: '1',
      type_id: '2',
      source: 'manual',
      sync_status: 'synced',
      active: true,
      archived: true,
      hazardous: false,
      stackable: true,
      shipments_30: 0,
      shipments_90: 0,
      shipments_total: 0,
      is_unmapped: false,
    };

    const sku = mapApiSkuToSku(apiItem);
    expect(sku.id).toBe('101');
    expect(sku.name).toBe('Archived SKU Item');
    expect(sku.archived).toBe(true);
  });

  it('maps type grid items to product types correctly', () => {
    const gridItems = [
      {
        category_name: 'Food & Beverages',
        type_name: 'Dairy products',
        sku_count: 1,
        shipment_count: 8,
        shipment_count_30: 0,
        shipment_count_90: 0,
      },
    ];
    const referenceCategories = [
      {
        id: 'CAT-01',
        name: 'Food & Beverages',
        name_raw: { english: 'Food & Beverages', greek: 'Τρόφιμα & Ποτά' },
        types: [{ id: 'PT-01', name: 'Dairy products' }],
      },
    ];

    const types = mapTypeGridToProductTypes(gridItems, referenceCategories);
    expect(types).toHaveLength(1);
    expect(types[0].id).toBe('PT-01');
    expect(types[0].catId).toBe('CAT-01');
    expect(types[0].name).toBe('Dairy products');
    expect(types[0].skuCount).toBe(1);
    expect(types[0].shipmentTotal).toBe(8);
  });
});
