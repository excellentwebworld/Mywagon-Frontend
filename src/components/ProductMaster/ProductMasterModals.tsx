import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchableSelect } from '../ui/SearchableSelect';
import { UOM_OPTIONS, TEMP_OPTIONS, PALLET_OPTIONS } from '../../pages/ProductMaster/constants';
import { useTranslation } from '../../hooks/useTranslation';
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
  | 'importStep'
  | 'importResult'
  | 'importLogs'
  | 'importProgress'
  | 'closeImportModal'
  | 'runImport'
  | 'abortImport'
  | 'downloadTemplate'
  | 'downloadCategoryIndex'
  | 't'
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
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    if (pm.editSkuMode || !pm.newSku.typeId) return;
    const tp = pm.productTypes.find((x) => x.id === pm.newSku.typeId);
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

  const categoryOptions = [
    { value: '', label: t('selectCategory') },
    ...pm.categories.map((c) => ({ value: c.id, label: pm.catName(c) })),
  ];

  const typeOptions = [
    { value: '', label: t('selectType') },
    ...pm.productTypes
      .filter((tp) => tp.catId === pm.newSku.catId)
      .map((tp) => ({ value: tp.id, label: tp.name })),
  ];

  const uomOptions = UOM_OPTIONS.map((u) => ({ value: u, label: u }));
  const tempOptions = TEMP_OPTIONS.map((v) => ({ value: v, label: v }));
  const palletOptions = PALLET_OPTIONS.map((v) => ({ value: v, label: v }));

  const handleImportUpload = () => {
    if (!importFile) return;
    void pm.runImport(importFile);
  };

  const resetImportForm = () => {
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return createPortal(
    <>
      {pm.isSkuOpen && (
        <div className="modal-bg show" onClick={() => pm.setIsSkuOpen(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <h3>{pm.editSkuMode ? t('editSku') : t('addSkuMenu')}</h3>
              <button type="button" className="modal-close" onClick={() => pm.setIsSkuOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="mf-row">
                <div className="mf">
                  <label>
                    {t('category')} <span className="req">*</span>
                  </label>
                  <SearchableSelect
                    options={categoryOptions}
                    value={pm.newSku.catId}
                    onChange={(catId) => pm.setNewSku({ ...pm.newSku, catId, typeId: '' })}
                    placeholder={t('selectCategory')}
                  />
                </div>
                <div className="mf">
                  <label>
                    {t('productType')} <span className="req">*</span>
                  </label>
                  <SearchableSelect
                    options={typeOptions}
                    value={pm.newSku.typeId}
                    onChange={(typeId) => pm.setNewSku({ ...pm.newSku, typeId })}
                    placeholder={t('selectType')}
                    disabled={!pm.newSku.catId}
                  />
                </div>
              </div>
              <div className="mf">
                <label>
                  {t('skuName')} <span className="req">*</span>
                </label>
                <input value={pm.newSku.name} onChange={(e) => pm.setNewSku({ ...pm.newSku, name: e.target.value })} />
              </div>
              <div className="mf-row">
                <div className="mf">
                  <label>
                    {t('skuNumber')} <span className="req">*</span>
                  </label>
                  <input value={pm.newSku.number} onChange={(e) => pm.setNewSku({ ...pm.newSku, number: e.target.value })} />
                </div>
                <div className="mf">
                  <label>{t('barcode')}</label>
                  <input value={pm.newSku.barcode} onChange={(e) => pm.setNewSku({ ...pm.newSku, barcode: e.target.value })} />
                </div>
              </div>
              <div className="mf-row">
                <div className="mf">
                  <label>{t('uom')}</label>
                  <SearchableSelect
                    options={uomOptions}
                    value={pm.newSku.uom}
                    onChange={(uom) => pm.setNewSku({ ...pm.newSku, uom })}
                    placeholder={t('uom')}
                  />
                </div>
                <div className="mf">
                  <label>{t('weightKg')}</label>
                  <input value={pm.newSku.weight} onChange={(e) => pm.setNewSku({ ...pm.newSku, weight: e.target.value })} />
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '16px 0 10px', color: 'var(--t2)' }}>{t('shippingDefaults')}</h4>
              <div className="mf-grid">
                <div className="mf">
                  <label>{t('temperature')}</label>
                  <SearchableSelect
                    options={tempOptions}
                    value={pm.newSku.temperature}
                    onChange={(temperature) => pm.setNewSku({ ...pm.newSku, temperature })}
                  />
                </div>
                <div className="mf">
                  <label>{t('palletType')}</label>
                  <SearchableSelect
                    options={palletOptions}
                    value={pm.newSku.palletType}
                    onChange={(palletType) => pm.setNewSku({ ...pm.newSku, palletType })}
                  />
                </div>
              </div>
              <div className="mf-grid">
                <ToggleField
                  label={t('hazardous')}
                  value={pm.newSku.hazardous}
                  onChange={(hazardous) => pm.setNewSku({ ...pm.newSku, hazardous })}
                />
                <ToggleField
                  label={t('stackable')}
                  value={pm.newSku.stackable}
                  onChange={(stackable) => pm.setNewSku({ ...pm.newSku, stackable })}
                />
              </div>

              <div className="mf">
                <label>{t('tags')}</label>
                <input
                  value={pm.newSku.tags}
                  onChange={(e) => pm.setNewSku({ ...pm.newSku, tags: e.target.value })}
                  placeholder={t('tagsCommaSeparated')}
                />
              </div>
            </div>
            <div className="modal-ft">
              <button type="button" className="btn" onClick={() => pm.setIsSkuOpen(false)}>
                {t('cancel')}
              </button>
              <button type="button" className="btn btn-p" onClick={pm.handleSaveSku} disabled={pm.saving}>
                {pm.editSkuMode ? t('save') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pm.isImportOpen && (
        <div className="modal-bg show" onClick={pm.closeImportModal}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <h3>{t('importCsvBulk')}</h3>
              <button type="button" className="modal-close" onClick={pm.closeImportModal}>
                ✕
              </button>
            </div>

            {pm.importStep === 'form' && (
              <>
                <div className="modal-body">
                  <div className="import-opts">
                    <div className="import-opt" onClick={() => void pm.downloadTemplate()} role="button" tabIndex={0}>
                      <div className="io-ico">📄</div>
                      <div className="io-title">{t('downloadBulkTemplate')}</div>
                      <div className="io-sub">{t('downloadBulkTemplateSub')}</div>
                    </div>
                    <div className="import-opt" onClick={pm.downloadCategoryIndex} role="button" tabIndex={0}>
                      <div className="io-ico">🗂️</div>
                      <div className="io-title">{t('downloadCategoryIndex')}</div>
                      <div className="io-sub">{t('downloadCategoryIndexSub')}</div>
                    </div>
                  </div>
                  <div className="mf">
                    <label>{t('uploadFile')}</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt,.xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    />
                    {importFile && (
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 6 }}>{importFile.name}</div>
                    )}
                  </div>
                  <div className="import-stat">
                    <div>
                      <span>{t('expectedColumns')}:</span> {t('importExpectedColumns')}
                    </div>
                  </div>
                </div>
                <div className="modal-ft">
                  <button type="button" className="btn" onClick={pm.closeImportModal}>
                    {t('cancel')}
                  </button>
                  <button type="button" className="btn btn-p" onClick={handleImportUpload} disabled={!importFile}>
                    {t('upload')}
                  </button>
                </div>
              </>
            )}

            {pm.importStep === 'processing' && (
              <>
                <div className="modal-body">
                  <div className="import-progress-head">
                    <div className="import-spinner" aria-hidden />
                    <div className="import-progress-copy">
                      <div className="import-progress-title">{t('importReadingFile')}</div>
                      <div className="import-progress-sub">{t('importInitializing')}</div>
                    </div>
                    <div className="import-progress-pct">{pm.importProgress}%</div>
                  </div>
                  <div className="import-progress-bar">
                    <div className="import-progress-fill" style={{ width: `${pm.importProgress}%` }} />
                  </div>
                  <div className="import-logs-label">
                    <span>{t('importStreamLogs')}</span>
                    <span className="import-log-counter">
                      {pm.importLogs.length} / {pm.importLogs.length}
                    </span>
                  </div>
                  <div className="import-logs-box">
                    {pm.importLogs.length === 0 ? (
                      <div className="import-logs-placeholder">{t('importLogsPlaceholder')}</div>
                    ) : (
                      pm.importLogs.map((line, i) => (
                        <div key={i} className={line.startsWith('✗') ? 'import-log-err' : 'import-log-ok'}>
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="modal-ft import-processing-ft">
                  <span className="import-keep-open">{t('importKeepTabOpen')}</span>
                  <button type="button" className="btn btn-danger btn-sm" onClick={pm.abortImport}>
                    {t('abort')}
                  </button>
                </div>
              </>
            )}

            {pm.importStep === 'result' && pm.importResult && (
              <>
                <div className="modal-body import-result-body">
                  <div className={`import-result-hero${pm.importResult.failed > 0 ? ' warn' : ''}`}>
                    {pm.importResult.failed > 0 ? '⚠️' : '✓'}
                  </div>
                  <h3 className="import-result-title">{t('importFinished')}</h3>
                  <p className="import-result-desc">{t('importFinishedDesc')}</p>
                  <div className="import-result-grid">
                    <div className="import-result-stat">
                      <div className="import-result-val">{pm.importResult.total}</div>
                      <div className="import-result-lbl">{t('totalRows')}</div>
                    </div>
                    <div className="import-result-stat ok">
                      <div className="import-result-val">{pm.importResult.success}</div>
                      <div className="import-result-lbl">{t('succeeded')}</div>
                    </div>
                    <div className="import-result-stat err">
                      <div className="import-result-val">{pm.importResult.failed}</div>
                      <div className="import-result-lbl">{t('failed')}</div>
                    </div>
                  </div>
                  {pm.importLogs.length > 0 && (
                    <div className="import-logs-box import-logs-box-compact">
                      {pm.importLogs.slice(0, 20).map((line, i) => (
                        <div key={i} className={line.startsWith('✗') ? 'import-log-err' : 'import-log-ok'}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-ft" style={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-p"
                    onClick={() => {
                      resetImportForm();
                      pm.closeImportModal();
                    }}
                  >
                    {t('importDoneRefresh')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
