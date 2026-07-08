import React from 'react';
import type { Carrier } from '../../context/AppContext';

interface InviteCarrierModalProps {
  open: boolean;
  carriers: Carrier[];
  query: string;
  selected: Set<string>;
  onQueryChange: (q: string) => void;
  onToggle: (name: string) => void;
  onClose: () => void;
  onSend: () => void;
  t: (key: string) => string;
}

export const InviteCarrierModal: React.FC<InviteCarrierModalProps> = ({
  open,
  carriers,
  query,
  selected,
  onQueryChange,
  onToggle,
  onClose,
  onSend,
  t,
}) => {
  if (!open) return null;

  const filtered = carriers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="inv-modal-bg show">
      <div className="inv-modal">
        <div className="inv-modal-h">
          <h3>🚛 {t('inviteCarriers')}</h3>
          <button type="button" className="bulk-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="inv-modal-body">
          <input
            className="inv-search"
            type="text"
            placeholder={t('searchCarriersPlaceholder')}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {filtered.map((c) => {
            const isSelected = selected.has(c.name);
            return (
              <div
                key={c.id}
                className={`inv-carrier ${isSelected ? 'selected' : ''}`}
                onClick={() => onToggle(c.name)}
                role="button"
                tabIndex={0}
              >
                <div className="ic-av">{c.init}</div>
                <div className="ic-info">
                  <div className="ic-name">{c.name}</div>
                  <div className="ic-meta">
                    {c.type} · ★ {c.rating}
                  </div>
                </div>
                <div className="ic-check">{isSelected ? '✓' : ''}</div>
              </div>
            );
          })}
        </div>
        <div className="inv-modal-foot">
          <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {selected.size} {t('selected')}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSend}>
            {t('sendInvitations')}
          </button>
        </div>
      </div>
    </div>
  );
};
