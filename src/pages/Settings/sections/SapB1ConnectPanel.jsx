import { useEffect, useState } from 'react';
import { CheckCircle, Eye, EyeOff, RefreshCw, XCircle } from 'lucide-react';
import { erpIntegrationService } from '../../../api/services/erpIntegrationService';
import { ApiError } from '../../../api';

const emptyForm = {
  service_layer_url: '',
  company_db: '',
  username: '',
  password: '',
  language: '',
};

const LOG_PREFIX = '[SAP B1 Connect]';

export default function SapB1ConnectPanel({ T, t, toast, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingType, setSyncingType] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [lastError, setLastError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [connectBanner, setConnectBanner] = useState(null);

  const applyConnection = (data) => {
    const saved = !!data.settings?.has_password;
    setForm({
      service_layer_url: data.settings?.service_layer_url || '',
      company_db: data.settings?.company_db || '',
      username: data.settings?.username || '',
      password: '',
      language: data.settings?.language || '',
    });
    setHasPassword(saved);
    setConnected(saved && data.status !== 'disconnected');
    setStatus(data.status || 'disconnected');
    setLastError(data.last_error);
    setLastRun(data.last_run);
    if (saved && data.status === 'connected' && !data.last_error) {
      setConnectBanner('success');
    }
  };

  const formatRunDetails = (run) => {
    if (!run?.details || typeof run.details !== 'object') return '';
    return Object.entries(run.details)
      .map(([type, counts]) => `${type}: +${counts.created}/↑${counts.updated}/skip ${counts.skipped}/fail ${counts.failed}`)
      .join(' · ');
  };

  const runSync = async (types, busyKey = 'all') => {
    setSyncing(true);
    setSyncingType(busyKey);
    try {
      const result = await erpIntegrationService.syncSapB1(types?.length ? types : undefined);
      applyConnection(result.connection);
      setLastRun(result.run);
      const detail = formatRunDetails(result.run);
      toast.success(
        detail
          ? `${t('integrations.sap_b1.syncOk', {
              created: result.run.created,
              updated: result.run.updated,
              skipped: result.run.skipped,
              failed: result.run.failed,
            })} (${detail})`
          : t('integrations.sap_b1.syncOk', {
              created: result.run.created,
              updated: result.run.updated,
              skipped: result.run.skipped,
              failed: result.run.failed,
            })
      );
      onChanged?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('integrations.sap_b1.syncError');
      toast.error(msg);
      console.error(LOG_PREFIX, 'sync failed', msg);
    } finally {
      setSyncing(false);
      setSyncingType(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await erpIntegrationService.getSapB1();
      applyConnection(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('integrations.sap_b1.loadError');
      toast.error(msg);
      console.error(LOG_PREFIX, 'load failed', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!form.service_layer_url.trim() || !form.company_db.trim() || !form.username.trim()) {
      toast.error(t('integrations.sap_b1.requiredFields'));
      return null;
    }
    if (!hasPassword && !form.password.trim()) {
      toast.error(t('integrations.sap_b1.passwordRequired'));
      return null;
    }

    setSaving(true);
    try {
      const body = {
        service_layer_url: form.service_layer_url.trim(),
        company_db: form.company_db.trim(),
        username: form.username.trim(),
        language: form.language.trim() || undefined,
      };
      if (form.password.trim()) {
        body.password = form.password.trim();
      }
      const data = await erpIntegrationService.saveSapB1(body);
      applyConnection(data);
      toast.success(t('integrations.sap_b1.saved'));
      onChanged?.();
      return data;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.sap_b1.saveError'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const saved = await save();
      if (!saved && !hasPassword) {
        return;
      }
      const result = await erpIntegrationService.testSapB1();
      applyConnection(result.connection);
      setConnectBanner('success');
      toast.success(result.message || t('integrations.sap_b1.testOk'));
      onChanged?.();
    } catch (err) {
      setConnectBanner('error');
      const msg = err instanceof ApiError ? err.message : t('integrations.sap_b1.testError');
      setLastError(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      await erpIntegrationService.disconnectSapB1();
      setForm(emptyForm);
      setConnected(false);
      setHasPassword(false);
      setStatus('disconnected');
      setLastRun(null);
      setLastError(null);
      setConnectBanner(null);
      toast.success(t('integrations.sap_b1.disconnected'));
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.sap_b1.disconnectError'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: `1px solid ${T.bd}`,
    background: T.sf,
    color: T.t1,
    fontSize: 13,
    width: '100%',
  };

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: T.t3, paddingTop: 12 }}>
        {t('loading') || 'Loading…'}
      </div>
    );
  }

  const canSync = connected && hasPassword;

  return (
    <div className="pt-3 space-y-3">
      {connectBanner === 'success' && connected && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-lg"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: 12, color: '#065F46' }}
        >
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            {t('integrations.sap_b1.connectSuccessBanner')}
            {form.company_db ? ` — ${form.company_db}` : ''}
          </span>
        </div>
      )}

      {(connectBanner === 'error' || (lastError && !connected)) && lastError && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-lg"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#991B1B' }}
        >
          <XCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>{t('integrations.sap_b1.connectFailedBanner')}: </strong>
            <span style={{ whiteSpace: 'pre-line' }}>{lastError}</span>
          </span>
        </div>
      )}

      <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>{t('integrations.sap_b1.help')}</p>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.sap_b1.serviceLayerUrl')}
        </span>
        <input
          type="url"
          value={form.service_layer_url}
          onChange={(e) => setForm({ ...form, service_layer_url: e.target.value })}
          placeholder="https://your-host:50000/b1s/v1"
          className="px-3 py-2 rounded-lg outline-none"
          style={inputStyle}
        />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.sap_b1.companyDb')}
        </span>
        <input
          type="text"
          value={form.company_db}
          onChange={(e) => setForm({ ...form, company_db: e.target.value })}
          className="px-3 py-2 rounded-lg outline-none"
          style={inputStyle}
        />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.sap_b1.username')}
        </span>
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="px-3 py-2 rounded-lg outline-none"
          style={inputStyle}
          autoComplete="username"
        />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.sap_b1.password')}
          {hasPassword ? ` ${t('integrations.sap_b1.passwordSaved')}` : ''}
        </span>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 rounded-lg outline-none pr-10"
            style={inputStyle}
            autoComplete="new-password"
            placeholder={hasPassword ? '••••••••' : ''}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer p-1"
            style={{ color: T.t3 }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>

      {lastError && connected && (
        <div style={{ fontSize: 12, color: '#B45309' }}>{lastError}</div>
      )}

      {lastRun && (
        <div style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.lastSync')}: {lastRun.finished_at ? new Date(lastRun.finished_at).toLocaleString() : '—'}
          {' · '}
          {(lastRun.entity_types || []).join(', ') || 'orders'}
          {' · '}
          {t('integrations.sap_b1.runSummary', {
            created: lastRun.created,
            updated: lastRun.updated,
            skipped: lastRun.skipped,
            failed: lastRun.failed,
          })}
          {formatRunDetails(lastRun) ? (
            <div style={{ marginTop: 4 }}>{formatRunDetails(lastRun)}</div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12, opacity: saving ? 0.7 : 1 }}
        >
          {t('integrations.sap_b1.save')}
        </button>
        <button
          type="button"
          disabled={testing || saving}
          onClick={test}
          className="px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1, fontSize: 12, opacity: testing ? 0.7 : 1 }}
        >
          {t('integrations.sap_b1.test')}
        </button>
        {status !== 'disconnected' && hasPassword && (
          <button
            type="button"
            disabled={saving || syncing}
            onClick={disconnect}
            className="px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
            style={{ background: 'transparent', border: `1px solid ${T.bd}`, color: T.t3, fontSize: 12 }}
          >
            {t('integrations.sap_b1.disconnect')}
          </button>
        )}
      </div>

      {canSync && (
        <div>
          <div className="font-semibold mb-1.5" style={{ fontSize: 11, color: T.t3 }}>
            {t('integrations.sap_b1.syncModules')}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'items', types: ['items'], labelKey: 'integrations.sap_b1.syncProducts' },
              { key: 'customers', types: ['customers'], labelKey: 'integrations.sap_b1.syncPartners' },
              { key: 'locations', types: ['locations'], labelKey: 'integrations.sap_b1.syncLocations' },
              { key: 'orders', types: ['orders'], labelKey: 'integrations.sap_b1.syncOrders' },
              { key: 'all', types: undefined, labelKey: 'integrations.sap_b1.syncAll' },
            ].map((btn) => {
              const busy = syncing && syncingType === btn.key;
              return (
                <button
                  key={btn.key}
                  type="button"
                  disabled={syncing || !canSync}
                  onClick={() => runSync(btn.types, btn.key)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
                  style={{
                    background: btn.key === 'all' ? T.ac : T.sa,
                    color: btn.key === 'all' ? '#fff' : T.t1,
                    border: `1px solid ${btn.key === 'all' ? T.ac : T.bd}`,
                    fontSize: 12,
                    opacity: syncing || !canSync ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={12} className={busy ? 'animate-spin' : undefined} />
                  {busy ? t('integrations.sap_b1.syncing') : t(btn.labelKey)}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: T.t3, marginTop: 6, lineHeight: 1.4 }}>
            {t('integrations.sap_b1.syncModulesHint')}
          </p>
        </div>
      )}
    </div>
  );
}
