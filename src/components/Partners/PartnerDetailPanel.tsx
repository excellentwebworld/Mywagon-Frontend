import React, { useState } from 'react';
import type { Partner } from '../../pages/Partners/types';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { OpenSections } from '../../pages/Partners/types';

type Props = Pick<
  PartnersState,
  | 't'
  | 'selectedPartner'
  | 'detailLoading'
  | 'openSections'
  | 'closeDetailPanel'
  | 'toggleSection'
  | 'suspendPartner'
  | 'reactivatePartner'
  | 'permanentlyRemovePartner'
  | 'cancelInvite'
  | 'acceptPartner'
  | 'declinePartner'
  | 'togglePreferred'
  | 'deleteContractLane'
  | 'openGenericModal'
  | 'saveNote'
  | 'saveTags'
>;

function getTypeClass(type: Partner['type']) {
  if (type === 'carrier_company') return 'ptn-tp-c';
  if (type === 'freelancer_driver') return 'ptn-tp-f';
  return 'ptn-tp-s';
}

function getStatusClass(status: Partner['status']) {
  if (status === 'active') return 'ptn-st-ac';
  if (status === 'invited') return 'ptn-st-in';
  if (status === 'pending') return 'ptn-st-pe';
  return 'ptn-st-su';
}

function SectionHeader({
  label,
  sectionKey,
  open,
  onToggle,
}: {
  label: string;
  sectionKey: keyof OpenSections;
  open: boolean;
  onToggle: (k: keyof OpenSections) => void;
}) {
  return (
    <div
      className="ptn-dpsh"
      onClick={() => onToggle(sectionKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle(sectionKey)}
    >
      {label}
      <span className={`ch${open ? ' open' : ''}`}>▼</span>
    </div>
  );
}

export const PartnerDetailPanel: React.FC<Props> = ({
  t,
  selectedPartner,
  detailLoading,
  openSections,
  closeDetailPanel,
  toggleSection,
  suspendPartner,
  reactivatePartner,
  permanentlyRemovePartner,
  cancelInvite,
  acceptPartner,
  declinePartner,
  togglePreferred,
  deleteContractLane,
  openGenericModal,
  saveNote,
  saveTags,
}) => {
  const [localNote, setLocalNote] = useState('');
  const [localTags, setLocalTags] = useState('');

  React.useEffect(() => {
    if (selectedPartner) {
      setLocalNote(selectedPartner.notes || '');
      setLocalTags((selectedPartner.tags || []).join(', '));
    }
  }, [selectedPartner?.id, selectedPartner?.notes, selectedPartner?.tags]);

  if (!selectedPartner) {
    return (
      <div className="ptn-detail-pane">
        <div className="ptn-dp-inner" />
      </div>
    );
  }

  const p = selectedPartner;
  const perf = p.performance;
  const isCarrierOrDriver = p.type === 'carrier_company' || p.type === 'freelancer_driver';
  const isSupplier = p.type === 'supplier';
  const profile = p.companyProfile;

  return (
    <div className="ptn-detail-pane open" id="ptn-detail-pane">
      <div className="ptn-dp-inner">
        {detailLoading && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>{t('loading')}…</div>
        )}

        <div className="ptn-dp-hero">
          <button type="button" className="ptn-dp-close" onClick={closeDetailPanel} id="ptn-dp-close">
            ✕
          </button>

          <div className="ptn-dp-badges">
            <span className={`ptn-tp ${getTypeClass(p.type)}`}>{p.typeLabel}</span>
            <span className={`ptn-st ${getStatusClass(p.status)}`}>{p.statusLabel}</span>
            {p.isPreferred && <span className="ptn-tag ptn-tag-pref">★ {t('preferred')}</span>}
          </div>

          <div className="ptn-dp-name">{p.name}</div>
          <div className="ptn-dp-sub">{p.location || p.region || '—'}</div>
          <div className="ptn-dp-meta">
            {p.uniqueId && (
              <>
                {t('uniqueIdCol')}: <strong>{p.uniqueId}</strong>
                <br />
              </>
            )}
            {p.email}
            <br />
            {p.phone}
          </div>

          <div className="ptn-dp-actions">
            {p.canAcceptDecline && (
              <>
                <button type="button" className="btn btn-ok btn-sm" onClick={() => acceptPartner(p)}>
                  ✓ {t('accept')}
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => declinePartner(p)}>
                  ✕ {t('decline')}
                </button>
              </>
            )}
            {p.isSent && p.isPending && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => cancelInvite(p)}>
                {t('cancelInvitation')}
              </button>
            )}
            {p.status === 'active' && (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => togglePreferred(p)}>
                  {p.isPreferred ? t('setStandard') : t('markPreferred')}
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => suspendPartner(p)}>
                  🚫 {t('partnerSuspend')}
                </button>
              </>
            )}
            {p.status === 'suspended' && (
              <>
                <button type="button" className="btn btn-ok btn-sm" onClick={() => reactivatePartner(p)}>
                  ✅ {t('partnerReactivate')}
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => permanentlyRemovePartner(p)}>
                  🗑️ {t('partnerRemove')}
                </button>
              </>
            )}
          </div>
        </div>

        {isSupplier && (
          <div className="ptn-dps">
            <SectionHeader
              label={`🏢 ${t('companyProfileSection')}`}
              sectionKey="companyProfile"
              open={openSections.companyProfile}
              onToggle={toggleSection}
            />
            {openSections.companyProfile && (
              <div className="ptn-dpsb">
                {profile ? (
                  <div className="ptn-sg" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {[
                      { lbl: t('companyNameCol'), val: profile.companyName },
                      { lbl: t('vatCol'), val: profile.vatNumber },
                      { lbl: t('cityCol'), val: profile.city },
                      { lbl: t('addressCol'), val: profile.address },
                      { lbl: t('contactNameCol'), val: profile.contactName },
                      { lbl: t('uniqueIdCol'), val: profile.uniqueId },
                      { lbl: t('contactCol'), val: profile.email },
                      { lbl: t('phoneCol'), val: profile.phone },
                    ].map(({ lbl, val }) => (
                      <div key={lbl} className="ptn-sc" style={{ textAlign: 'left' }}>
                        <div className="sl">{lbl}</div>
                        <div className="sv" style={{ fontSize: 13 }}>
                          {val || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                )}
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {t('supplierCollaborationNote')}
                </p>
              </div>
            )}
          </div>
        )}

        {isCarrierOrDriver && perf && (
          <div className="ptn-dps">
            <SectionHeader
              label={`📊 ${t('performanceKpis')}`}
              sectionKey="kpis"
              open={openSections.kpis}
              onToggle={toggleSection}
            />
            {openSections.kpis && (
              <div className="ptn-dpsb">
                <div className="ptn-sg">
                  {[
                    { val: perf.loads_30d, lbl: t('loads30dCol') },
                    { val: perf.lifetime_loads, lbl: t('lifetimeLoads') },
                    { val: `${perf.fulfilled_pct}%`, lbl: t('fulfilledPct') },
                    { val: `${perf.partially_fulfilled_pct}%`, lbl: t('partiallyFulfilledPct') },
                    { val: `${perf.canceled_pct}%`, lbl: t('canceledPct') },
                    { val: `${perf.unfulfilled_pct}%`, lbl: t('unfulfilledPct') },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className="ptn-sc">
                      <div className="sv">{val}</div>
                      <div className="sl">{lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isCarrierOrDriver && (
          <div className="ptn-dps">
            <SectionHeader
              label={`🚛 ${t('fleetSection')}`}
              sectionKey="fleet"
              open={openSections.fleet}
              onToggle={toggleSection}
            />
            {openSections.fleet && (
              <div className="ptn-dpsb">
                {(p.fleet ?? []).length > 0 ? (
                  (p.fleet ?? []).map((item, i) => (
                    <div key={`${item.label}-${i}`} className="ptn-fleet-row">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>🚛 {item.label}</div>
                      {item.driver && (
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.driver}</div>
                      )}
                    </div>
                  ))
                ) : p.capabilities.length > 0 ? (
                  p.capabilities.map((cap) => (
                    <div key={cap} className="ptn-fleet-row">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>🚛 {cap}</div>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="ptn-dps">
          <SectionHeader
            label={`📄 ${t('contractsSection')}`}
            sectionKey="contracts"
            open={openSections.contracts}
            onToggle={toggleSection}
          />
          {openSections.contracts && (
            <div className="ptn-dpsb">
              {(p.contractLanes ?? []).length > 0 ? (
                <table className="ptn-mt2">
                  <thead>
                    <tr>
                      <th>{t('laneCol')}</th>
                      <th>{t('lanePriceCol')}</th>
                      <th>{t('laneUnitCol')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(p.contractLanes ?? []).map((cl) => (
                      <tr key={cl.id}>
                        <td style={{ fontWeight: 500 }}>{cl.lane}</td>
                        <td style={{ fontWeight: 600 }}>€{cl.price}</td>
                        <td style={{ fontSize: 10 }}>{cl.unitLabel}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => deleteContractLane(cl.id)}
                            style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: 12 }}>
                  {t('noContractLanes')}
                </div>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                onClick={() => openGenericModal('addLane')}
                id="btn-add-lane"
              >
                {t('addContractLane')}
              </button>
            </div>
          )}
        </div>

        <div className="ptn-dps">
          <SectionHeader
            label={`🏷️ ${t('notesSection')}`}
            sectionKey="notes"
            open={openSections.notes}
            onToggle={toggleSection}
          />
          {openSections.notes && (
            <div className="ptn-dpsb">
              <div className="mf" style={{ marginBottom: 10 }}>
                <label>{t('tagsLabel')}</label>
                <input
                  type="text"
                  placeholder={t('tagsPlaceholder')}
                  value={localTags}
                  onChange={(e) => setLocalTags(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() =>
                    saveTags(
                      localTags
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                >
                  {t('saveTags')}
                </button>
              </div>
              <textarea
                id="ptn-note-input"
                placeholder={`${t('notesSection')}…`}
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 70,
                  padding: '8px 10px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => saveNote(localNote)}
                id="btn-save-note"
              >
                💾 {t('saveNote')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
