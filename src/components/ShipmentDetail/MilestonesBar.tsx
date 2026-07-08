import React from 'react';
import type { ShipmentDetailViewModel } from '../../pages/ShipmentDetail/detailViewModel';

interface MilestonesBarProps {
  vm: ShipmentDetailViewModel;
  lang: 'en' | 'el';
  onExceptionClick: (target: string) => void;
}

export const MilestonesBar: React.FC<MilestonesBarProps> = ({ vm, lang, onExceptionClick }) => (
  <div className="ld-ms-bar a">
    <div className="ld-ms-row">
      {vm.milestones.map((ms, idx) => (
        <div key={ms.key} className="ld-ms-step">
          <div className={`ld-ms-dot ${ms.state}`} />
          {idx < vm.milestones.length - 1 && (
            <div className={`ld-ms-line ${ms.state === 'done' ? 'done' : ''}`} />
          )}
          <div className="ld-ms-label">{lang === 'el' ? ms.labelEl : ms.labelEn}</div>
          {ms.time && <div className="ld-ms-time">{ms.time}</div>}
          {ms.badge && <span className="ld-bg ld-bg-ac" style={{ fontSize: 8 }}>{ms.badge}</span>}
        </div>
      ))}
    </div>
    <div className="ld-ms-exc">
      {vm.exceptionChips.map((chip) => (
        <span
          key={chip.label}
          className="ld-bg ld-bg-er"
          style={{ cursor: 'pointer' }}
          onClick={() => onExceptionClick(chip.target)}
          role="button"
          tabIndex={0}
        >
          {chip.label}
        </span>
      ))}
    </div>
  </div>
);
