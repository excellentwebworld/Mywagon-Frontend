/**
 * NotificationsSection — shipper push/email preference toggles (PDS-937 Phase A).
 * Blade-parity fields via GET/PUT /api/shipper/v1/settings/notifications.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Bell, Mail, Save } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import {
  notificationSettingsService,
} from '../../../api/services/notificationSettingsService';

export default function NotificationsSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [push, setPush] = useState([]);
  const [email, setEmail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationSettingsService.get();
      setPush(data.push || []);
      setEmail(data.email || []);
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.notificationsSection.loadError'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleItem = (group, slug) => {
    const setter = group === 'push' ? setPush : setEmail;
    setter((prev) =>
      prev.map((item) => (item.slug === slug ? { ...item, value: !item.value } : item)),
    );
    setDirty(true);
  };

  const setAll = (group, value) => {
    const setter = group === 'push' ? setPush : setEmail;
    setter((prev) => prev.map((item) => ({ ...item, value })));
    setDirty(true);
  };

  const pushAllOn = useMemo(() => push.length > 0 && push.every((i) => i.value), [push]);
  const emailAllOn = useMemo(() => email.length > 0 && email.every((i) => i.value), [email]);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        push: Object.fromEntries(push.map((i) => [i.slug, i.value])),
        email: Object.fromEntries(email.map((i) => [i.slug, i.value])),
      };
      const data = await notificationSettingsService.update(body);
      setPush(data.push || []);
      setEmail(data.email || []);
      setDirty(false);
      toast.success(t('settings.notificationsSection.saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.notificationsSection.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <NotificationsSkeleton T={T} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold" style={{ fontSize: 18, color: T.t1 }}>
            {t('settings.notificationSettings')}
          </h2>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
            {t('settings.notificationsSection.subtitle')}
          </p>
        </div>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
          style={{
            background: dirty ? T.ac : T.bd,
            color: '#fff',
            fontSize: 12,
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={13} />
          {saving
            ? t('settings.notificationsSection.saving')
            : t('settings.notificationsSection.save')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GroupCard
          title={t('settings.notificationsSection.push')}
          icon={<Bell size={16} style={{ color: T.ac }} />}
          allOn={pushAllOn}
          onToggleAll={() => setAll('push', !pushAllOn)}
          selectAllLabel={t('settings.notificationsSection.selectAll')}
          T={T}
        >
          {push.map((item) => (
            <ToggleRow
              key={item.slug}
              label={item.label}
              checked={item.value}
              onChange={() => toggleItem('push', item.slug)}
              T={T}
            />
          ))}
        </GroupCard>

        <GroupCard
          title={t('settings.notificationsSection.email')}
          icon={<Mail size={16} style={{ color: T.ac }} />}
          allOn={emailAllOn}
          onToggleAll={() => setAll('email', !emailAllOn)}
          selectAllLabel={t('settings.notificationsSection.selectAll')}
          T={T}
        >
          {email.map((item) => (
            <ToggleRow
              key={item.slug}
              label={item.label}
              checked={item.value}
              onChange={() => toggleItem('email', item.slug)}
              T={T}
            />
          ))}
        </GroupCard>
      </div>
    </div>
  );
}

function NotificationsSkeleton({ T }) {
  const sk = { baseColor: T.sa, highlightColor: T.bd };

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <Skeleton width={160} height={22} borderRadius={6} {...sk} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width="70%" height={12} borderRadius={4} {...sk} />
          </div>
        </div>
        <Skeleton width={120} height={36} borderRadius={8} {...sk} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="rounded-xl overflow-hidden"
            style={{ background: T.sf, border: `1px solid ${T.bd}` }}
          >
            <div
              className="flex items-center justify-between gap-3 px-5 py-3"
              style={{ borderBottom: `1px solid ${T.bd}` }}
            >
              <div className="flex items-center gap-2">
                <Skeleton circle width={16} height={16} {...sk} />
                <Skeleton width={140} height={14} borderRadius={4} {...sk} />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton width={64} height={12} borderRadius={4} {...sk} />
                <Skeleton width={44} height={24} borderRadius={999} {...sk} />
              </div>
            </div>
            <div className="px-5 py-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 gap-3"
                  style={{ borderBottom: i < 4 ? `1px solid ${T.bd}` : 'none' }}
                >
                  <Skeleton width={`${55 + (i % 3) * 10}%`} height={13} borderRadius={4} {...sk} />
                  <Skeleton width={44} height={24} borderRadius={999} {...sk} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupCard({ title, icon, children, allOn, onToggleAll, selectAllLabel, T }) {
  return (
    <div className="rounded-xl overflow-hidden h-full" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderBottom: `1px solid ${T.bd}` }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold" style={{ fontSize: 14, color: T.t1 }}>
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          className="flex items-center gap-2 cursor-pointer border-none bg-transparent"
          style={{ fontSize: 12, color: T.t2, fontWeight: 500 }}
        >
          {selectAllLabel}
          <ToggleSwitch on={allOn} T={T} />
        </button>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, T }) {
  return (
    <div
      className="flex items-center justify-between py-3 gap-3"
      style={{ borderBottom: `1px solid ${T.bd}` }}
    >
      <span style={{ fontSize: 13, color: T.t1 }}>{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="cursor-pointer border-none bg-transparent p-0"
        aria-pressed={checked}
      >
        <ToggleSwitch on={checked} T={T} />
      </button>
    </div>
  );
}

function ToggleSwitch({ on, T }) {
  return (
    <span
      className="relative inline-block rounded-full shrink-0"
      style={{ width: 44, height: 24, background: on ? T.ac : T.bd }}
    >
      <span
        className="absolute rounded-full bg-white shadow"
        style={{
          width: 18,
          height: 18,
          top: 3,
          left: on ? 22 : 3,
          transition: 'left 0.15s',
        }}
      />
    </span>
  );
}
