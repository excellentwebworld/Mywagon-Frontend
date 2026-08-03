/**
 * OrganizationSection — Organization settings (PDS-937 Phase B).
 * Live data via GET/PUT /api/shipper/v1/settings/organization (+ logo POST).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  Pencil, X, Check, Lock, Building2, Truck, Image as ImageIcon, Plus, Mail,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { organizationSettingsService } from '../../../api/services/organizationSettingsService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVOICE_EMAILS = 5;
const BRANDING_OPS_KEY = 'company_description';

export default function OrganizationSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [editingLegal, setEditingLegal] = useState(false);
  const [editingOps, setEditingOps] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [savingLegal, setSavingLegal] = useState(false);
  const [savingOps, setSavingOps] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [legalDraft, setLegalDraft] = useState({});
  const [opsDraft, setOpsDraft] = useState({});
  const [brandDraft, setBrandDraft] = useState({});
  const [emailInput, setEmailInput] = useState('');
  const logoInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await organizationSettingsService.get();
      setData(payload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.orgSection.loadError'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPayload = (payload) => {
    setData(payload);
  };

  const opsFields = useMemo(() => {
    const fields = data?.operations_meta?.fields ?? [];
    return fields.filter((f) => f.key !== BRANDING_OPS_KEY);
  }, [data]);

  const startLegalEdit = () => {
    setLegalDraft({
      legal_name: data.legal.legal_name ?? '',
      trade_name: data.legal.trade_name ?? '',
      vat_number: data.legal.vat_number ?? '',
      registration_number: data.legal.registration_number ?? '',
      billing_address: data.legal.billing_address ?? '',
      city: data.legal.city ?? '',
      postal_code: data.legal.postal_code ?? '',
      invoice_emails: [...(data.legal.invoice_emails || [])],
    });
    setEmailInput('');
    setEditingLegal(true);
  };

  const startOpsEdit = () => {
    const draft = {};
    for (const field of opsFields) {
      const val = data.operations?.[field.key];
      draft[field.key] = field.type === 'multi'
        ? [...(Array.isArray(val) ? val.map(String) : [])]
        : (val == null ? '' : String(val));
    }
    setOpsDraft(draft);
    setEditingOps(true);
  };

  const startBrandEdit = () => {
    setBrandDraft({
      public_profile: !!data.branding.public_profile,
      company_description: data.branding.company_description ?? '',
    });
    setEditingBrand(true);
  };

  const isFieldLocked = (apiKey) =>
    !!data?.legal?.kyc_locked && (data.legal.kyc_locked_fields || []).includes(apiKey);

  const addInvoiceEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      toast.error(t('settings.orgSection.legal.invalidEmail'));
      return;
    }
    const list = legalDraft.invoice_emails || [];
    if (list.includes(email)) {
      setEmailInput('');
      return;
    }
    if (list.length >= MAX_INVOICE_EMAILS) {
      toast.error(t('settings.orgSection.legal.maxEmails', { max: MAX_INVOICE_EMAILS }));
      return;
    }
    setLegalDraft((p) => ({ ...p, invoice_emails: [...(p.invoice_emails || []), email] }));
    setEmailInput('');
  };

  const removeInvoiceEmail = (email) => {
    setLegalDraft((p) => ({
      ...p,
      invoice_emails: (p.invoice_emails || []).filter((e) => e !== email),
    }));
  };

  const saveLegal = async () => {
    setSavingLegal(true);
    try {
      const payload = await organizationSettingsService.update({ legal: legalDraft });
      applyPayload(payload);
      setEditingLegal(false);
      toast.success(t('settings.orgSection.saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.orgSection.saveError'));
    } finally {
      setSavingLegal(false);
    }
  };

  const saveOps = async () => {
    setSavingOps(true);
    try {
      const payload = await organizationSettingsService.update({ operations: opsDraft });
      applyPayload(payload);
      setEditingOps(false);
      toast.success(t('settings.orgSection.saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.orgSection.saveError'));
    } finally {
      setSavingOps(false);
    }
  };

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      const payload = await organizationSettingsService.update({ branding: brandDraft });
      applyPayload(payload);
      setEditingBrand(false);
      toast.success(t('settings.orgSection.saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.orgSection.saveError'));
    } finally {
      setSavingBrand(false);
    }
  };

  const onLogoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const branding = await organizationSettingsService.uploadLogo(file);
      setData((prev) => (prev ? { ...prev, branding: { ...prev.branding, ...branding } } : prev));
      toast.success(t('settings.orgSection.branding.logoUploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.orgSection.saveError'));
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return <OrgSkeleton T={T} />;
  }

  if (!data) {
    return (
      <div className="rounded-xl px-5 py-8 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t3, marginBottom: 12 }}>{t('settings.orgSection.loadError')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12 }}
        >
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  const pct = data.completion?.operations_percentage ?? 0;
  const accountType = data.account_type || 'shipper';

  return (
    <div className="space-y-4">
      {/* Completion gauge */}
      <div className="rounded-xl px-5 py-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <div className="font-bold" style={{ fontSize: 14, color: T.t1 }}>
              {t('settings.orgSection.completion.title')}
            </div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
              {t('settings.orgSection.completion.subtitle', {
                answered: data.completion.answered_questions,
                total: data.completion.total_questions,
              })}
            </div>
          </div>
          <div className="font-extrabold" style={{ fontSize: 22, color: T.ac }}>{pct}%</div>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: T.sa }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, pct))}%`,
              height: '100%',
              background: T.ac,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Account type — read-only */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="p-5 rounded-t-xl" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            {t('settings.orgSection.accountType.yourType')}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span style={{ fontSize: 22, fontWeight: 800, color: '#C4B5FD', letterSpacing: 0.5 }}>
              {t(`roles.${accountType}`, { defaultValue: accountType }).toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, maxWidth: 500 }}>
            {t(`settings.orgSection.accountType.desc_${accountType}`, {
              defaultValue: t('settings.orgSection.accountType.desc_shipper'),
            })}
          </p>
        </div>
        <div className="px-5 py-3" style={{ fontSize: 12, color: T.t3 }}>
          {t('settings.orgSection.accountType.readOnly')}
        </div>
      </div>

      {/* Legal */}
      <SectionCard
        title={t('settings.orgSection.legal.title')}
        icon={<Building2 size={16} style={{ color: T.ac }} />}
        editing={editingLegal}
        saving={savingLegal}
        onEdit={startLegalEdit}
        onSave={saveLegal}
        onCancel={() => setEditingLegal(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LegalField
            label={t('settings.orgSection.legal.legalName')}
            value={editingLegal ? legalDraft.legal_name : data.legal.legal_name}
            onChange={(v) => setLegalDraft((p) => ({ ...p, legal_name: v }))}
            locked={isFieldLocked('legal_name')}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.tradeName')}
            value={editingLegal ? legalDraft.trade_name : data.legal.trade_name}
            onChange={(v) => setLegalDraft((p) => ({ ...p, trade_name: v }))}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.vatNumber')}
            value={editingLegal ? legalDraft.vat_number : data.legal.vat_number}
            onChange={(v) => setLegalDraft((p) => ({ ...p, vat_number: v }))}
            locked={isFieldLocked('vat_number')}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.regNumber')}
            value={editingLegal ? legalDraft.registration_number : data.legal.registration_number}
            onChange={(v) => setLegalDraft((p) => ({ ...p, registration_number: v }))}
            locked={isFieldLocked('registration_number')}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.billingAddress')}
            value={editingLegal ? legalDraft.billing_address : data.legal.billing_address}
            onChange={(v) => setLegalDraft((p) => ({ ...p, billing_address: v }))}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.city')}
            value={editingLegal ? legalDraft.city : data.legal.city}
            onChange={(v) => setLegalDraft((p) => ({ ...p, city: v }))}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.postalCode')}
            value={editingLegal ? legalDraft.postal_code : data.legal.postal_code}
            onChange={(v) => setLegalDraft((p) => ({ ...p, postal_code: v }))}
            editing={editingLegal}
          />
          <LegalField
            label={t('settings.orgSection.legal.country')}
            value={data.legal.country}
            editing={false}
          />

          <div className="md:col-span-2">
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              {t('settings.orgSection.legal.invoiceEmails')}
              <span style={{ fontWeight: 400, color: T.t3, marginLeft: 6 }}>
                ({t('settings.orgSection.legal.emailsHint', { max: MAX_INVOICE_EMAILS })})
              </span>
            </label>
            {editingLegal ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(legalDraft.invoice_emails || []).map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: T.al, fontSize: 11, fontWeight: 500, color: T.ac }}
                    >
                      <Mail size={10} />
                      {email}
                      <button
                        type="button"
                        onClick={() => removeInvoiceEmail(email)}
                        className="border-none bg-transparent cursor-pointer p-0"
                        style={{ color: T.ac, lineHeight: 1 }}
                        aria-label={t('settings.orgSection.legal.removeEmail')}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                {(legalDraft.invoice_emails || []).length < MAX_INVOICE_EMAILS && (
                  <div className="flex gap-2">
                    <input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addInvoiceEmail();
                        }
                      }}
                      placeholder={t('settings.orgSection.legal.addEmailPlaceholder')}
                      className="flex-1 px-3 py-2 rounded-lg outline-none"
                      style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={addInvoiceEmail}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer border-none font-semibold"
                      style={{ background: T.al, color: T.ac, fontSize: 12 }}
                    >
                      <Plus size={12} /> {t('settings.orgSection.legal.addEmail')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg" style={{ background: T.sa, minHeight: 40 }}>
                {(data.legal.invoice_emails || []).length === 0 ? (
                  <span style={{ fontSize: 13, color: T.t3 }}>—</span>
                ) : (
                  data.legal.invoice_emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: T.al, fontSize: 11, fontWeight: 500, color: T.ac }}
                    >
                      <Mail size={10} />
                      {email}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Operations */}
      <SectionCard
        title={t('settings.orgSection.operational.title')}
        icon={<Truck size={16} style={{ color: T.ac }} />}
        editing={editingOps}
        saving={savingOps}
        onEdit={startOpsEdit}
        onSave={saveOps}
        onCancel={() => setEditingOps(false)}
      >
        {opsFields.length === 0 ? (
          <div style={{ fontSize: 13, color: T.t3 }}>{t('settings.orgSection.operational.empty')}</div>
        ) : (
          <div className="space-y-4">
            {opsFields.map((field) => (
              <OpsField
                key={field.key}
                field={field}
                value={editingOps ? opsDraft[field.key] : data.operations?.[field.key]}
                editing={editingOps}
                onChange={(v) => setOpsDraft((p) => ({ ...p, [field.key]: v }))}
                T={T}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Branding */}
      <SectionCard
        title={t('settings.orgSection.branding.title')}
        icon={<ImageIcon size={16} style={{ color: T.ac }} />}
        editing={editingBrand}
        saving={savingBrand}
        onEdit={startBrandEdit}
        onSave={saveBrand}
        onCancel={() => setEditingBrand(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              {t('settings.orgSection.branding.logo')}
            </label>
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center rounded-xl overflow-hidden"
                style={{
                  width: 72,
                  height: 72,
                  background: T.al,
                  border: `2px dashed ${T.bd}`,
                  color: T.ac,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {data.branding.logo_url ? (
                  <img src={data.branding.logo_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  'LOGO'
                )}
              </div>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onLogoSelected}
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
                  style={{ background: T.al, color: T.ac, fontSize: 11, opacity: uploadingLogo ? 0.7 : 1 }}
                >
                  {uploadingLogo
                    ? t('settings.orgSection.branding.uploading')
                    : t('settings.orgSection.branding.uploadLogo')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>
                {t('settings.orgSection.branding.publicToggle')}
              </div>
              <div style={{ fontSize: 11, color: T.t3 }}>
                {t('settings.orgSection.branding.publicDesc')}
              </div>
            </div>
            <button
              type="button"
              disabled={!editingBrand}
              onClick={() =>
                editingBrand &&
                setBrandDraft((p) => ({ ...p, public_profile: !p.public_profile }))
              }
              className="relative border-none rounded-full shrink-0"
              style={{
                width: 44,
                height: 24,
                background: (editingBrand ? brandDraft.public_profile : data.branding.public_profile)
                  ? T.ac
                  : T.bd,
                padding: 0,
                cursor: editingBrand ? 'pointer' : 'default',
                opacity: editingBrand ? 1 : 0.85,
              }}
            >
              <span
                className="absolute rounded-full bg-white shadow"
                style={{
                  width: 20,
                  height: 20,
                  top: 2,
                  left: (editingBrand ? brandDraft.public_profile : data.branding.public_profile) ? 22 : 2,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              {t('settings.orgSection.branding.description')}
            </label>
            {editingBrand ? (
              <textarea
                value={brandDraft.company_description || ''}
                onChange={(e) =>
                  setBrandDraft((p) => ({ ...p, company_description: e.target.value }))
                }
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 rounded-lg outline-none resize-none"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
              />
            ) : (
              <div
                className="px-3 py-2 rounded-lg"
                style={{ background: T.sa, fontSize: 13, color: T.t1, lineHeight: 1.6 }}
              >
                {data.branding.company_description || '—'}
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function OpsField({ field, value, editing, onChange, T }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const options = field.options || [];
  const isMulti = field.type === 'multi';
  const inputType = (field.input_type || '').toLowerCase();
  const useTextarea = inputType.includes('textarea') || inputType.includes('text_area');

  const CHIP_PREVIEW = 12;

  const findOption = (v) => {
    const s = String(v);
    return (
      options.find((o) => String(o.value) === s) ||
      options.find((o) => slugify(o.label) === s) ||
      options.find((o) => slugify(o.value) === s) ||
      null
    );
  };

  const labelFor = (v) => {
    const opt = findOption(v);
    if (opt) return opt.label;
    const s = String(v);
    // Humanize leftover snake_case keys
    if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(s)) {
      return s
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return s;
  };

  const isSelected = (opt, selected) => {
    const v = String(opt.value);
    if (selected.includes(v)) return true;
    if (selected.includes(slugify(opt.label))) return true;
    if (selected.includes(slugify(opt.value))) return true;
    return false;
  };

  if (isMulti && options.length > 0) {
    const selected = Array.isArray(value) ? value.map(String) : [];

    const collapsedOptions = (() => {
      if (!editing || expanded || options.length <= CHIP_PREVIEW) return options;
      const head = options.slice(0, CHIP_PREVIEW);
      const headValues = new Set(head.map((o) => String(o.value)));
      const missingSelected = options.filter(
        (o) => isSelected(o, selected) && !headValues.has(String(o.value)),
      );
      return [...head, ...missingSelected];
    })();

    const displayOptions = editing ? collapsedOptions : options.filter((o) => isSelected(o, selected));
    const hiddenCount =
      editing && !expanded && options.length > CHIP_PREVIEW
        ? Math.max(0, options.length - collapsedOptions.length)
        : 0;

    if (!editing) {
      return (
        <div>
          <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {selected.length === 0 ? (
              <span style={{ fontSize: 13, color: T.t3 }}>—</span>
            ) : (
              selected.map((v) => (
                <span
                  key={v}
                  className="px-2.5 py-1 rounded-full"
                  style={{ background: T.al, fontSize: 11, fontWeight: 500, color: T.ac }}
                >
                  {labelFor(v)}
                </span>
              ))
            )}
          </div>
        </div>
      );
    }

    const extras = selected.filter((v) => !findOption(v));

    return (
      <div>
        <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {displayOptions.map((opt) => {
            const active = isSelected(opt, selected);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const canonical = String(opt.value);
                  // Drop any slug/label aliases for this option when toggling
                  const aliases = new Set([
                    canonical,
                    slugify(opt.label),
                    slugify(opt.value),
                  ]);
                  const without = selected.filter((v) => !aliases.has(v));
                  onChange(active ? without : [...without, canonical]);
                }}
                className="px-2.5 py-1 rounded-full border-none cursor-pointer"
                style={{
                  background: active ? T.al : T.sa,
                  color: active ? T.ac : T.t3,
                  fontSize: 11,
                  fontWeight: 500,
                  border: `1px solid ${active ? `${T.ac}40` : T.bd}`,
                  maxWidth: '100%',
                  textAlign: 'left',
                }}
                title={opt.label}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 px-0 border-none bg-transparent cursor-pointer font-semibold"
            style={{ fontSize: 12, color: T.ac }}
          >
            {t('settings.orgSection.operational.showMore', { count: hiddenCount })}
          </button>
        )}
        {editing && expanded && options.length > CHIP_PREVIEW && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-2 px-0 border-none bg-transparent cursor-pointer font-semibold"
            style={{ fontSize: 12, color: T.ac }}
          >
            {t('settings.orgSection.operational.showLess')}
          </button>
        )}
        {extras.map((v) => (
          <span
            key={`extra-${v}`}
            className="inline-flex items-center gap-1 mt-2 mr-1 px-2.5 py-1 rounded-full"
            style={{ background: T.al, fontSize: 11, fontWeight: 500, color: T.ac }}
          >
            {labelFor(v)}
            <button
              type="button"
              className="border-none bg-transparent cursor-pointer p-0"
              style={{ color: T.ac }}
              onClick={() => onChange(selected.filter((x) => x !== v))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  }

  if (!isMulti && options.length > 0) {
    const current = value == null ? '' : String(value);
    const matched = findOption(current);
    const selectValue = matched ? String(matched.value) : current;
    const label = matched?.label || labelFor(current) || '—';
    return (
      <div>
        <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        {editing ? (
          <select
            value={selectValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t1 }}>
            {label || '—'}
          </div>
        )}
      </div>
    );
  }

  // Free text / multi without options (tags as comma list when editing)
  if (isMulti) {
    const list = Array.isArray(value) ? value.map(String) : [];
    return (
      <div>
        <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        {editing ? (
          <input
            value={list.join(', ')}
            onChange={(e) => {
              const next = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              onChange(next);
            }}
            className="w-full px-3 py-2 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
            placeholder="a, b, c"
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {list.length === 0 ? (
              <span style={{ fontSize: 13, color: T.t3 }}>—</span>
            ) : (
              list.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-full"
                  style={{ background: T.al, fontSize: 11, fontWeight: 500, color: T.ac }}
                >
                  {item}
                </span>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const text = value == null ? '' : String(value);
  return (
    <div>
      <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
        {field.label}
        {field.required ? ' *' : ''}
      </label>
      {editing ? (
        useTextarea ? (
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg outline-none resize-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
          />
        ) : (
          <input
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
          />
        )
      ) : (
        <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 13, color: T.t1 }}>
          {text || '—'}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon, editing, saving, onEdit, onSave, onCancel, children }) {
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
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: theme.ac, color: '#fff', fontSize: 12 }}
          >
            <Pencil size={12} /> {t('common.edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
              style={{ background: theme.ac, color: '#fff', fontSize: 12, opacity: saving ? 0.7 : 1 }}
            >
              <Check size={12} /> {saving ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.save')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
              style={{ background: theme.sa, border: `1px solid ${theme.bd}`, color: theme.t2, fontSize: 12 }}
            >
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
        <input
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ border: `1px solid ${theme.bd}`, background: theme.sf, color: theme.t1, fontSize: 13 }}
        />
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: theme.sa, fontSize: 13, color: locked ? theme.t3 : theme.t1 }}
        >
          <span className="flex-1">{value || '—'}</span>
          {locked && (
            <span style={{ fontSize: 10, color: theme.t3 }}>
              {t('settings.orgSection.legal.kycLocked')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function OrgSkeleton({ T }) {
  const sk = { baseColor: T.sa, highlightColor: T.bd };

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {/* Completion gauge */}
      <div className="rounded-xl px-5 py-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <Skeleton width={200} height={16} borderRadius={4} {...sk} />
            <div style={{ marginTop: 8 }}>
              <Skeleton width={160} height={12} borderRadius={4} {...sk} />
            </div>
          </div>
          <Skeleton width={48} height={28} borderRadius={6} {...sk} />
        </div>
        <Skeleton height={8} borderRadius={999} {...sk} />
      </div>

      {/* Account type */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="p-5" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
          <Skeleton width={110} height={10} borderRadius={4} baseColor="rgba(255,255,255,0.15)" highlightColor="rgba(255,255,255,0.28)" />
          <div style={{ marginTop: 12 }}>
            <Skeleton width={140} height={24} borderRadius={6} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.35)" />
          </div>
          <div style={{ marginTop: 10 }}>
            <Skeleton width="75%" height={12} borderRadius={4} baseColor="rgba(255,255,255,0.12)" highlightColor="rgba(255,255,255,0.22)" />
          </div>
        </div>
        <div className="px-5 py-3">
          <Skeleton width="55%" height={12} borderRadius={4} {...sk} />
        </div>
      </div>

      {/* Legal & billing */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <Skeleton circle width={16} height={16} {...sk} />
            <Skeleton width={160} height={14} borderRadius={4} {...sk} />
          </div>
          <Skeleton width={72} height={30} borderRadius={8} {...sk} />
        </div>
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton width={90 + (i % 3) * 18} height={12} borderRadius={4} {...sk} />
              <div style={{ marginTop: 8 }}>
                <Skeleton height={38} borderRadius={8} {...sk} />
              </div>
            </div>
          ))}
          <div className="md:col-span-2">
            <Skeleton width={120} height={12} borderRadius={4} {...sk} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Skeleton width={180} height={26} borderRadius={999} {...sk} />
              <Skeleton width={140} height={26} borderRadius={999} {...sk} />
            </div>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <Skeleton circle width={16} height={16} {...sk} />
            <Skeleton width={220} height={14} borderRadius={4} {...sk} />
          </div>
          <Skeleton width={72} height={30} borderRadius={8} {...sk} />
        </div>
        <div className="px-5 py-4 space-y-5">
          {[0, 1, 2, 3].map((row) => (
            <div key={row}>
              <Skeleton width={`${45 + row * 8}%`} height={12} borderRadius={4} {...sk} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Array.from({ length: row === 0 ? 5 : row === 1 ? 1 : 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    width={row === 0 ? 120 + (i % 3) * 28 : row === 1 ? 64 : 88 + i * 12}
                    height={row === 1 ? 36 : 26}
                    borderRadius={row === 1 ? 8 : 999}
                    {...sk}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Branding */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <Skeleton circle width={16} height={16} {...sk} />
            <Skeleton width={180} height={14} borderRadius={4} {...sk} />
          </div>
          <Skeleton width={72} height={30} borderRadius={8} {...sk} />
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton width={72} height={72} borderRadius={12} {...sk} />
            <Skeleton width={100} height={28} borderRadius={8} {...sk} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton width={110} height={13} borderRadius={4} {...sk} />
              <div style={{ marginTop: 6 }}>
                <Skeleton width="70%" height={11} borderRadius={4} {...sk} />
              </div>
            </div>
            <Skeleton width={44} height={24} borderRadius={999} {...sk} />
          </div>
          <div>
            <Skeleton width={140} height={12} borderRadius={4} {...sk} />
            <div style={{ marginTop: 8 }}>
              <Skeleton height={72} borderRadius={8} {...sk} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}
