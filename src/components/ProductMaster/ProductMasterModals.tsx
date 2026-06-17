import React from 'react';
import { CATEGORY_ICONS, PALLET_OPTIONS, TEMP_OPTIONS, UOM_OPTIONS } from '../../pages/ProductMaster/constants';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';
import { syncDotClass } from '../../pages/ProductMaster/utils/productUtils';

type Props = Pick<
  ProductMasterState,
  | 'lang'
  | 'categories'
  | 'productTypes'
  | 'catName'
  | 'isTypeOpen'
  | 'setIsTypeOpen'
  | 'newType'
  | 'setNewType'
  | 'handleCreateType'
  | 'isSkuOpen'
  | 'setIsSkuOpen'
  | 'editSkuMode'
  | 'newSku'
  | 'setNewSku'
  | 'handleSaveSku'
  | 'isCatOpen'
  | 'setIsCatOpen'
  | 'newCat'
  | 'setNewCat'
  | 'handleCreateCategory'
  | 'isRenameOpen'
  | 'setIsRenameOpen'
  | 'renameName'
  | 'setRenameName'
  | 'handleRenameType'
  | 'isMergeOpen'
  | 'setIsMergeOpen'
  | 'mergeSrc'
  | 'mergeTarget'
  | 'setMergeTarget'
  | 'handleMergeTypes'
  | 'isBulkMapOpen'
  | 'setIsBulkMapOpen'
  | 'bulkMapTarget'
  | 'setBulkMapTarget'
  | 'selectedIds'
  | 'handleBulkMap'
  | 'isImportOpen'
  | 'setIsImportOpen'
  | 'importData'
  | 'triggerCSVImport'
  | 'isSyncLogOpen'
  | 'setIsSyncLogOpen'
  | 'syncLogs'
>;

export const ProductMasterModals: React.FC<Props> = (pm) => (
  <>
    <div className={`modal-bg${pm.isTypeOpen ? ' show' : ''}`} onClick={() => pm.setIsTypeOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Add Product Type</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsTypeOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mf">
            <label>
              Category <span className="req">*</span>
            </label>
            <select value={pm.newType.catId} onChange={(e) => pm.setNewType({ ...pm.newType, catId: e.target.value })}>
              <option value="">— Select Category —</option>
              {pm.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {pm.catName(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="mf">
            <label>
              Type Name <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bottled Water"
              value={pm.newType.name}
              onChange={(e) => pm.setNewType({ ...pm.newType, name: e.target.value })}
            />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, margin: '16px 0 10px' }}>Defaults</div>
          <div className="mf-grid">
            <div className="mf">
              <label>Temperature</label>
              <select value={pm.newType.temp} onChange={(e) => pm.setNewType({ ...pm.newType, temp: e.target.value })}>
                {TEMP_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="mf">
              <label>Pallet Type</label>
              <select
                value={pm.newType.palletType}
                onChange={(e) => pm.setNewType({ ...pm.newType, palletType: e.target.value })}
              >
                {PALLET_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mf-grid" style={{ marginTop: 12 }}>
            <div className="mf">
              <label>Hazardous</label>
              <div className="tog" onClick={() => pm.setNewType({ ...pm.newType, hazard: !pm.newType.hazard })}>
                <div className={`tog-sw${pm.newType.hazard ? ' on' : ''}`} />
                <span>{pm.newType.hazard ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="mf">
              <label>Stackable</label>
              <div className="tog" onClick={() => pm.setNewType({ ...pm.newType, stackable: !pm.newType.stackable })}>
                <div className={`tog-sw${pm.newType.stackable ? ' on' : ''}`} />
                <span>{pm.newType.stackable ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsTypeOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={pm.handleCreateType}>
            Create
          </button>
        </div>
      </div>
    </div>

    <div className={`modal-bg${pm.isSkuOpen ? ' show' : ''}`} onClick={() => pm.setIsSkuOpen(false)}>
      <div className="modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{pm.editSkuMode ? 'Edit SKU' : 'Add SKU'}</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsSkuOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mf-row">
            <div className="mf">
              <label>
                Category <span className="req">*</span>
              </label>
              <select
                value={pm.newSku.catId}
                onChange={(e) => pm.setNewSku({ ...pm.newSku, catId: e.target.value, typeId: '' })}
              >
                <option value="">— Select Category —</option>
                {pm.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {pm.catName(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mf">
              <label>Product Type</label>
              <select value={pm.newSku.typeId} onChange={(e) => pm.setNewSku({ ...pm.newSku, typeId: e.target.value })}>
                <option value="">— Select Type —</option>
                {pm.productTypes
                  .filter((tp) => tp.catId === pm.newSku.catId && tp.active)
                  .map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="mf">
            <label>
              SKU Name <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Coca-Cola 330ml Can"
              value={pm.newSku.name}
              onChange={(e) => pm.setNewSku({ ...pm.newSku, name: e.target.value })}
            />
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>
                SKU Number <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 5201054001011"
                value={pm.newSku.number}
                onChange={(e) => pm.setNewSku({ ...pm.newSku, number: e.target.value })}
              />
            </div>
            <div className="mf">
              <label>Barcode</label>
              <input
                type="text"
                placeholder="Barcode"
                value={pm.newSku.barcode}
                onChange={(e) => pm.setNewSku({ ...pm.newSku, barcode: e.target.value })}
              />
            </div>
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>Unit of Measure</label>
              <select value={pm.newSku.uom} onChange={(e) => pm.setNewSku({ ...pm.newSku, uom: e.target.value })}>
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="mf">
              <label>Weight</label>
              <input
                type="text"
                placeholder="e.g. 12.5 kg"
                value={pm.newSku.weight}
                onChange={(e) => pm.setNewSku({ ...pm.newSku, weight: e.target.value })}
              />
            </div>
          </div>
          <div className="mf">
            <label>Tags</label>
            <input
              type="text"
              placeholder="Comma-separated tags"
              value={pm.newSku.tags}
              onChange={(e) => pm.setNewSku({ ...pm.newSku, tags: e.target.value })}
            />
          </div>
          <div className="mf">
            <label>Active</label>
            <div className="tog" onClick={() => pm.setNewSku((prev) => ({ ...prev, active: !prev.active }))}>
              <div className={`tog-sw${pm.newSku.active ? ' on' : ''}`} />
              <span>{pm.newSku.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsSkuOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={pm.handleSaveSku}>
            Save
          </button>
        </div>
      </div>
    </div>

    <div className={`modal-bg${pm.isCatOpen ? ' show' : ''}`} onClick={() => pm.setIsCatOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Add Category</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsCatOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mf">
            <label>
              Category Name <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dairy Products"
              value={pm.newCat.name}
              onChange={(e) => pm.setNewCat({ ...pm.newCat, name: e.target.value })}
            />
          </div>
          <div className="mf">
            <label>Icon</label>
            <div className="ico-grid">
              {CATEGORY_ICONS.map((i) => (
                <div
                  key={i}
                  className={`ico-opt${pm.newCat.icon === i ? ' sel' : ''}`}
                  onClick={() => pm.setNewCat({ ...pm.newCat, icon: i })}
                  role="button"
                  tabIndex={0}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsCatOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={pm.handleCreateCategory}>
            Create
          </button>
        </div>
      </div>
    </div>

    <div className={`modal-bg${pm.isRenameOpen ? ' show' : ''}`} onClick={() => pm.setIsRenameOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Rename Product Type</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsRenameOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mf">
            <label>
              New Name <span className="req">*</span>
            </label>
            <input type="text" value={pm.renameName} onChange={(e) => pm.setRenameName(e.target.value)} />
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsRenameOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={pm.handleRenameType}>
            Rename
          </button>
        </div>
      </div>
    </div>

    {pm.mergeSrc && (
      <div className={`modal-bg${pm.isMergeOpen ? ' show' : ''}`} onClick={() => pm.setIsMergeOpen(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-h">
            <h3>Merge &quot;{pm.mergeSrc.name}&quot; → …</h3>
            <button type="button" className="modal-close" onClick={() => pm.setIsMergeOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12 }}>
              All SKUs mapped to &quot;{pm.mergeSrc.name}&quot; will be reassigned. Select target:
            </div>
            <div className="bm-type-list">
              {pm.productTypes
                .filter((x) => x.active && x.id !== pm.mergeSrc!.id && x.catId === pm.mergeSrc!.catId)
                .map((x) => (
                  <div
                    key={x.id}
                    className={`bm-type-item${pm.mergeTarget === x.id ? ' sel' : ''}`}
                    onClick={() => pm.setMergeTarget(x.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <strong>{x.name}</strong>
                  </div>
                ))}
            </div>
          </div>
          <div className="modal-ft">
            <button type="button" className="btn" onClick={() => pm.setIsMergeOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-p" onClick={pm.handleMergeTypes} disabled={!pm.mergeTarget}>
              Merge
            </button>
          </div>
        </div>
      </div>
    )}

    <div className={`modal-bg${pm.isBulkMapOpen ? ' show' : ''}`} onClick={() => pm.setIsBulkMapOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Map {pm.selectedIds.size} SKU(s) to Product Type</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsBulkMapOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="bm-type-list">
            {pm.productTypes
              .filter((x) => x.active)
              .map((x) => {
                const cat = pm.categories.find((c) => c.id === x.catId);
                return (
                  <div
                    key={x.id}
                    className={`bm-type-item${pm.bulkMapTarget === x.id ? ' sel' : ''}`}
                    onClick={() => pm.setBulkMapTarget(x.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <strong>{x.name}</strong>
                    {cat && <span className="bm-cat">{pm.catName(cat)}</span>}
                  </div>
                );
              })}
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsBulkMapOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={pm.handleBulkMap} disabled={!pm.bulkMapTarget}>
            Map Type
          </button>
        </div>
      </div>
    </div>

    <div className={`modal-bg${pm.isImportOpen ? ' show' : ''}`} onClick={() => pm.setIsImportOpen(false)}>
      <div className="modal" style={{ width: 700 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>CSV Import Preview</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsImportOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="import-stat">
            <span style={{ color: 'var(--ok)' }}>
              ✓ {pm.importData.filter((r) => !r.dupe && r.catId).length} valid
            </span>
            <span style={{ color: 'var(--er)' }}>
              ✕ {pm.importData.filter((r) => r.dupe || !r.catId).length} errors
            </span>
          </div>
          <div className="import-preview">
            <table>
              <thead>
                <tr>
                  <th>Line</th>
                  <th>SKU Name</th>
                  <th>SKU Number</th>
                  <th>Category</th>
                  <th>Product Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pm.importData.map((r) => (
                  <tr key={r.line} className={r.dupe || !r.catId ? 'err' : ''}>
                    <td>{r.line}</td>
                    <td>{r.name}</td>
                    <td>{r.number}</td>
                    <td>{r.catName || '—'}</td>
                    <td>{r.typeName || '—'}</td>
                    <td>
                      {r.dupe ? (
                        <span style={{ color: 'var(--er)' }}>Duplicate</span>
                      ) : !r.catId ? (
                        <span style={{ color: 'var(--er)' }}>Missing Category</span>
                      ) : (
                        <span style={{ color: 'var(--ok)' }}>Valid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsImportOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-p"
            onClick={pm.triggerCSVImport}
            disabled={pm.importData.filter((r) => !r.dupe && r.catId).length === 0}
          >
            Import Valid Rows
          </button>
        </div>
      </div>
    </div>

    <div className={`sync-panel-bg${pm.isSyncLogOpen ? ' show' : ''}`} onClick={() => pm.setIsSyncLogOpen(false)}>
      <div className="sync-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sync-panel-h">
          <h3>📋 ERP Sync Log</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsSyncLogOpen(false)}>
            ✕
          </button>
        </div>
        <div className="sync-list">
          {pm.syncLogs.map((e, idx) => (
            <div key={idx} className="sync-entry">
              <div className="se-h">
                <span className={`sync-dot ${syncDotClass(e.st)}`} />
                {e.s} → {e.a}
                <span className="se-time">{e.t}</span>
              </div>
              <div className="se-body">{e.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
