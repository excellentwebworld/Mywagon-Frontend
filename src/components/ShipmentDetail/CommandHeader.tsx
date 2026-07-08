import React from 'react';
import type { ShipmentDetailViewModel } from '../../pages/ShipmentDetail/detailViewModel';

interface CommandHeaderProps {
  vm: ShipmentDetailViewModel;
  lang: 'en' | 'el';
  onLangChange: (lang: 'en' | 'el') => void;
  onCopyId: () => void;
  onShare: () => void;
  onAuditLog: () => void;
  onToast: (msg: string) => void;
  t: (key: string) => string;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  vm,
  lang,
  onLangChange,
  onCopyId,
  onShare,
  onAuditLog,
  onToast,
  t,
}) => (
  <div className="ld-cmd">
    <div className="ld-cmd-top">
      <div className="ld-cmd-left">
        <div className="ld-cmd-sid">
          #{vm.displayId}
          <span className="ld-cmd-copy" title={t('copy')} onClick={onCopyId} role="button" tabIndex={0}>
            📋
          </span>
          <div className="ld-lang-tog" style={{ marginLeft: 12 }}>
            <button
              type="button"
              className={`ld-lang-btn ${lang === 'en' ? 'act' : ''}`}
              onClick={() => onLangChange('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`ld-lang-btn ${lang === 'el' ? 'act' : ''}`}
              onClick={() => onLangChange('el')}
            >
              EL
            </button>
          </div>
        </div>
        <div className="ld-cmd-lane">
          {vm.lane}
          {vm.viaLabel && <span className="ld-bg ld-bg-gr">via {vm.viaLabel}</span>}
          <span className="ld-bg ld-bg-gr">
            {vm.stopsCount} {t('stops')}
          </span>
        </div>
        <div className="ld-cmd-badges">
          <span className="ld-bg ld-bg-in">
            <span className="dot" />
            {t(vm.statusLabel)}
          </span>
          <span className={`ld-bg ${vm.onTrack ? 'ld-bg-ok' : 'ld-bg-er'}`}>
            <span className="dot" />
            {vm.onTrack ? t('onTrack') : t('atRiskLate')}
          </span>
          <span className="cust-pill">
            <span className="ci">🏪</span>
            {vm.primaryCustomer}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('owner')}: <strong>{vm.owner}</strong>
          </span>
        </div>
      </div>

      <div className="ld-cmd-mid">
        <span className="ld-chip ld-chip-in">{vm.etaChip}</span>
        <span className={`ld-chip ${vm.onTrack ? 'ld-chip-ok' : 'ld-chip-wr'}`}>{vm.etaStatusChip}</span>
      </div>

      <div className="ld-cmd-right">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onToast(t('editShipment'))}>
          ✏️ {t('editShipment')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onToast(t('message'))}>
          💬 {t('message')}
        </button>
        <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={onShare} title={t('shareTracking')}>
          🔗
        </button>
        <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => onToast(t('pdfExported'))} title={t('exportPdf')}>
          📄
        </button>
        <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={onAuditLog} title={t('auditLog')}>
          📋
        </button>
        <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => onToast(t('moreActions'))}>
          ⋯
        </button>
      </div>
    </div>
  </div>
);
