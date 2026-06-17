import React from 'react';
import type { ProductType, SKU } from '../../context/AppContext';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 'lang'
  | 't'
  | 'categories'
  | 'productTypes'
  | 'skus'
  | 'catName'
  | 'selectedItem'
  | 'selectedKind'
  | 'clearSelection'
  | 'secCollapsed'
  | 'toggleSec'
  | 'openEditSku'
  | 'updateSku'
  | 'setSelectedItem'
  | 'setSelectedKind'
  | 'setRenameId'
  | 'setRenameName'
  | 'setIsRenameOpen'
  | 'setMergeSrc'
  | 'setMergeTarget'
  | 'setIsMergeOpen'
  | 'updateProductType'
  | 'showToast'
>;

export const ProductDetailPanel: React.FC<Props> = ({
  lang,
  t,
  categories,
  productTypes,
  skus,
  catName,
  selectedItem,
  selectedKind,
  clearSelection,
  secCollapsed,
  toggleSec,
  openEditSku,
  updateSku,
  setSelectedItem,
  setSelectedKind,
  setRenameId,
  setRenameName,
  setIsRenameOpen,
  setMergeSrc,
  setMergeTarget,
  setIsMergeOpen,
  updateProductType,
  showToast,
}) => (
  <div className={`detail-pane${selectedItem ? ' open' : ''}`}>
    <div className="dp-inner">
      {selectedItem && selectedKind === 'sku' && (
        <SkuDetail
          sku={selectedItem as SKU}
          productTypes={productTypes}
          categories={categories}
          catName={catName}
          clearSelection={clearSelection}
          secCollapsed={secCollapsed}
          toggleSec={toggleSec}
          openEditSku={openEditSku}
          updateSku={updateSku}
          setSelectedItem={setSelectedItem}
        />
      )}
      {selectedItem && selectedKind === 'type' && (
        <TypeDetail
          tp={selectedItem as ProductType}
          categories={categories}
          skus={skus}
          catName={catName}
          t={t}
          lang={lang}
          clearSelection={clearSelection}
          secCollapsed={secCollapsed}
          toggleSec={toggleSec}
          setRenameId={setRenameId}
          setRenameName={setRenameName}
          setIsRenameOpen={setIsRenameOpen}
          setMergeSrc={setMergeSrc}
          setMergeTarget={setMergeTarget}
          setIsMergeOpen={setIsMergeOpen}
          updateProductType={updateProductType}
          setSelectedItem={setSelectedItem}
          setSelectedKind={setSelectedKind}
          showToast={showToast}
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
  secCollapsed,
  toggleSec,
  openEditSku,
  updateSku,
  setSelectedItem,
}: {
  sku: SKU;
  productTypes: ProductType[];
  categories: ProductMasterState['categories'];
  catName: ProductMasterState['catName'];
  clearSelection: () => void;
  secCollapsed: Record<string, boolean>;
  toggleSec: (key: string) => void;
  openEditSku: (s: SKU) => void;
  updateSku: ProductMasterState['updateSku'];
  setSelectedItem: ProductMasterState['setSelectedItem'];
}) {
  const tp = productTypes.find((x) => x.id === s.typeId);
  const cat = categories.find((x) => x.id === s.catId);

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
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const updated = { ...s, active: !s.active };
              updateSku(updated);
              setSelectedItem(updated);
            }}
          >
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

function TypeDetail({
  tp,
  categories,
  skus,
  catName,
  t,
  lang,
  clearSelection,
  secCollapsed,
  toggleSec,
  setRenameId,
  setRenameName,
  setIsRenameOpen,
  setMergeSrc,
  setMergeTarget,
  setIsMergeOpen,
  updateProductType,
  setSelectedItem,
  setSelectedKind,
  showToast,
}: {
  tp: ProductType;
  categories: ProductMasterState['categories'];
  skus: SKU[];
  catName: ProductMasterState['catName'];
  t: ProductMasterState['t'];
  lang: string;
  clearSelection: () => void;
  secCollapsed: Record<string, boolean>;
  toggleSec: (key: string) => void;
  setRenameId: ProductMasterState['setRenameId'];
  setRenameName: ProductMasterState['setRenameName'];
  setIsRenameOpen: ProductMasterState['setIsRenameOpen'];
  setMergeSrc: ProductMasterState['setMergeSrc'];
  setMergeTarget: ProductMasterState['setMergeTarget'];
  setIsMergeOpen: ProductMasterState['setIsMergeOpen'];
  updateProductType: ProductMasterState['updateProductType'];
  setSelectedItem: ProductMasterState['setSelectedItem'];
  setSelectedKind: ProductMasterState['setSelectedKind'];
  showToast: ProductMasterState['showToast'];
}) {
  const cat = categories.find((c) => c.id === tp.catId);
  const mappedSkus = skus.filter((s) => s.typeId === tp.id && s.active);
  const erpCount = mappedSkus.filter((s) => s.source === 'erp').length;

  return (
    <>
      <div className="dp-hero">
        <button type="button" className="dp-close" onClick={clearSelection}>
          ✕
        </button>
        <div className="dp-badges">
          <span className="type-pill">Product Type</span>
        </div>
        <div className="dp-name">{tp.name}</div>
        <div className="dp-sub">{cat ? `${cat.icon} ${catName(cat)}` : '—'}</div>

        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat-card">
            <div className="sv">{mappedSkus.length}</div>
            <div className="sl">Mapped SKUs</div>
          </div>
          <div className="stat-card">
            <div className="sv">{erpCount}</div>
            <div className="sl">ERP SKUs</div>
          </div>
          <div className="stat-card">
            <div className="sv">{tp.s30}</div>
            <div className="sl">Shipments (30d)</div>
          </div>
          <div className="stat-card">
            <div className="sv">{tp.defaults.temp}</div>
            <div className="sl">Temperature</div>
          </div>
        </div>

        <div className="dp-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setRenameId(tp.id);
              setRenameName(tp.name);
              setIsRenameOpen(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setMergeSrc(tp);
              setMergeTarget('');
              setIsMergeOpen(true);
            }}
          >
            Merge
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (window.confirm(t('archiveConfirm'))) {
                updateProductType({ ...tp, active: false });
                clearSelection();
                showToast(`Archived type "${tp.name}"`, 'info');
              }
            }}
          >
            Archive
          </button>
        </div>
      </div>

      <div className="dp-sec">
        <div className="dp-sec-h" onClick={() => toggleSec('defaults')} role="button" tabIndex={0}>
          📦 Shipping Defaults
          <span className={`chev${!secCollapsed.defaults ? ' open' : ''}`}>▼</span>
        </div>
        {!secCollapsed.defaults && (
          <div className="dp-sec-body">
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
          </div>
        )}
      </div>

      <div className="dp-sec">
        <div className="dp-sec-h" onClick={() => toggleSec('mapped')} role="button" tabIndex={0}>
          🏷️ Mapped SKUs ({mappedSkus.length})
          <span className={`chev${!secCollapsed.mapped ? ' open' : ''}`}>▼</span>
        </div>
        {!secCollapsed.mapped && (
          <div className="dp-sec-body">
            {mappedSkus.length === 0 ? (
              <div style={{ color: 'var(--t3)', fontSize: 12 }}>
                {lang === 'el' ? 'Δεν υπάρχουν SKU' : 'No SKUs mapped'}
              </div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Number</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedSkus.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => {
                        setSelectedItem(s);
                        setSelectedKind('sku');
                      }}
                    >
                      <td>{s.name}</td>
                      <td>{s.number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
