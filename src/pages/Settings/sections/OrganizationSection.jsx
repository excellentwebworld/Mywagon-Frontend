/**
 * OrganizationSection — Organization settings (4 cards).
 *
 * Card 1: Account Type & Plan — type badge, comparison, application
 * Card 2: Legal & Billing Identity — KYC-locked fields, admin-only editing
 * Card 3: Operational Profile — locations, equipment, industries
 * Card 4: Branding & Public Profile — logo, description, public toggle
 *
 * API: GET/PATCH /api/v1/organization, POST /api/v1/account-type/apply
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pencil, X, Check, Lock, Shield, Building2, Truck, Image,
  MapPin, Package, Globe, ArrowUpRight, AlertTriangle, Mail,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import {
  ORGANIZATION, ORG_OPERATIONAL, APPLICATION_HISTORY,
  EQUIPMENT_TYPES, INDUSTRIES,
} from '../../../mocks/settingsData';

export default function OrganizationSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [org, setOrg] = useState({ ...ORGANIZATION });
  const [ops, setOps] = useState({ ...ORG_OPERATIONAL });
  const [apps] = useState([...APPLICATION_HISTORY]);
  const [editingLegal, setEditingLegal] = useState(false);
  const [editingOps, setEditingOps] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [legalDraft, setLegalDraft] = useState({});
  const [opsDraft, setOpsDraft] = useState({});
  const [brandDraft, setBrandDraft] = useState({});

  const isKycLocked = org.kycStatus === 'verified';
  const LOCKED_FIELDS = ['legalName', 'vatNumber', 'registrationNumber'];

  const typeColors = { shipper: '#6366F1', forwarder: '#0EA5E9', carrier: '#F59E0B' };
  const typeIcons = { shipper: '📦', forwarder: '🔀', carrier: '🚛' };

  return (
    <div className="space-y-4">

      {/* ═══ Card 1: Account Type ═══ */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="p-5 rounded-t-xl" style={{ background: `linear-gradient(135deg, #1e1b4b, #312e81)` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            {t('settings.orgSection.accountType.yourType')}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span style={{ fontSize: 28 }}>{typeIcons[org.accountType]}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#C4B5FD', letterSpacing: 0.5 }}>
              {t(`roles.${org.accountType}`).toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, maxWidth: 500 }}>
            {t(`settings.orgSection.accountType.desc_${org.accountType}`)}
          </p>
        </div>

        <div className="px-5 py-4">
          {/* Apply buttons */}
          {org.accountType === 'shipper' && (
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.al, color: T.ac, fontSize: 12 }}>
                🔀 {t('settings.orgSection.accountType.applyForwarder')}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12 }}>
                🚛 {t('settings.orgSection.accountType.applyCarrier')}
              </button>
            </div>
          )}

          {/* Application status */}
          {apps.length === 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 12, color: T.t3 }}>
              {t('settings.orgSection.accountType.noApps')}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Card 2: Legal & Billing Identity ═══ */}
      <SectionCard title={t('settings.orgSection.legal.title')} icon={<Building2 size={16} style={{ color: T.ac }} />}
        editing={editingLegal}
        onEdit={() => { setLegalDraft({ ...org }); setEditingLegal(true); }}
        onSave={() => { setOrg({ ...legalDraft }); setEditingLegal(false); toast.success(t('settings.settingsToast.orgUpdated')); }}
        onCancel={() => setEditingLegal(false)} T={T}>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LegalField label={t('settings.orgSection.legal.legalName')} value={editingLegal ? legalDraft.legalName : org.legalName}
            onChange={(v) => setLegalDraft(p => ({ ...p, legalName: v }))}
            locked={isKycLocked && LOCKED_FIELDS.includes('legalName')} editing={editingLegal} T={T} t={t} />
          <LegalField label={t('settings.orgSection.legal.tradeName')} value={editingLegal ? legalDraft.tradeName : org.tradeName}
            onChange={(v) => setLegalDraft(p => ({ ...p, tradeName: v }))} editing={editingLegal} T={T} t={t} />
          <LegalField label={t('settings.orgSection.legal.vatNumber')} value={editingLegal ? legalDraft.vatNumber : org.vatNumber}
            onChange={(v) => setLegalDraft(p => ({ ...p, vatNumber: v }))}
            locked={isKycLocked && LOCKED_FIELDS.includes('vatNumber')} editing={editingLegal} T={T} t={t} />
          <LegalField label={t('settings.orgSection.legal.regNumber')} value={editingLegal ? legalDraft.registrationNumber : org.registrationNumber}
            onChange={(v) => setLegalDraft(p => ({ ...p, registrationNumber: v }))}
            locked={isKycLocked && LOCKED_FIELDS.includes('registrationNumber')} editing={editingLegal} T={T} t={t} />
          <LegalField label={t('settings.orgSection.legal.billingAddress')} value={editingLegal ? legalDraft.billingAddress : org.billingAddress}
            onChange={(v) => setLegalDraft(p => ({ ...p, billingAddress: v }))} editing={editingLegal} T={T} t={t} />
          <LegalField label={t('settings.orgSection.legal.country')} value={org.country} editing={false} T={T} t={t} />
          <LegalField label={t('settings.orgSection.legal.currency')} value={`${org.defaultCurrency} (€)`} editing={false} T={T} t={t} />
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.orgSection.legal.invoiceEmails')}</label>
            <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t1 }}>
              {org.invoiceEmails.join(', ')}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ═══ Card 3: Operational Profile ═══ */}
      <SectionCard title={t('settings.orgSection.operational.title')} icon={<Truck size={16} style={{ color: T.ac }} />}
        editing={editingOps}
        onEdit={() => { setOpsDraft({ ...ops }); setEditingOps(true); }}
        onSave={() => { setOps({ ...opsDraft }); setEditingOps(false); toast.success(t('settings.settingsToast.orgUpdated')); }}
        onCancel={() => setEditingOps(false)} T={T}>

        <div className="space-y-4">
          {/* Locations */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              <MapPin size={12} className="inline mr-1" />{t('settings.orgSection.operational.locations')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ops.primaryLocations.map(loc => (
                <span key={loc} className="px-2.5 py-1 rounded-full" style={{ background: T.al, fontSize: 11, fontWeight: 500, color: T.ac }}>
                  {loc}
                </span>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              <Package size={12} className="inline mr-1" />{t('settings.orgSection.operational.equipment')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_TYPES.map(eq => {
                const active = ops.equipmentTypes.includes(eq.key);
                return (
                  <button key={eq.key}
                    onClick={() => editingOps && setOpsDraft(p => ({ ...p, equipmentTypes: active ? p.equipmentTypes.filter(e => e !== eq.key) : [...p.equipmentTypes, eq.key] }))}
                    className="px-2.5 py-1 rounded-full cursor-pointer border-none"
                    style={{ background: active ? T.al : T.sa, color: active ? T.ac : T.t3, fontSize: 11, fontWeight: 500, border: `1px solid ${active ? T.ac + '40' : T.bd}` }}>
                    {eq.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Industries */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              <Globe size={12} className="inline mr-1" />{t('settings.orgSection.operational.industries')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map(ind => {
                const active = ops.industries.includes(ind.key);
                return (
                  <button key={ind.key}
                    onClick={() => editingOps && setOpsDraft(p => ({ ...p, industries: active ? p.industries.filter(i => i !== ind.key) : [...p.industries, ind.key] }))}
                    className="px-2.5 py-1 rounded-full cursor-pointer border-none"
                    style={{ background: active ? T.al : T.sa, color: active ? T.ac : T.t3, fontSize: 11, fontWeight: 500, border: `1px solid ${active ? T.ac + '40' : T.bd}` }}>
                    {ind.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shipment profile */}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.orgSection.operational.shipmentProfile')}</label>
            {editingOps ? (
              <input value={opsDraft.shipmentProfile || ''} onChange={(e) => setOpsDraft(p => ({ ...p, shipmentProfile: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
            ) : (
              <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t1 }}>{ops.shipmentProfile || '—'}</div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ═══ Card 4: Branding & Public Profile ═══ */}
      <SectionCard title={t('settings.orgSection.branding.title')} icon={<Image size={16} style={{ color: T.ac }} />}
        editing={editingBrand}
        onEdit={() => { setBrandDraft({ logoUrl: org.logoUrl, publicProfile: org.publicProfile, companyDescription: org.companyDescription }); setEditingBrand(true); }}
        onSave={() => { setOrg(p => ({ ...p, ...brandDraft })); setEditingBrand(false); toast.success(t('settings.settingsToast.orgUpdated')); }}
        onCancel={() => setEditingBrand(false)} T={T}>

        <div className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.orgSection.branding.logo')}</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-xl" style={{ width: 72, height: 72, background: T.al, border: `2px dashed ${T.bd}`, color: T.ac, fontSize: 11, fontWeight: 700 }}>
                {org.logoUrl ? <img src={org.logoUrl} alt="" className="w-full h-full object-contain rounded-xl" /> : 'LOGO'}
              </div>
              {editingBrand && (
                <button className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.al, color: T.ac, fontSize: 11 }}>
                  {t('settings.orgSection.branding.uploadLogo')}
                </button>
              )}
            </div>
          </div>

          {/* Public profile toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>{t('settings.orgSection.branding.publicToggle')}</div>
              <div style={{ fontSize: 11, color: T.t3 }}>{t('settings.orgSection.branding.publicDesc')}</div>
            </div>
            <button
              onClick={() => editingBrand && setBrandDraft(p => ({ ...p, publicProfile: !p.publicProfile }))}
              className="relative cursor-pointer border-none rounded-full shrink-0"
              style={{ width: 44, height: 24, background: (editingBrand ? brandDraft.publicProfile : org.publicProfile) ? T.ac : T.bd, padding: 0 }}>
              <span className="absolute rounded-full bg-white shadow" style={{ width: 20, height: 20, top: 2, left: (editingBrand ? brandDraft.publicProfile : org.publicProfile) ? 22 : 2, transition: 'left 0.2s' }} />
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t('settings.orgSection.branding.description')}</label>
            {editingBrand ? (
              <textarea value={brandDraft.companyDescription || ''} onChange={(e) => setBrandDraft(p => ({ ...p, companyDescription: e.target.value }))}
                rows={3} maxLength={500} className="w-full px-3 py-2 rounded-lg outline-none resize-none"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
            ) : (
              <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t1, lineHeight: 1.6 }}>
                {org.companyDescription || '—'}
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Shared sub-components ── */

function SectionCard({ title, icon, editing, onEdit, onSave, onCancel, children, T }) {
  const { T: theme } = useTheme();
  const { t } = useTranslation();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: theme.sf, border: `1px solid ${theme.bd}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${theme.bd}` }}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold" style={{ fontSize: 14, color: theme.t1 }}>{title}</h3>
        </div>
        {!editing ? (
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: theme.ac, color: '#fff', fontSize: 12 }}>
            <Pencil size={12} /> {t('common.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: theme.ac, color: '#fff', fontSize: 12 }}>
              <Check size={12} /> {t('common.save')}
            </button>
            <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: theme.sa, border: `1px solid ${theme.bd}`, color: theme.t2, fontSize: 12 }}>
              <X size={12} /> {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function LegalField({ label, value, onChange, locked, editing }) {
  const { T: theme } = useTheme();
  const { t } = useTranslation();
  return (
    <div>
      <label className="flex items-center gap-1 mb-1" style={{ fontSize: 12, fontWeight: 600, color: theme.t2 }}>
        {label} {locked && <Lock size={10} style={{ color: theme.t3 }} />}
      </label>
      {editing && !locked ? (
        <input value={value || ''} onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ border: `1px solid ${theme.bd}`, background: theme.sf, color: theme.t1, fontSize: 13 }} />
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: theme.sa, fontSize: 13, color: locked ? theme.t3 : theme.t1 }}>
          <span className="flex-1">{value || '—'}</span>
          {locked && <span style={{ fontSize: 10, color: theme.t3 }}>{t('settings.orgSection.legal.kycLocked')}</span>}
        </div>
      )}
    </div>
  );
}
