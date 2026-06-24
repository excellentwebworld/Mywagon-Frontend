import React from 'react';
import { PlusIcon } from './erpOrderIcons';

type Props = {
  t: (key: string) => string;
  selectedCount: number;
  onCreateLoad: () => void;
  onClear: () => void;
};

export const ErpOrdersSelectionBar: React.FC<Props> = ({ t, selectedCount, onCreateLoad, onClear }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sel-bar anim">
      <b>{selectedCount}</b>{' '}
      {selectedCount === 1 ? t('erpOrdersSelectedSingular') : t('erpOrdersSelectedPlural')}
      <button type="button" className="btn btn-sm" onClick={onCreateLoad}>
        <PlusIcon />
        {t('erpOrdersCreateLoad')}
      </button>
      <button type="button" className="btn btn-sm" onClick={onClear}>
        ✕ {t('erpOrdersClearSelection')}
      </button>
    </div>
  );
};
