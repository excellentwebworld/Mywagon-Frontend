import React from 'react';

interface BulkBarProps {
  count: number;
  onCancel: () => void;
  onInvite: () => void;
  onExtend: () => void;
  onExport: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

export const BulkBar: React.FC<BulkBarProps> = ({
  count,
  onCancel,
  onInvite,
  onExtend,
  onExport,
  onClose,
  t,
}) => {
  if (count === 0) return null;

  return (
    <div className="bulk show">
      <span className="bulk-cnt">
        {count} {t('selected')}
      </span>
      <button type="button" className="bulk-btn" onClick={onCancel}>
        {t('cancelSelected')}
      </button>
      <button type="button" className="bulk-btn" onClick={onInvite}>
        {t('inviteCarriers')}
      </button>
      <button type="button" className="bulk-btn" onClick={onExtend}>
        {t('extendBidTime')}
      </button>
      <button type="button" className="bulk-btn" onClick={onExport}>
        {t('exportSelected')}
      </button>
      <button type="button" className="bulk-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
};
