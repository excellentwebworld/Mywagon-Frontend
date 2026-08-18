import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { erpIntegrationService } from '../../../api/services/erpIntegrationService';
import { ApiError } from '../../../api';

const emptyForm = {
  environment: 'Production',
  company_id: '',
  company_name: '',
};

const LOG_PREFIX = '[BC Connect]';

function parseMicrosoftError(rawDesc) {
  if (!rawDesc) return '';
  return decodeURIComponent(rawDesc.replace(/\+/g, ' ')).split('Trace ID:')[0].trim();
}

function isUnmanagedTenantError(message) {
  return /AADSTS650051|unmanaged state/i.test(message);
}

function clearBcOauthSessionKeys() {
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith('bc_oauth_')) sessionStorage.removeItem(key);
  });
}

export default function BusinessCentralConnectPanel({ T, t, toast, onChanged }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthHandled = useRef(false);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [lastError, setLastError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [connectBanner, setConnectBanner] = useState(null);

  const applyConnection = (data, nextCompanies) => {
    const hasTokens = !!data.settings?.has_client_secret;
    setForm({
      environment: data.settings?.environment || 'Production',
      company_id: data.settings?.company_id || '',
      company_name: data.settings?.company_name || '',
    });
    setOauthConfigured(!!data.settings?.oauth_configured);
    setConnected(hasTokens && data.status !== 'disconnected');
    setStatus(data.status || 'disconnected');
    setLastError(data.last_error);
    setLastRun(data.last_run);
    if (nextCompanies) setCompanies(nextCompanies);
    if (hasTokens && data.status !== 'disconnected' && !data.last_error) {
      setConnectBanner('success');
    }
  };

  const clearOauthQuery = () => {
    navigate({ pathname: '/settings/integrations', search: '' }, { replace: true });
    if (window.location.hash) {
      window.history.replaceState(null, '', '/settings/integrations');
    }
  };

  const showConnectSuccess = (connection, companiesList) => {
    const company = connection?.settings?.company_name;
    const message = company
      ? t('integrations.bc.oauthConnectSuccess', { company })
      : t('integrations.bc.oauthConnectSuccessNoCompany');
    console.info(LOG_PREFIX, 'connect success', { company, companies: companiesList?.length ?? 0 });
    setConnectBanner('success');
    setLastError(null);
    toast.success(message);
  };

  const showConnectFailure = (message, source = 'unknown') => {
    const text = message || t('integrations.bc.oauthError');
    console.error(LOG_PREFIX, 'connect failed', { source, message: text });
    setConnectBanner('error');
    setLastError(text);
    toast.error(t('integrations.bc.oauthConnectFailed', { message: text }));
  };

  const syncOrders = async (connectionSnapshot) => {
    const companyId = connectionSnapshot?.settings?.company_id || form.company_id;
    if (!companyId) return;
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
      const msg = err instanceof ApiError ? err.message : t('integrations.bc.syncError');
      toast.error(msg);
      console.error(LOG_PREFIX, 'sync failed', msg);
    } finally {
      setSyncing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await erpIntegrationService.getBusinessCentral();
      applyConnection(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('integrations.bc.loadError');
      toast.error(msg);
      console.error(LOG_PREFIX, 'load failed', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');
    const handleKey = (code && state)
      ? `bc_oauth_handled:${state}`
      : (oauthError ? `bc_oauth_error:${oauthError}` : null);

    if (oauthHandled.current || (handleKey && sessionStorage.getItem(handleKey))) {
      load();
      return;
    }

    if (oauthError) {
      oauthHandled.current = true;
      if (handleKey) sessionStorage.setItem(handleKey, '1');
      const microsoftMessage = parseMicrosoftError(searchParams.get('error_description'));
      const failMessage = oauthError === 'access_denied'
        ? t('integrations.bc.oauthDenied')
        : microsoftMessage || t('integrations.bc.oauthError');
      console.error(LOG_PREFIX, 'microsoft oauth error', { error: oauthError, message: failMessage });
      setConnectBanner('error');
      setLastError(
        isUnmanagedTenantError(failMessage)
          ? `${failMessage}\n\n${t('integrations.bc.oauthUnmanagedTenant')}`
          : failMessage
      );
      toast.error(
        oauthError === 'access_denied'
          ? failMessage
          : t('integrations.bc.oauthMicrosoftRejected', { message: failMessage })
      );
      clearOauthQuery();
      load();
      return;
    }

    if (code && state) {
      oauthHandled.current = true;
      if (handleKey) sessionStorage.setItem(handleKey, '1');
      setConnecting(true);
      setLoading(true);
      console.info(LOG_PREFIX, 'completing oauth callback');
      (async () => {
        try {
          const result = await erpIntegrationService.completeBusinessCentralOAuth(code, state);
          applyConnection(result.connection, result.companies || []);
          showConnectSuccess(result.connection, result.companies);
          onChanged?.();
          clearOauthQuery();
          if (result.connection?.settings?.company_id) {
            await syncOrders(result.connection);
          }
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : t('integrations.bc.oauthError');
          showConnectFailure(msg, 'callback');
          clearOauthQuery();
          await load();
        } finally {
          setConnecting(false);
          setLoading(false);
        }
      })();
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectMicrosoft = async () => {
    setConnecting(true);
    setConnectBanner(null);
    setLastError(null);
    clearBcOauthSessionKeys();
    oauthHandled.current = false;
    try {
      const data = await erpIntegrationService.startBusinessCentralOAuth();
      if (!data.authorize_url) {
        const msg = t('integrations.bc.oauthNotConfigured');
        showConnectFailure(msg, 'start');
        setConnecting(false);
        return;
      }
      console.info(LOG_PREFIX, 'redirecting to microsoft');
      toast.info(t('integrations.bc.oauthOpeningMicrosoft'));
      window.location.assign(data.authorize_url);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('integrations.bc.oauthStartError');
      showConnectFailure(msg, 'start');
      setConnecting(false);
    }
  };

  const saveSettings = async (nextForm = form) => {
    setSaving(true);
    try {
      const data = await erpIntegrationService.saveBusinessCentralSettings({
        environment: nextForm.environment.trim(),
        company_id: nextForm.company_id.trim() || undefined,
        company_name: nextForm.company_name.trim() || undefined,
      });
      applyConnection(data);
      toast.success(t('integrations.bc.saved'));
      onChanged?.();
      return data;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('integrations.bc.saveError'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await erpIntegrationService.saveBusinessCentralSettings({
        environment: form.environment.trim(),
        company_id: form.company_id.trim() || undefined,
        company_name: form.company_name.trim() || undefined,
      });
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

  const disconnect = async () => {
    setSaving(true);
    try {
      await erpIntegrationService.disconnectBusinessCentral();
      setForm(emptyForm);
      setConnected(false);
      setStatus('disconnected');
      setLastRun(null);
      setLastError(null);
      setCompanies([]);
      setConnectBanner(null);
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
    return (
      <div style={{ fontSize: 12, color: T.t3, paddingTop: 12 }}>
        {connecting ? t('integrations.bc.oauthRedirecting') : (t('loading') || 'Loading…')}
      </div>
    );
  }

  const canSync = connected && !!form.company_id;

  return (
    <div className="pt-3 space-y-3">
      {connectBanner === 'success' && connected && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-lg"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: 12, color: '#065F46' }}
        >
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            {t('integrations.bc.connectSuccessBanner')}
            {form.company_name ? ` — ${form.company_name}` : ''}
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
            <strong>{t('integrations.bc.connectFailedBanner')}: </strong>
            <span style={{ whiteSpace: 'pre-line' }}>{lastError}</span>
          </span>
        </div>
      )}

      <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>{t('integrations.bc.helpOauth')}</p>

      {!connected && (
        <>
          {!oauthConfigured && (
            <div style={{ fontSize: 12, color: '#B45309' }}>{t('integrations.bc.oauthNotConfigured')}</div>
          )}
          <button
            type="button"
            disabled={connecting || !oauthConfigured}
            onClick={connectMicrosoft}
            className="px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.ac, color: '#fff', fontSize: 12, opacity: connecting || !oauthConfigured ? 0.7 : 1 }}
          >
            {connecting ? t('integrations.bc.oauthRedirecting') : t('integrations.bc.connectMicrosoft')}
          </button>
        </>
      )}

      {connected && (
        <>
          <p style={{ fontSize: 12, color: T.t2 }}>{t('integrations.bc.connectedAsTenant')}</p>

          <label className="block">
            <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.environment')}</span>
            <select
              value={form.environment}
              onChange={async (e) => {
                const next = { ...form, environment: e.target.value, company_id: '', company_name: '' };
                setForm(next);
                setCompanies([]);
                await saveSettings(next);
              }}
              className="px-3 py-2 rounded-lg outline-none cursor-pointer"
              style={inputStyle}
            >
              <option value="Production">Production</option>
              <option value="Sandbox">Sandbox</option>
            </select>
          </label>

          {companies.length > 0 ? (
            <label className="block">
              <span className="font-semibold block mb-1" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.bc.companies')}</span>
              <select
                value={form.company_id}
                onChange={async (e) => {
                  const id = e.target.value;
                  const match = companies.find((c) => c.id === id);
                  const next = { ...form, company_id: id, company_name: match?.name || '' };
                  setForm(next);
                  const saved = await saveSettings(next);
                  if (saved && id) await syncOrders(saved);
                }}
                className="px-3 py-2 rounded-lg outline-none cursor-pointer"
                style={inputStyle}
              >
                <option value="">{t('integrations.bc.selectCompany')}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <p style={{ fontSize: 12, color: T.t3 }}>{t('integrations.bc.loadCompaniesHint')}</p>
          )}

          {form.company_name && companies.length === 0 && (
            <div style={{ fontSize: 12, color: T.t2 }}>
              {t('integrations.bc.companies')}: {form.company_name}
            </div>
          )}
        </>
      )}

      {lastError && connected && (
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

      {connected && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={testing}
            onClick={test}
            className="px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
            style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t1, fontSize: 12, opacity: testing ? 0.7 : 1 }}
          >
            {t('integrations.bc.test')}
          </button>
          <button
            type="button"
            disabled={syncing || !canSync}
            onClick={() => syncOrders()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
            style={{ background: T.ac, color: '#fff', fontSize: 12, opacity: syncing || !canSync ? 0.7 : 1 }}
          >
            <RefreshCw size={12} /> {t('integrations.bc.syncNow')}
          </button>
          {status !== 'disconnected' && (
            <button
              type="button"
              disabled={saving}
              onClick={disconnect}
              className="px-3 py-1.5 rounded-lg cursor-pointer font-semibold"
              style={{ background: 'transparent', border: `1px solid ${T.bd}`, color: T.t3, fontSize: 12 }}
            >
              {t('integrations.bc.disconnect')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
