/**
 * MS3-415 — Settings → Admin → Shipment Settings.
 * Company defaults for new loads (manual Create Shipment, from order, Vagon AI):
 * live navigation, channel, price type. GET/PUT /api/shipper/v1/settings/shipment.
 * Each load can still override them; existing loads and drafts are untouched.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe, Handshake, Lock, Navigation, Save, Tag, CircleOff, type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { shipmentSettingsService } from '../../../api/services/shipmentSettingsService';
import {
  SHIPMENT_SETTINGS_DEFAULTS,
  shipmentSettingsDiff,
  type ShipmentSettings,
} from '../../../utils/shipmentSettings';

const NS = 'settings.shipmentSettingsSection';

type Option<V extends string | boolean> = {
  value: V;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  descKey?: string;
  descFallback?: string;
};

export default function ShipmentSettingsSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [saved, setSaved] = useState<ShipmentSettings | null>(null);
  const [draft, setDraft] = useState<ShipmentSettings>({ ...SHIPMENT_SETTINGS_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const tr = useCallback(
    (key: string, fallback: string) => t(`${NS}.${key}`, { defaultValue: fallback }),
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await shipmentSettingsService.get();
      setSaved(data);
      setDraft(data);
    } catch (e) {
      setLoadFailed(true);
      toast.error(e instanceof Error && e.message ? e.message : tr('loadError', 'Could not load shipment settings.'));
    } finally {
      setLoading(false);
    }
  }, [toast, tr]);

  useEffect(() => {
    void load();
    // Mount-only: avoid re-fetch loops if toast/t identities churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changes = useMemo(() => (saved ? shipmentSettingsDiff(saved, draft) : {}), [saved, draft]);
  const dirty = Object.keys(changes).length > 0;

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const data = await shipmentSettingsService.update(changes);
      setSaved(data);
      setDraft(data);
      toast.success(tr('saved', 'Shipment settings saved.'));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : tr('saveError', 'Could not save shipment settings.'));
    } finally {
      setSaving(false);
    }
  };

  const title = t('settings.shipmentSettings', { defaultValue: 'Shipment settings' });

  if (loading) {
    return (
      <div aria-busy="true">
        <h2 className="font-bold" style={{ fontSize: 18, color: T.t1 }}>{title}</h2>
        <p style={{ fontSize: 12, color: T.t3, marginTop: 8 }}>
          {tr('loading', 'Loading shipment settings…')}
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="rounded-xl px-5 py-8 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t3, marginBottom: 12 }}>
          {tr('loadError', 'Could not load shipment settings.')}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12 }}
        >
          {tr('retry', 'Try again')}
        </button>
      </div>
    );
  }

  const liveOptions: Option<boolean>[] = [
    { value: true, icon: Navigation, labelKey: 'on', labelFallback: 'On' },
    { value: false, icon: CircleOff, labelKey: 'off', labelFallback: 'Off' },
  ];
  const channelOptions: Option<ShipmentSettings['broadcast_type']>[] = [
    { value: 'private', icon: Lock, labelKey: 'private', labelFallback: 'Private', descKey: 'privateDesc', descFallback: 'Only the partners you select' },
    { value: 'public', icon: Globe, labelKey: 'public', labelFallback: 'Public', descKey: 'publicDesc', descFallback: 'All carriers on the marketplace' },
  ];
  const priceOptions: Option<ShipmentSettings['price_type']>[] = [
    { value: 'negotiable', icon: Handshake, labelKey: 'negotiable', labelFallback: 'Negotiable', descKey: 'negotiableDesc', descFallback: 'Carriers can submit counteroffers' },
    { value: 'fixed', icon: Tag, labelKey: 'fixed', labelFallback: 'Fixed', descKey: 'fixedDesc', descFallback: 'Carriers accept your price' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-bold" style={{ fontSize: 18, color: T.t1 }}>{title}</h2>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4, maxWidth: 560 }}>
            {tr('subtitle', 'Company defaults for every new load: Create Shipment, loads from orders and Vagon AI. Each load can still override them.')}
          </p>
        </div>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => void save()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border-none font-semibold"
          style={{
            background: dirty ? T.ac : T.bd,
            color: '#fff',
            fontSize: 12,
            opacity: saving ? 0.7 : 1,
            cursor: saving || !dirty ? 'default' : 'pointer',
          }}
        >
          <Save size={13} />
          {saving ? tr('saving', 'Saving…') : tr('save', 'Save')}
        </button>
      </div>

      <SettingCard
        T={T}
        title={tr('liveNavigation', 'Live navigation')}
        description={tr('liveNavigationDesc', 'Require live GPS navigation from the carrier on new loads.')}
      >
        <Segmented
          T={T}
          name="live_navigation"
          options={liveOptions}
          value={draft.live_navigation}
          onChange={(value) => setDraft((d) => ({ ...d, live_navigation: value }))}
          label={(o) => tr(o.labelKey, o.labelFallback)}
        />
      </SettingCard>

      <SettingCard
        T={T}
        title={tr('channel', 'Default channel')}
        description={tr('channelDesc', 'Who receives a new load.')}
      >
        <Segmented
          T={T}
          name="broadcast_type"
          options={channelOptions}
          value={draft.broadcast_type}
          onChange={(value) => setDraft((d) => ({ ...d, broadcast_type: value }))}
          label={(o) => tr(o.labelKey, o.labelFallback)}
          description={(o) => (o.descKey ? tr(o.descKey, o.descFallback ?? '') : '')}
        />
      </SettingCard>

      <SettingCard
        T={T}
        title={tr('priceType', 'Default price type')}
        description={tr('priceTypeDesc', 'Whether carriers can counter your price.')}
      >
        <Segmented
          T={T}
          name="price_type"
          options={priceOptions}
          value={draft.price_type}
          onChange={(value) => setDraft((d) => ({ ...d, price_type: value }))}
          label={(o) => tr(o.labelKey, o.labelFallback)}
          description={(o) => (o.descKey ? tr(o.descKey, o.descFallback ?? '') : '')}
        />
      </SettingCard>

      <p style={{ fontSize: 12, color: T.t3 }}>
        {tr('note', 'Changes apply to loads created afterwards. Existing loads and drafts keep their values.')}
      </p>
    </div>
  );
}

type Theme = ReturnType<typeof useTheme>['T'];

function SettingCard({
  T, title, description, children,
}: { T: Theme; title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="font-semibold" style={{ fontSize: 14, color: T.t1 }}>{title}</div>
      <div style={{ fontSize: 12, color: T.t3, marginTop: 2, marginBottom: 12 }}>{description}</div>
      {children}
    </div>
  );
}

function Segmented<V extends string | boolean>({
  T, name, options, value, onChange, label, description,
}: {
  T: Theme;
  name: string;
  options: Option<V>[];
  value: V;
  onChange: (value: V) => void;
  label: (option: Option<V>) => string;
  description?: (option: Option<V>) => string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col sm:flex-row gap-3 max-w-xl">
      {options.map((option) => {
        const selected = option.value === value;
        const desc = description?.(option);
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 min-w-0 text-left"
            style={{
              border: selected ? `2px solid ${T.ac}` : `1px solid ${T.bd}`,
              background: selected ? T.al : T.sf,
              color: selected ? T.ac : T.t1,
            }}
          >
            <option.icon size={18} className="shrink-0" />
            <span className="min-w-0">
              <span className="block font-semibold" style={{ fontSize: 13 }}>{label(option)}</span>
              {desc ? (
                <span className="block" style={{ fontSize: 11, color: T.t3 }}>{desc}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
