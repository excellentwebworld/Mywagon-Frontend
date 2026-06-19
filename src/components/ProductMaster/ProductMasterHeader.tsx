import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 'showToast'
  | 'addDropdownOpen'
  | 'setAddDropdownOpen'
  | 'openAddSku'
  | 'handleCSVUpload'
  | 'handleExport'
  | 'exporting'
  | 'downloadTemplate'
>;

export const ProductMasterHeader: React.FC<Props> = ({
  addDropdownOpen,
  setAddDropdownOpen,
  openAddSku,
  handleCSVUpload,
  handleExport,
  exporting,
  downloadTemplate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="page-hdr anim">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.3px' }}>{t('prodMaster')}</h1>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3 }}>{t('subtitle')}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn btn-md" onClick={handleExport} disabled={exporting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? t('abExporting') : t('export')}
        </button>
        <div className="add-wrap">
          <button
            type="button"
            className="btn btn-p btn-md"
            onClick={(e) => {
              e.stopPropagation();
              setAddDropdownOpen(!addDropdownOpen);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('add')}
          </button>
          <div className={`add-dd${addDropdownOpen ? ' show' : ''}`}>
            <div className="add-dd-i" onClick={openAddSku} role="button" tabIndex={0}>
              {t('addSkuMenu')}
            </div>
            <div className="add-dd-i" onClick={() => document.getElementById('pm-csv-input')?.click()} role="button" tabIndex={0}>
              📥 {t('importCsv')}
            </div>
            <div className="add-dd-i" onClick={downloadTemplate} role="button" tabIndex={0}>
              {t('downloadTemplate')}
            </div>
          </div>
          <input id="pm-csv-input" type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
};
