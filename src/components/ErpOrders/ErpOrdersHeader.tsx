import React from 'react';

type Props = Pick<
  ReturnType<typeof import('../../pages/ErpOrders/hooks/useErpOrdersList').useErpOrdersList>,
  't' | 'summarySubtitle' | 'openCreateOrder' | 'openAiWizard' | 'downloadImportTemplate'
>;

export const ErpOrdersHeader: React.FC<Props> = ({
  t,
  summarySubtitle,
  openCreateOrder,
  openAiWizard,
  downloadImportTemplate,
}) => (
  <div className="pg-head">
    <div className="pg-head-l">
      <div className="pg-t">{t('erpOrders')}</div>
      <div className="pg-s">
        {summarySubtitle} {t('erpOrdersSubtitle')}
      </div>
    </div>
    <div className="pg-head-r">
      <button type="button" className="btn" onClick={downloadImportTemplate}>
        {t('erpOrdersDownloadTemplate')}
      </button>
      <button type="button" className="btn" onClick={openAiWizard}>
        ✨ {t('erpOrdersImport')}
      </button>
      <button type="button" className="btn btn-p" onClick={openCreateOrder}>
        + {t('erpOrdersCreateOrder')}
      </button>
    </div>
  </div>
);
