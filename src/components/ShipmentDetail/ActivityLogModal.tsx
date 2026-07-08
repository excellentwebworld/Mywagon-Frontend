import React from 'react';
import type { AuditEntry } from '../../pages/ShipmentDetail/detailViewModel';

interface ActivityLogModalProps {
  open: boolean;
  entries: AuditEntry[];
  onClose: () => void;
  t: (key: string) => string;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ open, entries, onClose, t }) => {
  if (!open) return null;

  return (
    <div className="ld-modal-bg" onClick={onClose}>
      <div className="ld-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="ld-modal-h">
          <h3>📋 {t('fullActivityLog')}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ld-modal-body" style={{ maxHeight: 400 }}>
          {entries.map((entry) => (
            <div key={entry.id} className="ld-al-item">
              <div className="ld-al-time">{entry.time}</div>
              <div className="ld-al-text">{entry.text.replace(/\*\*/g, '')}</div>
            </div>
          ))}
        </div>
        <div className="ld-modal-foot">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
