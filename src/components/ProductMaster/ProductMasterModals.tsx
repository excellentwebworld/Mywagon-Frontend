import React from 'react';
import { UOM_OPTIONS } from '../../pages/ProductMaster/constants';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 'categories'
  | 'productTypes'
  | 'catName'
  | 'isSkuOpen'
  | 'setIsSkuOpen'
  | 'editSkuMode'
  | 'newSku'
  | 'setNewSku'
  | 'handleSaveSku'
  | 'saving'
  | 'isImportOpen'
  | 'setIsImportOpen'
  | 'importSummary'
>;

export const ProductMasterModals: React.FC<Props> = (pm) => (
  <>
    <div className={`modal-bg${pm.isSkuOpen ? ' show' : ''}`} onClick={() => pm.setIsSkuOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{pm.editSkuMode ? 'Edit SKU' : 'Add SKU'}</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsSkuOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mf">
            <label>
              Category <span className="req">*</span>
            </label>
            <select value={pm.newSku.catId} onChange={(e) => pm.setNewSku({ ...pm.newSku, catId: e.target.value, typeId: '' })}>
              <option value="">— Select —</option>
              {pm.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {pm.catName(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="mf">
            <label>
              Product Type <span className="req">*</span>
            </label>
            <select value={pm.newSku.typeId} onChange={(e) => pm.setNewSku({ ...pm.newSku, typeId: e.target.value })}>
              <option value="">— Select —</option>
              {pm.productTypes
                .filter((tp) => tp.catId === pm.newSku.catId)
                .map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mf">
            <label>
              SKU Name <span className="req">*</span>
            </label>
            <input value={pm.newSku.name} onChange={(e) => pm.setNewSku({ ...pm.newSku, name: e.target.value })} />
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>
                SKU Number <span className="req">*</span>
              </label>
              <input value={pm.newSku.number} onChange={(e) => pm.setNewSku({ ...pm.newSku, number: e.target.value })} />
            </div>
            <div className="mf">
              <label>Barcode</label>
              <input value={pm.newSku.barcode} onChange={(e) => pm.setNewSku({ ...pm.newSku, barcode: e.target.value })} />
            </div>
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>Unit</label>
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
              <input value={pm.newSku.weight} onChange={(e) => pm.setNewSku({ ...pm.newSku, weight: e.target.value })} />
            </div>
          </div>
          <div className="mf">
            <label>Tags</label>
            <input value={pm.newSku.tags} onChange={(e) => pm.setNewSku({ ...pm.newSku, tags: e.target.value })} placeholder="comma-separated" />
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={() => pm.setIsSkuOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={pm.handleSaveSku} disabled={pm.saving}>
            {pm.editSkuMode ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>

    <div className={`modal-bg${pm.isImportOpen ? ' show' : ''}`} onClick={() => pm.setIsImportOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>Import Complete</h3>
          <button type="button" className="modal-close" onClick={() => pm.setIsImportOpen(false)}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>{pm.importSummary ?? 'Import finished.'}</p>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn btn-p" onClick={() => pm.setIsImportOpen(false)}>
            OK
          </button>
        </div>
      </div>
    </div>
  </>
);
