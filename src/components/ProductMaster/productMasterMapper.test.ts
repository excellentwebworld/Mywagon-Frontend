import { describe, expect, it } from 'vitest';
import { facetToListParams, mapApiSkuToSku } from '../../api/mappers/productMasterMapper';

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
});
