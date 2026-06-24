import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { DetailSection } from '../AddressBook/DetailSection';

interface Props {
  onClose: () => void;
}

export const LocationDetailSkeleton: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="detail-pane open">
      <div className="dp-inner">
        <div className="dp-hero">
          <button type="button" className="dp-close-btn" onClick={onClose}>
            ✕
          </button>
          <div className="dp-badges">
            <Skeleton width={60} height={20} borderRadius={10} style={{ marginRight: 6 }} />
            <Skeleton width={100} height={20} borderRadius={10} style={{ marginRight: 6 }} />
            <Skeleton width={80} height={20} borderRadius={10} />
          </div>
          <div style={{ marginBottom: 6 }}><Skeleton height={24} width="80%" /></div>
          <div style={{ marginBottom: 6 }}><Skeleton height={18} width="40%" /></div>
          <div style={{ marginBottom: 12 }}><Skeleton height={16} width="95%" /></div>
          <div style={{ marginBottom: 12 }}><Skeleton height={14} width="35%" /></div>
          <div className="dp-actions">
            <Skeleton width={60} height={32} borderRadius={6} style={{ marginRight: 8 }} />
            <Skeleton width={80} height={32} borderRadius={6} />
          </div>
        </div>

        <DetailSection title="🗺️ Location Map" bodyClassName="dp-map-sec-body">
          <div className="dp-map-box" style={{ background: '#f1f5f9' }}>
            <Skeleton height="100%" style={{ minHeight: 180, display: 'block' }} />
          </div>
        </DetailSection>

        <DetailSection title="Hours & Scheduling">
          <div className="dp-row">
            <span className="label"><Skeleton width={80} /></span>
            <span className="val"><Skeleton width={40} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={60} /></span>
            <span className="val dp-hours-val"><Skeleton width={100} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={50} /></span>
            <span className="val"><Skeleton width={60} /></span>
          </div>
        </DetailSection>

        <DetailSection title="Company & Contact">
          <div className="dp-row">
            <span className="label"><Skeleton width={70} /></span>
            <span className="val"><Skeleton width={90} /></span>
          </div>
          <div className="dp-contact-card" style={{ border: '1px solid #e2e8f0', padding: 12, borderRadius: 6, marginTop: 12 }}>
            <div className="dp-contact-role"><Skeleton width={50} /></div>
            <div className="dp-contact-name"><Skeleton width={100} /></div>
            <div className="dp-contact-info">
              <Skeleton width={120} count={2} />
            </div>
          </div>
        </DetailSection>

        <DetailSection title="⚠️ Access & Restrictions">
          <div className="dp-row">
            <span className="label"><Skeleton width={75} /></span>
            <span className="val"><Skeleton width={40} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={80} /></span>
            <span className="val"><Skeleton width={50} /></span>
          </div>
          <div className="dp-row">
            <span className="label"><Skeleton width={40} /></span>
            <span className="val"><Skeleton width={20} /></span>
          </div>
        </DetailSection>
      </div>
    </div>
  );
};
