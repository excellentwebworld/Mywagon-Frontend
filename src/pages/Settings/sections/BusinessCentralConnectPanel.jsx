import { useEffect, useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { erpIntegrationService } from '../../../api/services/erpIntegrationService';
import { ApiError } from '../../../api';

const emptyForm = {
  tenant_id: '',
  environment: 'Sandbox',
  company_id: '',
  company_name: '',
  client_id: '',
  client_secret: '',
};

export default function BusinessCentralConnectPanel({ T, t, toast, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [hasSecret, setHasSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [lastError, setLastError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [companies, setCompanies] = useState([]);

  const applyConnection = (data, nextCompanies) => {
    setForm({
      tenant_id: data.settings?.tenant_id || '',
      environment: data.settings?.environment || 'Sandbox',
      company_id: data.settings?.company_id || '',
      company_name: data.settings?.company_name || '',
      client_id: data.settings?.client_id || '',
      client_secret: '',
    });
    setHasSecret(!!data.settings?.has_client_secret);
    setStatus(data.status || 'disconnected');
    setLastError(data.last_error);
    setLastRun(data.last_run);
    if (nextCompanies) setCompanies(nextCompanies);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await erpIntegrationService.getBusinessCentral();
      applyConnection(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.bc.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        tenant_id: form.tenant_id.trim(),
        environment: form.environment.trim(),
        company_id: form.company_id.trim() || undefined,
        company_name: form.company_name.trim() || undefined,
        client_id: form.client_id.trim(),
      };
      if (form.client_secret.trim()) {
        payload.client_secret = form.client_secret.trim();
      }
      const data = await erpIntegrationService.saveBusinessCentral(payload);
      applyConnection(data);
      toast.success(t('integrations.bc.saved'));
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.bc.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const result = await erpIntegrationService.testBusinessCentral();
      applyConnection(result.connection, result.companies || []);
      toast.success(result.message || t('integrations.bc.testOk'));
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.bc.testError'));
    } finally {
      setTesting(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await erpIntegrationService.syncBusinessCentral();
      applyConnection(result.connection);
      setLastRun(result.run);
      toast.success(
        t('integrations.bc.syncOk', {
          created: result.run.created,
          updated: result.run.updated,
          skipped: result.run.skipped,
          failed: result.run.failed,
        })
      );
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.bc.syncError'));
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      await erpIntegrationService.disconnectBusinessCentral();
      setForm(emptyForm);
      setHasSecret(false);
      setStatus('disconnected');
      setLastRun(null);
      setLastError(null);
      setCompanies([]);
      toast.success(t('integrations.bc.disconnected'));
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.bc.disconnectError'));
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
    return <div style={{ fontSize: 12, color: T.t3, paddingTop: 12 }}>{t('loading') || 'Loading…'}</div>;
  }

  return (
    <div className="pt-3 space-y-3">
      <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>{t('integrations.bc.help')}</p>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.tenantId')}</span>
        <input value={form.tenant_id} onChange={(e) => setField('tenant_id', e.target.value)}
          className="px-3 py-2 rounded-lg outline-none" style={inputStyle} />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.environment')}</span>
        <select value={form.environment} onChange={(e) => setField('environment', e.target.value)}
          className="px-3 py-2 rounded-lg outline-none cursor-pointer" style={inputStyle}>
          <option value="Sandbox">Sandbox</option>
          <option value="Production">Production</option>
        </select>
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.companyId')}</span>
        <input value={form.company_id} onChange={(e) => setField('company_id', e.target.value)}
          className="px-3 py-2 rounded-lg outline-none" style={inputStyle} />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.clientId')}</span>
        <input value={form.client_id} onChange={(e) => setField('client_id', e.target.value)}
          className="px-3 py-2 rounded-lg outline-none" style={inputStyle} />
      </label>

      <label className="block">
        <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.bc.clientSecret')} {hasSecret ? t('integrations.bc.secretSaved') : ''}
        </span>
        <div className="relative">
          <input type={showSecret ? 'text' : 'password'} value={form.client_secret}
            onChange={(e) => setField('client_secret', e.target.value)}
            placeholder={hasSecret ? '••••••••' : ''}
            className="px-3 py-2 rounded-lg outline-none pr-9" style={inputStyle} />
          <button type="button" onClick={() => setShowSecret((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer p-0"
            style={{ color: T.t3 }}>
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>

      {companies.length > 0 && (
        <label className="block">
          <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.companies')}</span>
          <select value={form.company_id} onChange={(e) => {
            const id = e.target.value;
            const match = companies.find((c) => c.id === id);
            setForm((prev) => ({ ...prev, company_id: id, company_name: match?.name || prev.company_name }));
          }} className="px-3 py-2 rounded-lg outline-none cursor-pointer" style={inputStyle}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
            ))}
          </select>
        </label>
      )}

      {lastError && (
        <div style={{ fontSize: 12, color: '#B45309' }}>{lastError}</div>
      )}

      {lastRun && (
        <div style={{ fontSize: 11, color: T.t3 }}>
          {t('integrations.lastSync')}: {lastRun.finished_at ? new Date(lastRun.finished_at).toLocaleString() : '—'}
          {' · '}
          {t('integrations.bc.runSummary', {
            created: lastRun.created,
            updated: lastRun.updated,
            skipped: lastRun.skipped,
            failed: lastRun.failed,
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" disabled={saving} onClick={save}
          className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12, opacity: saving ? 0.7 : 1 }}>
          {t('integrations.bc.save')}
        </button>
        <button type="button" disabled={testing || !hasSecret} onClick={test}
          className="px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1, fontSize: 12, opacity: testing ? 0.7 : 1 }}>
          {t('integrations.bc.test')}
        </button>
        <button type="button" disabled={syncing || !hasSecret} onClick={sync}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1, fontSize: 12, opacity: syncing ? 0.7 : 1 }}>
          <RefreshCw size={12} /> {t('integrations.bc.syncNow')}
        </button>
        {status !== 'disconnected' && (
          <button type="button" disabled={saving} onClick={disconnect}
            className="px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
            style={{ background: 'transparent', border: `1px solid ${T.bd}`, color: T.t3, fontSize: 12 }}>
            {t('integrations.bc.disconnect')}
          </button>
        )}
      </div>
    </div>
  );
}
