import React, { useState } from 'react';
import type { Partner } from '../../context/AppContext';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import type { OpenSections } from '../../pages/Partners/types';

type Props = Pick<
  PartnersState,
  | 't'
  | 'selectedPartner'
  | 'openSections'
  | 'closeDetailPanel'
  | 'toggleSection'
  | 'suspendPartner'
  | 'reactivatePartner'
  | 'permanentlyRemovePartner'
  | 'deleteContractLane'
  | 'openGenericModal'
  | 'saveNote'
  | 'showToast'
  | 'rName'
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
    <div className="ptn-dpsh" onClick={() => onToggle(sectionKey)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle(sectionKey)}>
      {label}
      <span className={`ch${open ? ' open' : ''}`}>▼</span>
    </div>
  );
}

export const PartnerDetailPanel: React.FC<Props> = ({
  t,
  selectedPartner,
  openSections,
  closeDetailPanel,
  toggleSection,
  suspendPartner,
  reactivatePartner,
  permanentlyRemovePartner,
  deleteContractLane,
  openGenericModal,
  saveNote,
  showToast,
  rName,
}) => {
  const [localNote, setLocalNote] = useState('');

  React.useEffect(() => {
    if (selectedPartner) setLocalNote(selectedPartner.notes || '');
  }, [selectedPartner?.id]);

  if (!selectedPartner) {
    return <div className="ptn-detail-pane"><div className="ptn-dp-inner" /></div>;
  }

  const p = selectedPartner;
  const isCarrier = p.type === 'carrier_company';
  const isFreelancer = p.type === 'freelancer_driver';
  const isCustomer = p.type === 'customer';
  const hasIban = !!p.iban;
  const pcColor = p.profileCompletion >= 80 ? 'var(--success)' : p.profileCompletion >= 60 ? 'var(--warning)' : 'var(--danger)';

  const docs = [
    { name: t('insuranceCert'), status: 'valid', exp: '2026-06-15' },
    { name: t('operatingLicense'), status: 'valid', exp: '2025-12-01' },
    { name: t('adrCert'), status: 'expiring', exp: '2025-04-20' },
    { name: t('cmrInsurance'), status: p.missingDocs ? 'missing' : 'valid', exp: p.missingDocs ? '—' : '2026-03-01' },
  ];

  const docBadgeStyle = (status: string) => {
    if (status === 'valid') return 'background:var(--success-bg,#ECFDF5);color:var(--success)';
    if (status === 'expiring') return 'background:#FFFBEB;color:#92400E';
    return 'background:#FEF2F2;color:var(--danger)';
  };

  const docLabel = (status: string) => {
    if (status === 'valid') return t('docValid');
    if (status === 'expiring') return t('docExpiring');
    return t('docMissing');
  };

  return (
    <div className="ptn-detail-pane open" id="ptn-detail-pane">
      <div className="ptn-dp-inner">
        {/* ── Hero ── */}
        <div className="ptn-dp-hero">
          <button type="button" className="ptn-dp-close" onClick={closeDetailPanel} id="ptn-dp-close">✕</button>

          {/* Badges */}
          <div className="ptn-dp-badges">
            <span className={`ptn-tp ${getTypeClass(p.type)}`}>
              {isCarrier ? t('carriersType') : isFreelancer ? t('freelancersType') : t('customersType')}
            </span>
            <span className={`ptn-st ${getStatusClass(p.status)}`}>{t(p.status) || p.status}</span>
            {p.tags.includes('preferred') && (
              <span className="ptn-tag ptn-tag-pref">★ {t('preferred')}</span>
            )}
            {p.tags.includes('do-not-use') && (
              <span className="ptn-tag ptn-tag-dnu">⛔ Do Not Use</span>
            )}
          </div>

          <div className="ptn-dp-name">{p.name}</div>
          <div className="ptn-dp-sub">{p.legalName} · {rName(p.regionIdx)}</div>
          <div className="ptn-dp-meta">
            VAT: <strong>{p.vat}</strong>
            <br />{p.email}
            <br />{p.phone}
          </div>

          {/* Profile completion */}
          <div className="ptn-profile-bar">
            <span className="lbl">{t('partnerProfileLabel')}</span>
            <div className="track">
              <div className="fill" style={{ width: `${p.profileCompletion}%`, background: pcColor }} />
            </div>
            <span className="pct" style={{ color: pcColor }}>{p.profileCompletion}%</span>
          </div>

          {!hasIban && (
            <div className="ptn-warn-badge red">⚠ {t('missingBankPartners')}</div>
          )}
          {p.missingDocs && (
            <div className="ptn-warn-badge amber">⚠ {t('docMissing')} {t('docsSection')}</div>
          )}

          {/* Actions */}
          <div className="ptn-dp-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => showToast(`Message to ${p.name}`)}>
              💬 {t('partnerMessage')}
            </button>
            {p.status === 'active' && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => suspendPartner(p)}>
                🚫 {t('partnerSuspend')}
              </button>
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

        {/* ── Performance KPIs ── */}
        <div className="ptn-dps">
          <SectionHeader label={`📊 ${t('performanceKpis')}`} sectionKey="kpis" open={openSections.kpis} onToggle={toggleSection} />
          {openSections.kpis && (
            <div className="ptn-dpsb">
              <div className="ptn-sg">
                {[
                  { val: p.loads30d,      lbl: t('loads30dCol'), color: undefined },
                  { val: p.lifetimeLoads, lbl: t('lifetimeLoads'), color: undefined },
                  { val: `${p.otPickup}%`,  lbl: t('otPickup'),    color: p.otPickup >= 85 ? 'var(--success)' : 'var(--warning)' },
                  { val: `${p.otDelivery}%`,lbl: t('otDelivery'),  color: p.otDelivery >= 85 ? 'var(--success)' : 'var(--warning)' },
                  { val: `${p.cancelRate}%`,lbl: t('cancelRate'),  color: p.cancelRate <= 5 ? 'var(--success)' : 'var(--danger)' },
                  { val: `${p.acceptRate}%`,lbl: t('acceptRate'),  color: p.acceptRate >= 80 ? 'var(--success)' : 'var(--warning)' },
                  { val: p.avgResponse,   lbl: t('avgResponse'), color: undefined },
                  { val: `${p.rating} ★`, lbl: t('partnerRating'), color: 'var(--warning)' },
                ].map(({ val, lbl, color }) => (
                  <div key={lbl} className="ptn-sc">
                    <div className="sv" style={{ color }}>{val}</div>
                    <div className="sl">{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Information ── */}
        <div className="ptn-dps">
          <SectionHeader label={`🏢 ${t('infoSection')}`} sectionKey="info" open={openSections.info} onToggle={toggleSection} />
          {openSections.info && (
            <div className="ptn-dpsb">
              {[
                { lb: t('legalName'), vl: p.legalName },
                { lb: 'VAT', vl: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{p.vat}</span> },
                { lb: t('regionFilter'), vl: rName(p.regionIdx) },
                { lb: t('paymentTerms'), vl: p.paymentTerms },
                { lb: t('fleetSize'), vl: p.fleetSize },
              ].map(({ lb, vl }) => (
                <div key={String(lb)} className="ptn-dpr">
                  <span className="lb">{lb}</span>
                  <span className="vl">{vl}</span>
                </div>
              ))}
              {/* Contacts */}
              <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                {t('partnerContacts')}
              </div>
              {p.contacts.map((c, i) => (
                <div key={i} className="ptn-contact-row">
                  <div className="ptn-contact-name">{c.name} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {c.role}</span></div>
                  <div className="ptn-contact-info">{c.phone} · {c.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Fleet & Capabilities (carriers + freelancers only) ── */}
        {!isCustomer && (
          <div className="ptn-dps">
            <SectionHeader label={`🚛 ${t('fleetSection')}`} sectionKey="fleet" open={openSections.fleet} onToggle={toggleSection} />
            {openSections.fleet && (
              <div className="ptn-dpsb">
                {p.trucks.length > 0 ? (
                  p.trucks.map((tk, i) => {
                    const verified = i % 3 === 0;
                    return (
                      <div key={tk} className="ptn-fleet-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🚛</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{tk}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{8 + i * 3}t · {1 + i} units</div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            ...(verified
                              ? { background: 'var(--success-bg,#ECFDF5)', color: 'var(--success)' }
                              : { background: 'var(--surface-alt)', color: 'var(--text-tertiary)' }),
                          }}
                        >
                          {verified ? `✓ ${t('bankVerified')}` : t('bankNotVerified')}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  onClick={() => openGenericModal('addCap')}
                  id="btn-add-capability"
                >
                  {t('addCapability')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Trips History ── */}
        <div className="ptn-dps">
          <SectionHeader label={`🗺️ ${t('tripsSection')}`} sectionKey="trips" open={openSections.trips} onToggle={toggleSection} />
          {openSections.trips && (
            <div className="ptn-dpsb">
              <table className="ptn-mt2">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t('laneCol')}</th>
                    <th>{t('tripDateCol')}</th>
                    <th>{t('status') || 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.trips.slice(0, 8).map((trip) => {
                    const sc = trip.status === 'Delivered' ? 'ptn-st-ac' : trip.status === 'In Transit' ? 'ptn-st-in' : 'ptn-st-su';
                    return (
                      <tr key={trip.id}>
                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{trip.id}</td>
                        <td>{trip.lane}</td>
                        <td className="ptn-ts">{trip.pickupDate}</td>
                        <td><span className={`ptn-st ${sc}`} style={{ fontSize: 9 }}>{trip.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Billing & Finance ── */}
        <div className="ptn-dps">
          <SectionHeader label={`💳 ${t('billingSection')}`} sectionKey="billing" open={openSections.billing} onToggle={toggleSection} />
          {openSections.billing && (
            <div className="ptn-dpsb">
              <div className="ptn-sg" style={{ marginBottom: 10 }}>
                <div className="ptn-sc">
                  <div className="sv" style={{ color: p.openInvoices > 3 ? 'var(--warning)' : 'var(--text-primary)' }}>{p.openInvoices}</div>
                  <div className="sl">{t('openInvoices')}</div>
                </div>
                <div className="ptn-sc">
                  <div className="sv" style={{ color: p.disputes > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{p.disputes}</div>
                  <div className="sl">{t('partnerDisputes')}</div>
                </div>
              </div>
              <div className="ptn-dpr">
                <span className="lb">{t('paymentTerms')}</span>
                <span className="vl">{p.paymentTerms}</span>
              </div>
              <div className="ptn-dpr">
                <span className="lb">
                  IBAN{' '}
                  {hasIban && (
                    p.bankVerified
                      ? <span className="ptn-vf">{t('bankVerified')}</span>
                      : <span className="ptn-uv">{t('bankNotVerified')}</span>
                  )}
                </span>
                <span className="vl" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>
                  {hasIban ? p.iban : <span style={{ color: 'var(--danger)' }}>{t('notProvided')}</span>}
                </span>
              </div>
              <div className="ptn-dpr">
                <span className="lb">{t('beneficiary')}</span>
                <span className="vl">{hasIban ? p.beneficiary : '—'}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                onClick={() => openGenericModal('editBank')}
                id="btn-edit-bank"
              >
                ✏️ {t('editBankDetails')}
              </button>
            </div>
          )}
        </div>

        {/* ── Contract Lanes (carrier companies only) ── */}
        {isCarrier && (
          <div className="ptn-dps">
            <SectionHeader label={`📄 ${t('contractsSection')}`} sectionKey="contracts" open={openSections.contracts} onToggle={toggleSection} />
            {openSections.contracts && (
              <div className="ptn-dpsb">
                {p.contractLanes.length > 0 ? (
                  <>
                    <table className="ptn-mt2">
                      <thead>
                        <tr>
                          <th>{t('laneCol')}</th>
                          <th>{t('lanePriceCol')}</th>
                          <th>{t('laneUnitCol')}</th>
                          <th>{t('status') || 'Status'}</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {p.contractLanes.map((cl, ci) => (
                          <tr key={ci}>
                            <td style={{ fontWeight: 500 }}>{cl.lane}</td>
                            <td style={{ fontWeight: 600 }}>€{cl.price}</td>
                            <td style={{ fontSize: 10 }}>{cl.unit === 'PER_LOAD' ? t('perLoad') : t('perPallet')}</td>
                            <td><span className="ptn-st ptn-st-ac" style={{ fontSize: 9 }}>{cl.status}</span></td>
                            <td>
                              <button
                                type="button"
                                onClick={() => deleteContractLane(ci)}
                                style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 4 }}
                                title={t('partnerRemove')}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="ptn-override-note">
                      <strong style={{ color: 'var(--accent)' }}>ℹ</strong> {t('contractOverride')}
                    </div>
                  </>
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
        )}

        {/* ── Documents ── */}
        <div className="ptn-dps">
          <SectionHeader label={`📁 ${t('docsSection')}`} sectionKey="docs" open={openSections.docs} onToggle={toggleSection} />
          {openSections.docs && (
            <div className="ptn-dpsb">
              {docs.map((doc) => (
                <div key={doc.name} className="ptn-doc-row">
                  <div>
                    <div className="ptn-doc-lbl">{doc.name}</div>
                    <div className="ptn-doc-exp">{t('expLabel')}: {doc.exp}</div>
                  </div>
                  <span
                    style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, ...(Object.fromEntries(docBadgeStyle(doc.status).split(';').map(s => { const [k, v] = s.split(':'); return [k?.trim().replace(/-([a-z])/g, (_, l) => l.toUpperCase()), v?.trim()]; }).filter(([k]) => k))) }}
                  >
                    {docLabel(doc.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Notes & Tags ── */}
        <div className="ptn-dps">
          <SectionHeader label={`🏷️ ${t('notesSection')}`} sectionKey="notes" open={openSections.notes} onToggle={toggleSection} />
          {openSections.notes && (
            <div className="ptn-dpsb">
              {/* Tags */}
              <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`ptn-tag ${tag === 'preferred' ? 'ptn-tag-pref' : 'ptn-tag-dnu'}`}
                  >
                    {tag === 'preferred' ? `★ ${t('preferred')}` : tag}
                  </span>
                ))}
                {p.tags.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No tags</span>
                )}
              </div>

              {/* Notes textarea */}
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
                  color: 'var(--text-primary)',
                  background: 'var(--surface)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>{t('notesPrivate')}</div>
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
