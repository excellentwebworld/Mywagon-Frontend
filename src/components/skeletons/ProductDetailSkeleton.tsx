import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface Props {
  onClose: () => void;
}

export const ProductDetailSkeleton: React.FC<Props> = ({ onClose }) => {
  return (
    <>
      <div className="dp-hero">
        <button type="button" className="dp-close" onClick={onClose}>
          ✕
        </button>
        <div className="dp-badges">
          <Skeleton width={60} height={20} borderRadius={10} style={{ marginRight: 6 }} />
          <Skeleton width={80} height={20} borderRadius={10} style={{ marginRight: 6 }} />
        </div>
        <div style={{ marginBottom: 6 }}><Skeleton height={24} width="80%" /></div>
        <div style={{ marginBottom: 12 }}><Skeleton height={18} width="40%" /></div>
        <div className="dp-meta">
          <div>
            <strong>SKU Number:</strong> <Skeleton width={60} />
          </div>
          <div>
            <strong>Barcode:</strong> <Skeleton width={80} />
          </div>
          <div>
            <strong>Weight:</strong> <Skeleton width={50} />
          </div>
          <div>
            <strong>Unit:</strong> <Skeleton width={40} />
          </div>
        </div>
        <div className="dp-actions">
          <Skeleton width={60} height={32} borderRadius={6} style={{ marginRight: 8 }} />
          <Skeleton width={80} height={32} borderRadius={6} />
        </div>
      </div>

      <div className="dp-sec">
        <div className="dp-sec-h">
          🔌 ERP Integration
          <span className="chev">▼</span>
        </div>
        <div className="dp-sec-body">
          <div className="dp-row">
            <span className="label"><Skeleton width={80} /></span>
            <span className="val"><Skeleton width={60} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={70} /></span>
            <span className="val"><Skeleton width={80} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={85} /></span>
            <span className="val"><Skeleton width={100} /></span>
          </div>
        </div>
      </div>

      <div className="dp-sec">
        <div className="dp-sec-h">
          📦 Shipping Defaults
          <span className="chev">▼</span>
        </div>
        <div className="dp-sec-body">
          <div className="dp-row">
            <span className="label"><Skeleton width={75} /></span>
            <span className="val"><Skeleton width={40} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={70} /></span>
            <span className="val"><Skeleton width={30} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={65} /></span>
            <span className="val"><Skeleton width={30} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={80} /></span>
            <span className="val"><Skeleton width={60} /></span>
          </div>
        </div>
      </div>

      <div className="dp-sec">
        <div className="dp-sec-h">🏷️ Tags</div>
        <div className="dp-sec-body" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Skeleton width={50} height={20} borderRadius={10} />
          <Skeleton width={60} height={20} borderRadius={10} />
        </div>
      </div>

      <div className="dp-sec">
        <div className="dp-sec-h" style={{ cursor: 'default' }}>
          Shipment Stats
        </div>
        <div className="dp-sec-body">
          <div className="stat-grid-3">
            <div className="stat-card">
              <div className="stat-val"><Skeleton width={30} /></div>
              <div className="stat-lbl"><Skeleton width={50} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-val"><Skeleton width={30} /></div>
              <div className="stat-lbl"><Skeleton width={60} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-val"><Skeleton width={30} /></div>
              <div className="stat-lbl"><Skeleton width={60} /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
