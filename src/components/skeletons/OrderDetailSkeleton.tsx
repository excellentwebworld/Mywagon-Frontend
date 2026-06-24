import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { CloseIcon } from '../ErpOrders/erpOrderIcons';

interface Props {
  onClose: () => void;
  t: (key: string) => string;
}

export const OrderDetailSkeleton: React.FC<Props> = ({ onClose, t }) => (
  <>
    <div className="erp-order-drawer-head">
      <div className="erp-order-drawer-head-top">
        <div className="erp-order-drawer-head-main">
          <div className="erp-order-drawer-title">
            <Skeleton width={120} height={22} borderRadius={4} />
            <Skeleton width={72} height={20} borderRadius={10} />
            <Skeleton width={56} height={20} borderRadius={10} />
          </div>
          <div className="erp-order-drawer-erp" style={{ marginTop: 4 }}>
            <Skeleton width={100} height={14} />
          </div>
        </div>
        <button type="button" className="erp-order-drawer-close" onClick={onClose} aria-label={t('cancel')}>
          <CloseIcon />
        </button>
      </div>

      <div className="erp-order-drawer-meta">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="erp-order-drawer-meta-cell">
            <div className="erp-order-drawer-meta-label">
              <Skeleton width={idx % 2 === 0 ? 56 : 72} height={10} />
            </div>
            <div className="erp-order-drawer-meta-value">
              <Skeleton width={idx % 2 === 0 ? 100 : 80} height={14} />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="erp-order-drawer-body">
      <div className="erp-order-drawer-section">
        <div className="erp-order-drawer-section-title">{t('erpOrdersAddresses')}</div>
        <div className="addr-grid erp-order-drawer-addr-grid">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="addr-card">
              <div className="addr-lbl"><Skeleton width={60} height={10} /></div>
              <div className="addr-name" style={{ marginTop: 6 }}><Skeleton width="85%" height={14} /></div>
              <div className="addr-detail" style={{ marginTop: 4 }}><Skeleton width="70%" height={12} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="erp-order-drawer-section">
        <div className="erp-order-drawer-section-title">{t('erpOrdersLineItems')}</div>
        <table className="lt">
          <thead>
            <tr>
              <th><Skeleton width={48} height={10} /></th>
              <th><Skeleton width={32} height={10} /></th>
              <th style={{ textAlign: 'right' }}><Skeleton width={24} height={10} /></th>
              <th style={{ textAlign: 'right' }}><Skeleton width={40} height={10} /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, idx) => (
              <tr key={idx}>
                <td><Skeleton width={idx === 0 ? 120 : 90} height={14} /></td>
                <td><Skeleton width={64} height={14} /></td>
                <td style={{ textAlign: 'right' }}><Skeleton width={40} height={14} /></td>
                <td style={{ textAlign: 'right' }}><Skeleton width={48} height={14} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="erp-order-drawer-section">
        <div className="erp-order-drawer-section-title">{t('erpOrdersSectionTotals')}</div>
        <div className="erp-order-drawer-totals">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="erp-order-drawer-total-stat">
              <div className="erp-order-drawer-total-value">
                <Skeleton width={28} height={20} />
              </div>
              <div className="erp-order-drawer-total-label">
                <Skeleton width={48} height={9} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="erp-order-drawer-section">
        <div className="erp-order-drawer-section-title">{t('erpOrdersColLinkedLoad')}</div>
        <Skeleton width={140} height={14} />
      </div>
    </div>

    <div className="erp-order-drawer-foot">
      <Skeleton height={40} borderRadius={8} style={{ marginBottom: 8 }} />
      <div className="erp-order-drawer-actions">
        <Skeleton width={88} height={32} borderRadius={6} />
        <Skeleton width={56} height={32} borderRadius={6} />
        <Skeleton width={72} height={32} borderRadius={6} />
      </div>
    </div>
  </>
);
