import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X, ExternalLink } from 'lucide-react';
import type { ShipmentContextInfo } from '../types';
import { ShipmentContextSkeleton } from './ChatSkeleton';

interface ShipmentContextPaneProps {
  shipmentContext: ShipmentContextInfo | null;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  t: (key: string) => string;
}

export const ShipmentContextPane: React.FC<ShipmentContextPaneProps> = ({
  shipmentContext,
  isOpen,
  onClose,
  loading,
  t,
}) => {
  const navigate = useNavigate();

  if (!isOpen) {
    return <div className="ctx-pane hidden" />;
  }

  if (loading) {
    return <ShipmentContextSkeleton />;
  }

  const handleOpenLoad = () => {
    const navId = shipmentContext?.primaryId
      ? String(shipmentContext.primaryId)
      : (shipmentContext?.sid || '');
    navigate(navId ? `/shipments/${encodeURIComponent(navId)}` : `/shipments`);
  };

  if (!shipmentContext) {
    return (
      <div className="ctx-pane">
        <div className="ctx-pane-head">
          <FileText size={16} style={{ color: 'var(--ac, #6C3AED)' }} />
          <h3>{t('chatModule.ctxPaneTitle')}</h3>
          <button type="button" className="ctx-pane-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="ctx-scroll">
          <p style={{ fontSize: 13, color: 'var(--t3, #8E8E9A)', textAlign: 'center', marginTop: 30 }}>
            No shipment linked to this conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ctx-pane" id="ctxPane">
      <div className="ctx-pane-head">
        <FileText size={16} style={{ color: 'var(--ac, #6C3AED)' }} />
        <h3>{t('chatModule.ctxPaneTitle')}</h3>
        <button type="button" className="ctx-pane-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="ctx-scroll">
        <div className="ctx-actions" style={{ marginTop: 0 }}>
          <button type="button" className="ctx-btn primary" onClick={handleOpenLoad}>
            <ExternalLink size={15} />
            <span>{t('chatModule.ctxOpenLoad') || 'Open Load Details'}</span>
          </button>
        </div>

        <div className="stops-section">
          <div className="stops-title">{t('chatModule.ctxStops')}</div>
          {shipmentContext.stops.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--t3, #8E8E9A)', marginTop: 8 }}>
              {t('chatModule.noStops') || 'No stops available'}
            </p>
          ) : (
            shipmentContext.stops.map((stop) => (
              <div key={stop.id} className="stop-item">
                <div className="stop-num">{stop.num}</div>
                <div className="stop-info">
                  <div className="stop-type">
                    {t(`chatModule.ctx${stop.type === 'pickup' ? 'Pickup' : 'Delivery'}`)}
                  </div>
                  <div className="stop-addr">{stop.address}</div>
                  {stop.time ? <div className="stop-time">{stop.time}</div> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
