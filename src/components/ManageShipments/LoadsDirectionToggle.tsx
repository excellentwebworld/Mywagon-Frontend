import React from 'react';

export type LoadsDirection = 'outbound' | 'inbound';

type Props = {
  direction: LoadsDirection;
  onChange: (direction: LoadsDirection) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const LoadsDirectionToggle: React.FC<Props> = ({ direction, onChange, t }) => {
  return (
    <div className="dir-toggle" role="tablist" aria-label={t('shipmentsTitle') || 'Shipments'}>
      <button
        type="button"
        role="tab"
        aria-selected={direction === 'outbound'}
        className={`dir-toggle-btn${direction === 'outbound' ? ' act' : ''}`}
        onClick={() => onChange('outbound')}
      >
        {t('outboundLoads') || 'Outbound Loads'}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={direction === 'inbound'}
        className={`dir-toggle-btn${direction === 'inbound' ? ' act' : ''}`}
        onClick={() => onChange('inbound')}
      >
        {t('inboundLoads') || 'Inbound Loads'}
      </button>
    </div>
  );
};
