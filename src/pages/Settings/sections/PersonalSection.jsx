/**
 * PersonalSection — Personal Info settings (PDS-937).
 * Live data via GET/PUT /api/shipper/v1/settings/personal (+ avatar POST).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  Pencil, X, Check, Lock, Briefcase, Camera, Clock, Shield, ArrowRight,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { useAuth as useShipperAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/useToast';
import { personalSettingsService } from '../../../api/services/personalSettingsService';
import { signupService } from '../../../api/auth';
import { CountryCodeSelect } from '../../Register/components/CountryCodeSelect';
import {
  needsSocialPhone,
  needsSignupComplete,
} from '../../../hooks/useSignupCompleteGate';
import '../../Register/RegisterPage.css';
import { onboardingService } from '../../../api/services/onboardingService';
import { FORCE_TOUR_SESSION_KEY } from '../../../onboarding';
import { safeSessionSet } from '../../../utils/safeStorage';
import { parseUtcInstant } from '../../../utils/timezone';
import { formatIsoDisplayDateTime } from '../../../utils/dateDisplay';
import { ContextualTutorialTrigger } from '../../../components/Tutorials';
import '../../../styles/tutorials.css';

const ACTIVITY_PREVIEW_LIMIT = 10;

export default function PersonalSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { T } = useTheme();
  const { refreshUser } = useAuth();
  const { refreshUser: refreshShipperUser, user } = useShipperAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [replayingTour, setReplayingTour] = useState(false);
  const socialPhoneStep = needsSocialPhone(user) || needsSignupComplete(user);
  const [countryCodes, setCountryCodes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [draft, setDraft] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = await signupService.getReference(i18n.language);
        if (!cancelled) setCountryCodes(ref.country_codes || []);
      } catch {
        if (!cancelled) setCountryCodes([{ code: '+30', label: 'Greece (+30)' }]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await personalSettingsService.get();
      setData(payload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.profileSection.loadError'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback(() => {
    if (!data?.profile) return;
    setDraft({
      first_name: data.profile.first_name ?? '',
      last_name: data.profile.last_name ?? '',
      country_code: data.profile.country_code || user?.country_code || '+30',
      phone: data.profile.phone ?? '',
      main_use: data.profile.main_use ?? '',
    });
    setAvatarPreview(null);
    setEditing(true);
  }, [data, user?.country_code]);

  // Social incomplete: force edit so phone can be filled
  useEffect(() => {
    if (!data?.profile) return;
    if (needsSocialPhone(user) || data.profile.phone_required) {
      startEdit();
    }
  }, [data, user, startEdit]);

  const cancelEdit = () => {
    if (needsSocialPhone(user)) return;
    setEditing(false);
    setAvatarPreview(null);
  };

  const setField = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));

  const saveEdit = async () => {
    if (!draft.first_name?.trim()) {
      toast.error(t('settings.profileSection.firstNameRequired', { defaultValue: 'The first name field is required.' }));
      return;
    }
    if (!draft.last_name?.trim()) {
      toast.error(t('settings.profileSection.lastNameRequired', { defaultValue: 'The last name field is required.' }));
      return;
    }
    const phoneDigits = String(draft.phone || '').replace(/[^0-9]/g, '');
    if ((needsSocialPhone(user) || data.profile.phone_required) && !phoneDigits) {
      toast.error(t('settings.profileSection.phoneRequired', { defaultValue: 'Phone number is required.' }));
      return;
    }
    setSaving(true);
    try {
      const body = {
        first_name: draft.first_name?.trim(),
        last_name: draft.last_name?.trim(),
      };
      if (!data.profile.phone_locked) {
        body.phone = phoneDigits || null;
        body.country_code = draft.country_code || '+30';
      }
      if (!data.profile.main_use_locked) {
        body.main_use = draft.main_use || null;
      }
      const payload = await personalSettingsService.update(body);
      setData(payload);
      setEditing(false);
      setAvatarPreview(null);
      const profile = await refreshShipperUser?.();
      await refreshUser?.();
      toast.success(t('settings.profileSection.saved'));
      // Always continue social stepwise flow: personal → organization (company/address) → KYC.
      if (profile?.signup_complete === false || needsSignupComplete(user)) {
        navigate('/settings/organization?from=social_setup', { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.profileSection.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.profileSection.avatarTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const result = await personalSettingsService.uploadAvatar(file);
      setData((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, ...result.profile, avatar_url: result.avatar_url },
            }
          : prev,
      );
      setAvatarPreview(null);
      await refreshUser?.();
      toast.success(t('settings.profileSection.avatarUploaded'));
    } catch (err) {
      setAvatarPreview(null);
      toast.error(err instanceof Error ? err.message : t('settings.profileSection.saveError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return <PersonalSkeleton T={T} />;
  }

  if (!data) {
    return (
      <div className="rounded-xl px-5 py-8 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t3, marginBottom: 12 }}>{t('settings.profileSection.loadError')}</p>
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

  const profile = data.profile;
  const roleAccess = data.role_access ?? {
    role_key: 'admin',
    role_name: 'Admin',
    role_color: '#9B51E0',
    assigned_by: t('settings.profileSection.role.system', { defaultValue: 'System' }),
    since: data.account?.member_since ?? null,
    module_access: [],
    has_custom_permissions: false,
  };
  const savedFirst = profile.first_name || '';
  const savedLast = profile.last_name || '';
  const currentAvatar = avatarPreview || profile.avatar_url;
  const activityPreview = (data.activity || []).slice(0, ACTIVITY_PREVIEW_LIMIT);

  return (
    <div className="space-y-4">
      <div className="tut-title-with-trigger" style={{ marginBottom: 4 }}>
        <h2 className="font-bold" style={{ fontSize: 18, color: T.t1, margin: 0 }}>
          {t('settings.personal')}
        </h2>
        <ContextualTutorialTrigger tutorialKey="profile" />
      </div>
      {socialPhoneStep && needsSocialPhone(user) && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: T.al, border: `1px solid ${T.bd}`, fontSize: 13, color: T.t2 }}
        >
          {t('settings.profileSection.socialPhoneHint', {
            defaultValue:
              'To start using MYVAGON, please add your phone number. This is required to verify your account.',
          })}
        </div>
      )}
      <Card
        title={t('settings.profileSection.myInfo')}
        icon={<Briefcase size={16} style={{ color: T.ac }} />}
        action={
          !editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
              style={{ background: T.ac, color: '#fff', fontSize: 12 }}
            >
              <Pencil size={12} /> {t('common.edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
                style={{ background: T.ac, color: '#fff', fontSize: 12, opacity: saving ? 0.7 : 1 }}
              >
                <Check size={12} /> {saving ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.save')}
              </button>
              <button
                type="button"
                disabled={saving || needsSocialPhone(user)}
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none"
                style={{
                  background: T.sa,
                  border: `1px solid ${T.bd}`,
                  color: T.t2,
                  fontSize: 12,
                  display: needsSocialPhone(user) ? 'none' : undefined,
                }}
              >
                <X size={12} /> {t('common.cancel')}
              </button>
            </div>
          )
        }
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            {currentAvatar ? (
              <img src={currentAvatar} alt="" className="rounded-2xl object-cover" style={{ width: 64, height: 64 }} />
            ) : (
              <div
                className="flex items-center justify-center rounded-2xl shrink-0"
                style={{
                  width: 64,
                  height: 64,
                  background: `linear-gradient(135deg, ${T.ac}, ${T.ac}CC)`,
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {(savedFirst?.[0] || '').toUpperCase()}
                {(savedLast?.[0] || '').toUpperCase()}
              </div>
            )}
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full cursor-pointer border-none"
              style={{
                width: 26,
                height: 26,
                background: T.ac,
                color: '#fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                opacity: uploadingAvatar ? 0.7 : 1,
              }}
              title={t('settings.profileSection.uploadAvatar')}
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <div className="font-bold" style={{ fontSize: 16, color: T.t1 }}>
              {savedFirst} {savedLast}
            </div>
            <div style={{ fontSize: 12, color: T.t3 }}>{profile.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t('settings.profileSection.firstName')}
            required
            value={editing ? draft.first_name : profile.first_name}
            onChange={(v) => setField('first_name', v)}
            editing={editing}
          />
          <Field
            label={t('settings.profileSection.lastName')}
            required
            value={editing ? draft.last_name : profile.last_name}
            onChange={(v) => setField('last_name', v)}
            editing={editing}
          />
          <Field
            label={t('settings.profileSection.email')}
            value={profile.email}
            locked
            lockMsg={t('settings.profileSection.emailLocked')}
            icon={<Lock size={12} />}
          />
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              {t('settings.profileSection.phone')}
              {(needsSocialPhone(user) || profile.phone_required) && (
                <span style={{ color: '#EF4444' }}> *</span>
              )}
            </label>
            {/* Always split like signup: country-code dropdown + phone (even when locked / view mode) */}
            <div className="flex gap-2 items-stretch">
              <div style={{ minWidth: 88, flexShrink: 0 }}>
                <CountryCodeSelect
                  id="settings-personal-country-code"
                  value={
                    editing && !profile.phone_locked
                      ? (draft.country_code || '+30')
                      : (profile.country_code || user?.country_code || '+30')
                  }
                  options={countryCodes.length ? countryCodes : [{ code: '+30', label: 'Greece (+30)' }]}
                  onChange={(code) => setField('country_code', code)}
                  disabled={saving || !editing || profile.phone_locked}
                  verified={Boolean(profile.phone_locked)}
                />
              </div>
              {editing && !profile.phone_locked ? (
                <input
                  value={draft.phone || ''}
                  onChange={(e) => setField('phone', e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
                  placeholder={t('settings.profileSection.phonePlaceholder', { defaultValue: 'Phone number' })}
                  inputMode="numeric"
                />
              ) : (
                <div
                  className="flex flex-1 items-center gap-2 px-3 py-2 rounded-lg min-w-0"
                  style={{ background: T.sa, fontSize: 13, color: profile.phone_locked ? T.t3 : T.t1 }}
                  title={profile.phone_locked ? t('settings.profileSection.phoneLocked') : undefined}
                >
                  {profile.phone_locked ? <Lock size={12} className="shrink-0" /> : null}
                  <span className="flex-1 select-all">{profile.phone || '—'}</span>
                </div>
              )}
            </div>
            {profile.phone_locked && (
              <div className="mt-1" style={{ fontSize: 10, color: T.t3 }}>
                {t('settings.profileSection.phoneLocked')}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
              {t('settings.profileSection.mainUse')}
            </label>
            {editing && !profile.main_use_locked ? (
              <select
                value={draft.main_use || ''}
                onChange={(e) => setField('main_use', e.target.value)}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
              >
                <option value="">—</option>
                {(data.main_use_options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: T.sa, fontSize: 13, color: profile.main_use_locked ? T.t3 : T.t1 }}
              >
                {profile.main_use_locked && <Lock size={12} />}
                <span className="flex-1">
                  {(data.main_use_options || []).find((o) => o.value === profile.main_use)?.label
                    || profile.main_use
                    || '—'}
                </span>
                {profile.main_use_locked && (
                  <span style={{ fontSize: 10, color: T.t3 }}>{t('settings.profileSection.mainUseLocked')}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card
        title={t('settings.profileSection.roleAccess')}
        icon={<Shield size={16} style={{ color: '#9B51E0' }} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RoleBox
            label={t('settings.profileSection.role.role')}
            value={roleAccess.role_name}
          />
          <RoleBox
            label={t('settings.profileSection.role.assignedBy')}
            value={roleAccess.assigned_by}
          />
          <RoleBox
            label={t('settings.profileSection.role.since')}
            value={formatIsoDate(roleAccess.since)}
          />
        </div>
      </Card>

      <Card title={t('settings.profileSection.prefsActivity')} icon={<Clock size={16} style={{ color: T.ac }} />}>
        <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>
          {t('settings.profileSection.activity.recentTitle')}
        </div>
        <p style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>
          {t('settings.profileSection.activity.accountActivityHint')}
        </p>
        {(data.activity || []).length === 0 ? (
          <div
            className="px-3 py-4 rounded-lg mb-3 text-center"
            style={{ background: T.sa, fontSize: 12, color: T.t3 }}
          >
            {t('settings.profileSection.activity.empty')}
          </div>
        ) : (
          <div className="mb-3 space-y-2">
            {activityPreview.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: T.sa, border: `1px solid ${T.bd}` }}
              >
                <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: T.ac }} />
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{item.title}</div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{item.description}</div>
                  )}
                </div>
                <div className="shrink-0" style={{ fontSize: 10, color: T.t3 }}>
                  {relativeTime(item.at)}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/settings/audit')}
          className="flex items-center gap-1.5 mb-5 px-0 py-1 cursor-pointer border-none bg-transparent font-semibold"
          style={{ fontSize: 12, color: T.ac }}
        >
          {t('settings.profileSection.activity.viewFullAuditLog')}
          <ArrowRight size={14} />
        </button>

        <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>
          {t('settings.profileSection.activity.accountInfo')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoRow
            label={t('settings.profileSection.activity.memberSince')}
            value={formatDate(data.account.member_since)}
          />
          <InfoRow
            label={t('settings.profileSection.activity.lastLogin')}
            value={relativeTime(data.account.last_active_at)}
          />
        </div>

        <div
          className="mt-4 px-3 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ background: T.sa, border: `1px solid ${T.bd}` }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
              {t('settings.profileSection.replayTour')}
            </div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
              {t('settings.profileSection.replayTourHint')}
            </div>
          </div>
          <button
            type="button"
            disabled={replayingTour}
            onClick={async () => {
              setReplayingTour(true);
              try {
                await onboardingService.reset();
                await refreshShipperUser?.();
                safeSessionSet(FORCE_TOUR_SESSION_KEY, '1');
                navigate('/dashboard');
              } catch (e) {
                toast.error(
                  e instanceof Error
                    ? e.message
                    : t('settings.profileSection.replayTourError'),
                );
              } finally {
                setReplayingTour(false);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer border-none shrink-0"
            style={{ background: T.ac, color: '#fff', fontSize: 12, fontWeight: 600 }}
          >
            {replayingTour
              ? t('settings.profileSection.replayTourBusy')
              : t('settings.profileSection.replayTour')}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon, action, children }) {
  const { T: theme } = useTheme();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: theme.sf, border: `1px solid ${theme.bd}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${theme.bd}` }}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold" style={{ fontSize: 14, color: theme.t1 }}>{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, editing, locked, lockMsg, required, icon }) {
  const { T: theme } = useTheme();
  return (
    <div>
      <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: theme.t2 }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
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
          {icon}
          <span className="flex-1">{value || '—'}</span>
          {locked && lockMsg && <span style={{ fontSize: 10, color: theme.t3 }}>{lockMsg}</span>}
        </div>
      )}
    </div>
  );
}

function RoleBox({ label, value }) {
  const { T: theme } = useTheme();
  return (
    <div className="px-4 py-3 rounded-xl" style={{ background: theme.sa, border: `1px solid ${theme.bd}` }}>
      <div style={{ fontSize: 11, color: theme.t3, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: theme.t1 }}>{value || '—'}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  const { T: theme } = useTheme();
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: theme.sa }}>
      <div style={{ fontSize: 10, color: theme.t3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.t1 }}>{value ?? '—'}</div>
    </div>
  );
}

function PersonalSkeleton({ T }) {
  const sk = { baseColor: T.sa, highlightColor: T.bd };
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <Skeleton circle width={16} height={16} {...sk} />
            <Skeleton width={140} height={14} borderRadius={4} {...sk} />
          </div>
          <Skeleton width={72} height={30} borderRadius={8} {...sk} />
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-4 mb-5">
            <Skeleton width={64} height={64} borderRadius={16} {...sk} />
            <div className="flex-1">
              <Skeleton width={160} height={18} borderRadius={4} {...sk} />
              <div style={{ marginTop: 8 }}>
                <Skeleton width={200} height={12} borderRadius={4} {...sk} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton width={90} height={12} borderRadius={4} {...sk} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton height={38} borderRadius={8} {...sk} />
                </div>
              </div>
            ))}
            <div className="md:col-span-2">
              <Skeleton width={120} height={12} borderRadius={4} {...sk} />
              <div style={{ marginTop: 8 }}>
                <Skeleton height={38} borderRadius={8} {...sk} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <Skeleton circle width={16} height={16} {...sk} />
          <Skeleton width={140} height={14} borderRadius={4} {...sk} />
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Skeleton height={52} borderRadius={8} {...sk} />
            <Skeleton height={52} borderRadius={8} {...sk} />
            <Skeleton height={52} borderRadius={8} {...sk} />
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <Skeleton circle width={16} height={16} {...sk} />
          <Skeleton width={180} height={14} borderRadius={4} {...sk} />
        </div>
        <div className="px-5 py-4 space-y-4">
          <Skeleton height={56} borderRadius={8} {...sk} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton height={52} borderRadius={8} {...sk} />
            <Skeleton height={52} borderRadius={8} {...sk} />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatIsoDate(iso) {
  if (!iso) return '—';
  const formatted = formatIsoDisplayDateTime(iso);
  if (!formatted) return '—';
  return formatted.split(' ')[0];
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = parseUtcInstant(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relativeTime(iso) {
  if (!iso) return '—';
  const d = parseUtcInstant(iso);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
