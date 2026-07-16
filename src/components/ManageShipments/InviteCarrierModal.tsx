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
  /** Already invited on this shipment — shown selected and locked. */
  alreadyInvitedIds?: Set<string>;
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
  alreadyInvitedIds = new Set(),
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

  const newSelectedCount = Array.from(selected).filter((id) => !alreadyInvitedIds.has(id)).length;

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
              const isAlready = alreadyInvitedIds.has(c.id);
              const isSelected = selected.has(c.id) || isAlready;
              return (
                <div
                  key={c.id}
                  className={`inv-carrier ${isSelected ? 'selected' : ''}${isAlready ? ' inv-carrier--locked' : ''}`}
                  onClick={() => !isAlready && onToggle(c.id)}
                  onKeyDown={(e) => {
                    if (isAlready) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggle(c.id);
                    }
                  }}
                  role="button"
                  tabIndex={isAlready ? -1 : 0}
                  aria-disabled={isAlready}
                >
                  <div className="ic-av">{initials(c.name)}</div>
                  <div className="ic-info">
                    <div className="ic-name">{c.name}</div>
                    <div className="ic-meta">
                      {typeLabel(c.type, t)}
                      {c.region ? ` · ${c.region}` : ''}
                      {c.rating != null ? ` · ★ ${c.rating}` : ''}
                      {isAlready ? ` · ${t('alreadyInvited') || 'Already invited'}` : ''}
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
            {newSelectedCount} {t('selected')}
            {alreadyInvitedIds.size > 0
              ? ` · ${alreadyInvitedIds.size} ${t('alreadyInvited') || 'already invited'}`
              : ''}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSend}
            disabled={loading || newSelectedCount === 0}
          >
            {t('sendInvitations')}
          </button>
        </div>
      </div>
    </div>
  );
};
