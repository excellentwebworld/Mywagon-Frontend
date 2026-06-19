import React, { useState } from 'react';
import type { ProductType, SKU } from '../../context/AppContext';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 'categories'
  | 'productTypes'
  | 'catName'
  | 'selectedItem'
  | 'selectedKind'
  | 'detailLoading'
  | 'clearSelection'
  | 'openEditSku'
  | 'handleToggleActive'
  | 'showToast'
>;

export const ProductDetailPanel: React.FC<Props> = ({
  categories,
  productTypes,
  catName,
  selectedItem,
  selectedKind,
  detailLoading,
  clearSelection,
  openEditSku,
  handleToggleActive,
}) => (
  <div className={`detail-pane${selectedItem ? ' open' : ''}`}>
    <div className="dp-inner">
      {detailLoading && <div className="empty-state"><div className="et">Loading…</div></div>}
      {selectedItem && selectedKind === 'sku' && !detailLoading && (
        <SkuDetail
          sku={selectedItem as SKU}
          productTypes={productTypes}
          categories={categories}
          catName={catName}
          clearSelection={clearSelection}
          openEditSku={openEditSku}
          handleToggleActive={handleToggleActive}
        />
      )}
    </div>
  </div>
);

function SkuDetail({
  sku: s,
  productTypes,
  categories,
  catName,
  clearSelection,
  openEditSku,
  handleToggleActive,
}: {
  sku: SKU;
  productTypes: ProductType[];
  categories: ProductMasterState['categories'];
  catName: ProductMasterState['catName'];
  clearSelection: () => void;
  openEditSku: (s: SKU) => void;
  handleToggleActive: (s: SKU) => void;
}) {
  const tp = productTypes.find((x) => x.id === s.typeId);
  const cat = categories.find((x) => x.id === s.catId);
  const [secCollapsed, setSecCollapsed] = useState<Record<string, boolean>>({});
  const toggleSec = (key: string) => setSecCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      <div className="dp-hero">
        <button type="button" className="dp-close" onClick={clearSelection}>
          ✕
        </button>
        <div className="dp-badges">
          <span className={`src-badge ${s.source === 'erp' ? 'src-erp' : 'src-manual'}`}>
            {s.source === 'erp' ? 'ERP' : 'Manual'}
          </span>
          {s.erp.status === 'conflict' && (
            <span className="src-badge" style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
              Conflict
            </span>
          )}
          {!s.typeId && (
            <span className="src-badge" style={{ background: 'var(--bol)', color: '#92400E', border: '1px solid var(--bobd)' }}>
              Unmapped
            </span>
          )}
          {!s.active && <span className="src-badge src-manual">Inactive</span>}
        </div>
        <div className="dp-name">{s.name}</div>
        <div className="dp-sub">
          {tp ? tp.name : 'No type assigned'} · {cat ? catName(cat) : '—'}
        </div>
        <div className="dp-meta">
          <div>
            <strong>SKU Number:</strong> {s.number}
          </div>
          {s.barcode && (
            <div>
              <strong>Barcode:</strong> {s.barcode}
            </div>
          )}
          {s.weight && (
            <div>
              <strong>Weight:</strong> {s.weight}
            </div>
          )}
          {s.uom && (
            <div>
              <strong>Unit:</strong> {s.uom}
            </div>
          )}
        </div>
        <div className="dp-actions">
          <button type="button" className="btn btn-sm" onClick={() => openEditSku(s)}>
            Edit
          </button>
          <button type="button" className="btn btn-sm" onClick={() => handleToggleActive(s)}>
            {s.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {s.source === 'erp' && s.erp.status === 'conflict' && (
        <div style={{ padding: '12px 20px' }}>
          <div className="conflict-banner">
            <strong>Sync conflict:</strong> {s.erp.error || 'Field mismatch with ERP source'}
          </div>
        </div>
      )}

      {s.source === 'erp' && (
        <div className="dp-sec">
          <div className="dp-sec-h" onClick={() => toggleSec('erp')} role="button" tabIndex={0}>
            🔌 ERP Integration
            <span className={`chev${!secCollapsed.erp ? ' open' : ''}`}>▼</span>
          </div>
          {!secCollapsed.erp && (
            <div className="dp-sec-body">
              <div className="dp-row">
                <span className="label">ERP System</span>
                <span className="val">{s.erp.system || '—'}</span>
              </div>
              <div className="dp-row">
                <span className="label">External ID</span>
                <span className="val">{s.erp.extId || '—'}</span>
              </div>
              <div className="dp-row">
                <span className="label">Last Synced</span>
                <span className="val">{s.erp.lastSync || '—'}</span>
              </div>
              <div className="dp-row">
                <span className="label">Sync Status</span>
                <span className="val">{s.erp.status || '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dp-sec">
        <div className="dp-sec-h" onClick={() => toggleSec('shipping')} role="button" tabIndex={0}>
          📦 Shipping Defaults
          <span className={`chev${!secCollapsed.shipping ? ' open' : ''}`}>▼</span>
        </div>
        {!secCollapsed.shipping && (
          <div className="dp-sec-body">
            {tp ? (
              <>
                <div className="dp-row">
                  <span className="label">Temperature</span>
                  <span className="val">{tp.defaults.temp}</span>
                </div>
                <div className="dp-row">
                  <span className="label">Hazardous</span>
                  <span className="val">{tp.defaults.hazard ? 'Yes' : 'No'}</span>
                </div>
                <div className="dp-row">
                  <span className="label">Stackable</span>
                  <span className="val">{tp.defaults.stackable ? 'Yes' : 'No'}</span>
                </div>
                <div className="dp-row">
                  <span className="label">Pallet Type</span>
                  <span className="val">{tp.defaults.palletType}</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--t3)', fontSize: 12 }}>No type profile assigned</div>
            )}
          </div>
        )}
      </div>

      {s.tags.length > 0 && (
        <div className="dp-sec">
          <div className="dp-sec-h">🏷️ Tags</div>
          <div className="dp-sec-body" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.tags.map((tag) => (
              <span key={tag} className="type-pill">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
