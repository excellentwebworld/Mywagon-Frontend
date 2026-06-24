import React from 'react';
import { PlusIcon } from './erpOrderIcons';

type Props = {
  t: (key: string, options?: Record<string, unknown>) => string;
  selectedCount: number;
  onCreateLoad: () => void;
  onClear: () => void;
};

export const ErpOrdersFloatingSelectionBar: React.FC<Props> = ({
  t,
  selectedCount,
  onCreateLoad: _onCreateLoad,
  onClear,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="erp-float-sel anim" onClick={(e) => e.stopPropagation()}>
      <span className="erp-float-sel-count">
        {t('erpOrdersNSelected', { n: selectedCount })}
      </span>
      <span className="erp-float-sel-divider" />
      {/* Create Load — temporarily hidden
      <button type="button" className="btn btn-p btn-sm" onClick={_onCreateLoad}>
        <PlusIcon />
        {t('erpOrdersCreateLoad')}
      </button>
      */}
      <button type="button" className="btn btn-sm erp-float-sel-clear" onClick={onClear}>
        ✕ {t('erpOrdersClearSelection')}
      </button>
    </div>
  );
};
