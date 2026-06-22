import React, { useEffect } from 'react';
import { UOM_OPTIONS, TEMP_OPTIONS, PALLET_OPTIONS } from '../../pages/ProductMaster/constants';
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

function ToggleField({
  label,
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="mf">
      <label>{label}</label>
      <div className="tog" onClick={() => onChange(!value)} role="button" tabIndex={0}>
        <div className={`tog-sw${value ? ' on' : ''}`} />
        <span className="tog-txt">{value ? yesLabel : noLabel}</span>
      </div>
    </div>
  );
}

export const ProductMasterModals: React.FC<Props> = (pm) => {
  useEffect(() => {
    if (pm.editSkuMode || !pm.newSku.typeId) return;
    const tp = pm.productTypes.find((t) => t.id === pm.newSku.typeId);
    if (!tp) return;
    pm.setNewSku((prev) => {
      if (
        prev.temperature === tp.defaults.temp &&
        prev.palletType === tp.defaults.palletType &&
        prev.hazardous === tp.defaults.hazard &&
        prev.stackable === tp.defaults.stackable
      ) {
        return prev;
      }
      return {
        ...prev,
        temperature: tp.defaults.temp,
        palletType: tp.defaults.palletType,
        hazardous: tp.defaults.hazard,
        stackable: tp.defaults.stackable,
      };
    });
  }, [pm.newSku.typeId, pm.editSkuMode, pm.productTypes]);

  return (
    <>
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
                <select
                  value={pm.newSku.typeId}
                  onChange={(e) => pm.setNewSku({ ...pm.newSku, typeId: e.target.value })}
                  disabled={!pm.newSku.catId}
                >
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
                <label>Weight (kg)</label>
                <input value={pm.newSku.weight} onChange={(e) => pm.setNewSku({ ...pm.newSku, weight: e.target.value })} />
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, margin: '16px 0 10px', color: 'var(--t2)' }}>Shipping Defaults</h4>
            <div className="mf-grid">
              <div className="mf">
                <label>Temperature</label>
                <select
                  value={pm.newSku.temperature}
                  onChange={(e) => pm.setNewSku({ ...pm.newSku, temperature: e.target.value })}
                >
                  {TEMP_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mf">
                <label>Pallet Type</label>
                <select
                  value={pm.newSku.palletType}
                  onChange={(e) => pm.setNewSku({ ...pm.newSku, palletType: e.target.value })}
                >
                  {PALLET_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mf-grid">
              <ToggleField
                label="Hazardous?"
                value={pm.newSku.hazardous}
                onChange={(hazardous) => pm.setNewSku({ ...pm.newSku, hazardous })}
              />
              <ToggleField
                label="Stackable?"
                value={pm.newSku.stackable}
                onChange={(stackable) => pm.setNewSku({ ...pm.newSku, stackable })}
              />
            </div>

            <div className="mf">
              <label>Tags</label>
              <input
                value={pm.newSku.tags}
                onChange={(e) => pm.setNewSku({ ...pm.newSku, tags: e.target.value })}
                placeholder="comma-separated"
              />
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
};
