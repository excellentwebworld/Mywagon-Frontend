import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  MessageSquare,
  X,
  ExternalLink,
} from 'lucide-react';
import type { ShipmentContextInfo, QuickTemplate } from '../types';
import { ShipmentContextSkeleton } from './ChatSkeleton';

interface ShipmentContextPaneProps {
  shipmentContext: ShipmentContextInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (tpl: QuickTemplate) => void;
  templates: QuickTemplate[];
  onShowToast: (msg: string) => void;
  loading?: boolean;
  t: (key: string) => string;
}

export const ShipmentContextPane: React.FC<ShipmentContextPaneProps> = ({
  shipmentContext,
  isOpen,
  onClose,
  onUseTemplate,
  templates,
  onShowToast,
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

  const handleRequestPod = () => {
    const podTpl = templates.find((x) => x.id === 2);
    if (podTpl) {
      onUseTemplate(podTpl);
    }
    onShowToast(t('chatModule.toastPodSent'));
  };

  const handleOpenLoad = () => {
    onShowToast(t('chatModule.toastLoadDetails'));
    navigate(`/shipments`);
  };

  const handleReportIncident = () => {
    onShowToast(t('chatModule.toastIncident'));
  };

  return (
    <div className="ctx-pane" id="ctxPane">
      <div className="ctx-pane-head">
        <FileSpreadsheet size={16} style={{ color: 'var(--ac, #6C3AED)' }} />
        <h3>{t('chatModule.ctxPaneTitle')}</h3>
        <button type="button" className="ctx-pane-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="ctx-scroll">
        {/* Shipment Card */}
        <div className="shp-card">
          <div className="shp-card-head">
            <span className="shp-sid">{shipmentContext.sid}</span>
            <span className={`shp-status ${shipmentContext.status}`}>
              {shipmentContext.statusLabel}
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleOpenLoad}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid var(--bd, #E4E4E8)',
                background: 'var(--sf, #FFFFFF)',
                color: 'var(--t2, #5E5E6E)',
                cursor: 'pointer',
              }}
            >
              {t('chatModule.ctxOpen')}
            </button>
          </div>

          <div className="shp-body">
            <div className="shp-lane">
              <span className="shp-loc">
                <MapPin size={14} /> {shipmentContext.origin}
              </span>
              <span className="shp-arrow">→</span>
              <span className="shp-loc">
                <MapPin size={14} /> {shipmentContext.destination}
              </span>
            </div>

            <div className="shp-details">
              <div className="shp-det">
                <div className="shp-det-label">{t('chatModule.ctxPickup')}</div>
                <div className="shp-det-val">{shipmentContext.pickupTime}</div>
              </div>
              <div className="shp-det">
                <div className="shp-det-label">{t('chatModule.ctxDelivery')}</div>
                <div className="shp-det-val">{shipmentContext.deliveryTime}</div>
              </div>
              <div className="shp-det">
                <div className="shp-det-label">{t('chatModule.ctxETA')}</div>
                <div className={`shp-det-val ${shipmentContext.etaStatus}`}>
                  {t(`chatModule.ctx${shipmentContext.eta.replace(/\s+/g, '')}`) || shipmentContext.eta}
                </div>
              </div>
              <div className="shp-det">
                <div className="shp-det-label">{t('chatModule.ctxRisk')}</div>
                <div className={`shp-det-val ${shipmentContext.riskStatus}`}>
                  {t(`chatModule.ctx${shipmentContext.risk}`) || shipmentContext.risk}
                </div>
              </div>
            </div>

            <div className="docs-status">
              <div className={`doc-row ${shipmentContext.cmrStatus}`}>
                {shipmentContext.cmrStatus === 'received' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                <span className="doc-label">CMR</span>
                <span className="doc-status">
                  {t(`chatModule.ctx${shipmentContext.cmrStatus === 'received' ? 'Received' : 'Missing'}`)}
                </span>
              </div>
              <div className={`doc-row ${shipmentContext.podStatus}`}>
                {shipmentContext.podStatus === 'received' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                <span className="doc-label">POD</span>
                <span className="doc-status">
                  {t(`chatModule.ctx${shipmentContext.podStatus === 'received' ? 'Received' : 'Missing'}`)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ctx-actions">
          {shipmentContext.podStatus === 'missing' &&
            ['fullfilled', 'fulfilled', 'partially_fullfilled', 'partially_fulfilled', 'delivered'].includes(
              (shipmentContext.status || '').toLowerCase()
            ) && (
              <button
                type="button"
                className="ctx-btn primary"
                onClick={handleRequestPod}
              >
                <FileText size={15} />
                <span>{t('chatModule.ctxRequestPOD')}</span>
              </button>
            )}
          <button type="button" className="ctx-btn" onClick={handleOpenLoad}>
            <ExternalLink size={15} />
            <span>{t('chatModule.ctxOpenLoad')}</span>
          </button>
          <button
            type="button"
            className="ctx-btn danger"
            onClick={handleReportIncident}
          >
            <AlertTriangle size={15} />
            <span>{t('chatModule.ctxReportIncident')}</span>
          </button>
        </div>

        {/* Multi-Stop List */}
        <div className="stops-section">
          <div className="stops-title">{t('chatModule.ctxStops')}</div>
          {shipmentContext.stops.map((stop) => (
            <div key={stop.id} className="stop-item">
              <div className="stop-num">{stop.num}</div>
              <div className="stop-info">
                <div className="stop-type">
                  {t(`chatModule.ctx${stop.type === 'pickup' ? 'Pickup' : 'Delivery'}`)}
                </div>
                <div className="stop-addr">{stop.address}</div>
                <div className="stop-time">{stop.time}</div>
                <button
                  type="button"
                  className="stop-msg"
                  onClick={() => onShowToast(t('chatModule.toastMsgStop'))}
                >
                  <MessageSquare size={12} />
                  <span>{t('chatModule.ctxMsgStop')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Log */}
        <div className="action-log">
          <div className="al-title">{t('chatModule.ctxActionLog')}</div>
          {shipmentContext.actionLog.map((log) => (
            <div key={log.id} className="al-item">
              <div className={`al-icon ${log.type}`}>
                {log.type === 'done' && <CheckCircle2 size={13} />}
                {log.type === 'req' && <FileText size={13} />}
                {log.type === 'upd' && <Clock size={13} />}
                {log.type === 'inc' && <AlertTriangle size={13} />}
              </div>
              <span className="al-text">
                {t(`chatModule.${log.textKey}`) || log.defaultText}
              </span>
              <span className="al-time">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
