import React from 'react';
import { useShipperPermission } from '../../hooks/useShipperPermission';

interface BulkBarProps {
  count: number;
  onCancel: () => void;
  onExport: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

export const BulkBar: React.FC<BulkBarProps> = ({
  count,
  onCancel,
  onExport,
  onClose,
  t,
}) => {
  const { canAction } = useShipperPermission();
  if (count === 0) return null;

  return (
    <div className="bulk show">
      <span className="bulk-cnt">
        {count} {t('selected')}
      </span>
      {canAction('cancelShipment') ? (
        <button type="button" className="bulk-btn" onClick={onCancel}>
          {t('cancelSelected')}
        </button>
      ) : null}
      <button type="button" className="bulk-btn" onClick={onExport}>
        {t('exportSelected')}
      </button>
      <button type="button" className="bulk-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
};
