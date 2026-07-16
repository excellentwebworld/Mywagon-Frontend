import React from 'react';
import type { Step3Carrier } from '../../api/mappers/mapPartnerToStep3Carrier';

export type InvitePartnerOption = Pick<Step3Carrier, 'id' | 'name' | 'type' | 'rating' | 'region'>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function typeLabel(type: InvitePartnerOption['type'], t: (key: string) => string): string {
  if (type === 'freelancer_driver') return t('freelancerDriver') || 'Freelancer Driver';
  return t('carrierCompany') || 'Carrier Company';
}

interface InviteCarrierModalProps {
  open: boolean;
  carriers: InvitePartnerOption[];
  loading?: boolean;
  error?: string | null;
  query: string;
  selected: Set<string>;
  onQueryChange: (q: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
  onSend: () => void;
  t: (key: string) => string;
}

export const InviteCarrierModal: React.FC<InviteCarrierModalProps> = ({
  open,
  carriers,
  loading = false,
  error = null,
  query,
  selected,
  onQueryChange,
  onToggle,
  onClose,
  onSend,
  t,
}) => {
  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? carriers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q) ||
          typeLabel(c.type, t).toLowerCase().includes(q)
      )
    : carriers;

  return (
    <div className="inv-modal-bg show">
      <div className="inv-modal">
        <div className="inv-modal-h">
          <h3>{t('inviteCarriers')}</h3>
          <button type="button" className="bulk-close" onClick={onClose} aria-label={t('cancel')}>
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
          {loading ? (
            <div className="sub">{t('loading')}</div>
          ) : error ? (
            <div className="sub" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sub">{t('noPartnersFound') || t('noResults') || 'No transporters found'}</div>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <div
                  key={c.id}
                  className={`inv-carrier ${isSelected ? 'selected' : ''}`}
                  onClick={() => onToggle(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggle(c.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ic-av">{initials(c.name)}</div>
                  <div className="ic-info">
                    <div className="ic-name">{c.name}</div>
                    <div className="ic-meta">
                      {typeLabel(c.type, t)}
                      {c.region ? ` · ${c.region}` : ''}
                      {c.rating != null ? ` · ★ ${c.rating}` : ''}
                    </div>
                  </div>
                  <div className="ic-check">{isSelected ? '✓' : ''}</div>
                </div>
              );
            })
          )}
        </div>
        <div className="inv-modal-foot">
          <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {selected.size} {t('selected')}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSend}
            disabled={loading || selected.size === 0}
          >
            {t('sendInvitations')}
          </button>
        </div>
      </div>
    </div>
  );
};
