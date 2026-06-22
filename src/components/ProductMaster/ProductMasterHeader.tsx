import React from 'react';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';
import { useOutsideClick } from '../../hooks/useOutsideClick';

type Props = Pick<
  ProductMasterState,
  | 'showToast'
  | 'addDropdownOpen'
  | 'setAddDropdownOpen'
  | 'openAddSku'
  | 'openAiWizard'
  | 'openImportModal'
  | 'handleExport'
  | 'exporting'
  | 'downloadTemplate'
  | 't'
>;

export const ProductMasterHeader: React.FC<Props> = ({
  addDropdownOpen,
  setAddDropdownOpen,
  openAddSku,
  openAiWizard,
  openImportModal,
  handleExport,
  exporting,
  downloadTemplate,
  t,
}) => {
  const addWrapRef = useOutsideClick<HTMLDivElement>(() => setAddDropdownOpen(false), addDropdownOpen);

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
        <div ref={addWrapRef} className="add-wrap">
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
            <div className="add-dd-i" onClick={openImportModal} role="button" tabIndex={0}>
              📥 {t('importCsv')}
            </div>
            <div
              className="add-dd-i"
              onClick={openAiWizard}
              role="button"
              tabIndex={0}
              style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}
            >
              <span
                style={{
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ✨ {t('aiWizardTitle')}
              </span>
            </div>
            <div className="add-dd-i" onClick={() => void downloadTemplate()} role="button" tabIndex={0}>
              {t('downloadTemplate')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
