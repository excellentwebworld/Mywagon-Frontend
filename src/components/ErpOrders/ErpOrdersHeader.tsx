import React from 'react';
import { ExportIcon, PlusIcon } from './erpOrderIcons';

type Props = {
  t: (key: string) => string;
  summarySubtitle: number;
  selectedCount: number;
  openCreateOrder: () => void;
  openAiWizard: () => void;
  onExport: () => void;
  onCreateLoad: () => void;
};

export const ErpOrdersHeader: React.FC<Props> = ({
  t,
  summarySubtitle,
  selectedCount,
  openCreateOrder,
  openAiWizard,
  onExport,
  onCreateLoad,
}) => (
  <div className="pg-head anim">
    <div className="pg-head-l">
      <div className="pg-t">{t('erpOrders')}</div>
      <div className="pg-s">
        {summarySubtitle} {t('erpOrdersSubtitle')}
      </div>
    </div>
    <div className="pg-head-r">
      <button type="button" className="btn" onClick={openCreateOrder}>
        <PlusIcon />
        {t('erpOrdersCreateOrder')}
      </button>
      <button type="button" className="btn" onClick={openAiWizard}>
        ✨ {t('erpOrdersImport')}
      </button>
      <button type="button" className="btn" onClick={onExport}>
        <ExportIcon />
        {t('erpOrdersExport')}
      </button>
      <button
        type="button"
        className="btn btn-p"
        disabled={selectedCount === 0}
        onClick={onCreateLoad}
      >
        <PlusIcon />
        {t('erpOrdersCreateLoad')}
      </button>
    </div>
  </div>
);
