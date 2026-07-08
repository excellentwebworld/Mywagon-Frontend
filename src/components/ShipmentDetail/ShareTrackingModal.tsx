import React from 'react';
import type { ShareCustomerGroup } from '../../pages/ShipmentDetail/detailViewModel';

interface ShareTrackingModalProps {
  open: boolean;
  groups: ShareCustomerGroup[];
  onClose: () => void;
  onSend: () => void;
  t: (key: string) => string;
}

export const ShareTrackingModal: React.FC<ShareTrackingModalProps> = ({
  open,
  groups,
  onClose,
  onSend,
  t,
}) => {
  if (!open) return null;

  return (
    <div className="ld-modal-bg" onClick={onClose}>
      <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ld-modal-h">
          <h3>🔗 {t('shareTrackingLinks')}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ld-modal-body">
          {groups.map((group) => (
            <div key={group.name} style={{ marginBottom: 16 }}>
              <div className="ld-tk-cust-head">
                🏪 {group.name}
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                  {group.deliveryCount} {t('deliveries')}
                </span>
              </div>
              <table className="ld-share-table">
                <thead>
                  <tr>
                    <th>{t('deliveryLocation')}</th>
                    <th>{t('email')}</th>
                    <th>{t('orderRef')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={`${row.location}-${row.orderRef}`}>
                      <td>{row.location}</td>
                      <td>
                        <input className="ld-share-email" defaultValue={row.email} />
                        <div style={{ fontSize: 10, color: 'var(--cu-c, #059669)', marginTop: 4 }}>
                          🏪 {t('autoFilledFromCustomer')}
                        </div>
                      </td>
                      <td>{row.orderRef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="ld-modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSend}>
            {t('sendLinks')}
          </button>
        </div>
      </div>
    </div>
  );
};
