/**
 * IntegrationsSection — v2  Integration hub with 4 tabs.
 *
 * Tab 1: Directory — connector cards with descriptions, data type chips, status badges
 * Tab 2: API & Webhooks — API keys with usage stats, webhook endpoints
 * Tab 3: Data Flow Monitor — clean health table (no emojis), sync stats
 * Tab 4: Usage & Charges — API call billing, cost breakdown, billing history
 *
 * Used by roles: Shipper, Forwarder (org admins only)
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Zap, Code, Activity, X, Plus, Copy, Trash2,
  RefreshCw, Pause, Play, ExternalLink, ChevronRight, Check,
  AlertTriangle, CheckCircle, Clock, CreditCard, ArrowUpRight,
  ArrowDownRight, ArrowLeftRight, Eye, EyeOff, Shield, Info,
  TrendingUp, DollarSign,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { toUpperGreek } from '../../../utils/greekUppercase';
import {
  CONNECTORS, CONNECTOR_CATEGORIES, API_KEYS, WEBHOOKS,
  DATA_FLOW_HEALTH, SYNC_STATS, INTEGRATION_USAGE,
} from '../../../mocks/toolsData';
import { erpIntegrationService } from '../../../api/services/erpIntegrationService';
import BusinessCentralConnectPanel from './BusinessCentralConnectPanel';

const TABS = [
  { id: 'directory', icon: Zap, labelKey: 'integrations.tabs.directory' },
  { id: 'api', icon: Code, labelKey: 'integrations.tabs.api' },
  { id: 'monitor', icon: Activity, labelKey: 'integrations.tabs.monitor' },
  { id: 'usage', icon: CreditCard, labelKey: 'integrations.tabs.usage' },
];

export default function IntegrationsSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const isGreek = i18n.language === 'el';

  const [tab, setTab] = useState('directory');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [connectors, setConnectors] = useState(CONNECTORS.map((c) => (
    c.id === 'business_central' ? c : { ...c, status: 'coming_soon' }
  )));

  const loadCatalog = useCallback(async () => {
    try {
      const items = await erpIntegrationService.listConnections();
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const statusMap = {
        disconnected: 'not_connected',
        connected: 'connected',
        error: 'error',
        coming_soon: 'coming_soon',
      };
      setConnectors(CONNECTORS.map((c) => {
        const api = byId[c.id];
        if (!api) {
          return { ...c, status: 'coming_soon' };
        }
        return {
          ...c,
          name: api.name || c.name,
          status: statusMap[api.status] || 'not_connected',
          lastSync: api.last_synced_at,
          dataTypes: api.data_types?.length ? api.data_types : c.dataTypes,
          syncDirection: api.sync_direction || c.syncDirection,
          errorCount: api.last_error ? 1 : 0,
          description: api.description || c.description,
        };
      }));
    } catch {
      setConnectors(CONNECTORS.map((c) => (
        c.id === 'business_central' ? { ...c, status: 'not_connected' } : { ...c, status: 'coming_soon' }
      )));
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // ─── Directory Tab ───
  const connected = connectors.filter(c => ['connected', 'error', 'syncing'].includes(c.status));
  const filtered = useMemo(() => {
    let list = connectors;
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)); }
    if (catFilter) list = list.filter(c => c.category === catFilter);
    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    return list;
  }, [search, catFilter, statusFilter, connectors]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.filter(c => !['connected', 'error', 'syncing'].includes(c.status)).forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [filtered]);

  const tUp = (key) => isGreek ? toUpperGreek(t(key)) : t(key);

  return (
    <div>
      <h2 className="font-bold mb-1" style={{ fontSize: 18, color: T.t1 }}>{t('integrations.title')}</h2>
      <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>{t('integrations.subtitle')}</p>

      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto mb-5" style={{ borderBottom: `2px solid ${T.bd}` }}>
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 shrink-0 cursor-pointer border-none"
              style={{ background: 'transparent', fontSize: 13, fontWeight: active ? 600 : 500, color: active ? T.ac : T.t3, borderBottom: `2px solid ${active ? T.ac : 'transparent'}`, marginBottom: -2, transition: 'color 0.15s' }}>
              <Icon size={15} />
              <span>{tUp(labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ Tab 1: Directory ═══ */}
      {tab === 'directory' && <DirectoryTab T={T} t={t} tUp={tUp} toast={toast}
        search={search} setSearch={setSearch} catFilter={catFilter} setCatFilter={setCatFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        connected={connected} filtered={filtered} grouped={grouped}
        expandedKey={expandedKey} setExpandedKey={setExpandedKey}
        onCatalogChanged={loadCatalog} />}

      {/* ═══ Tab 2: API & Webhooks ═══ */}
      {tab === 'api' && <ApiTab T={T} t={t} tUp={tUp} toast={toast} />}

      {/* ═══ Tab 3: Data Flow Monitor ═══ */}
      {tab === 'monitor' && <MonitorTab T={T} t={t} tUp={tUp} />}

      {/* ═══ Tab 4: Usage & Charges ═══ */}
      {tab === 'usage' && <UsageTab T={T} t={t} tUp={tUp} />}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 1: Directory
   ═══════════════════════════════════════════ */
function DirectoryTab({ T, t, tUp, toast, search, setSearch, catFilter, setCatFilter, statusFilter, setStatusFilter, connected, filtered, grouped, expandedKey, setExpandedKey, onCatalogChanged }) {
  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('integrations.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 rounded-lg outline-none"
            style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }} />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg outline-none cursor-pointer"
          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}>
          <option value="">{t('integrations.allCategories')}</option>
          {CONNECTOR_CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(c.labelKey)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg outline-none cursor-pointer"
          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}>
          <option value="">{t('integrations.allStatuses')}</option>
          <option value="connected">{t('integrations.status.connected')}</option>
          <option value="not_connected">{t('integrations.status.notConnected')}</option>
          <option value="error">{t('integrations.status.error')}</option>
        </select>
        {(search || catFilter || statusFilter) && (
          <button onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); }}
            className="flex items-center gap-1 cursor-pointer border-none bg-transparent px-2 py-1 rounded-lg"
            style={{ color: T.t3, fontSize: 12 }}>
            <X size={12} /> {t('integrations.clear')}
          </button>
        )}
      </div>

      {/* Connected integrations */}
      {connected.length > 0 && !catFilter && !statusFilter && (
        <div className="mb-6">
          <div className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: 13, color: T.t1 }}>
            <CheckCircle size={14} style={{ color: '#10B981' }} />
            {t('integrations.connected')} ({connected.length})
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {connected.map(c => <ConnectorCard key={c.id} connector={c} T={T} t={t} toast={toast}
              expanded={expandedKey === c.id} onToggle={() => setExpandedKey(expandedKey === c.id ? null : c.id)}
              onCatalogChanged={onCatalogChanged} />)}
          </div>
        </div>
      )}

      {/* By category */}
      {CONNECTOR_CATEGORIES.map(cat => {
        const items = grouped[cat.key];
        if (!items?.length) return null;
        return (
          <div key={cat.key} className="mb-6">
            <div className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: 13, color: T.t1 }}>
              <span style={{ fontSize: 15 }}>{cat.icon}</span>
              {t(cat.labelKey)}
              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: T.sa, color: T.t3 }}>{items.length}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map(c => <ConnectorCard key={c.id} connector={c} T={T} t={t} toast={toast}
                expanded={expandedKey === c.id} onToggle={() => setExpandedKey(expandedKey === c.id ? null : c.id)}
                onCatalogChanged={onCatalogChanged} />)}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search size={32} style={{ color: T.t3, margin: '0 auto 8px' }} />
          <div className="font-semibold" style={{ fontSize: 14, color: T.t2 }}>{t('common.noResults')}</div>
          <div style={{ fontSize: 12, color: T.t3 }}>{t('integrations.searchPlaceholder')}</div>
        </div>
      )}
    </div>
  );
}


/* ── ConnectorCard — with description, data types, expandable details ── */
function ConnectorCard({ connector: c, T, t, toast, expanded, onToggle, onCatalogChanged }) {
  const isBc = c.id === 'business_central';
  const isActive = ['connected', 'error', 'syncing'].includes(c.status);
  const statusConfig = {
    connected: { color: '#10B981', bg: '#ECFDF5', darkBg: '#064E3B', label: t('integrations.status.connected'), Icon: CheckCircle },
    error: { color: '#F59E0B', bg: '#FFFBEB', darkBg: '#78350F', label: t('integrations.status.error'), Icon: AlertTriangle },
    syncing: { color: '#3B82F6', bg: '#EFF6FF', darkBg: '#1E3A5F', label: t('integrations.status.syncing'), Icon: RefreshCw },
    not_connected: { color: '#9CA3AF', bg: T.sa, darkBg: T.sa, label: t('integrations.status.notConnected'), Icon: null },
    coming_soon: { color: '#9CA3AF', bg: T.sa, darkBg: T.sa, label: t('integrations.comingSoon'), Icon: Clock },
  };
  const cfg = statusConfig[c.status] || statusConfig.not_connected;
  const StatusIcon = cfg.Icon;

  const syncDirLabel = { inbound: t('integrations.syncDir.inbound'), outbound: t('integrations.syncDir.outbound'), bidirectional: t('integrations.syncDir.bidirectional') };
  const syncDirIcon = { inbound: ArrowDownRight, outbound: ArrowUpRight, bidirectional: ArrowLeftRight };
  const SyncIcon = c.syncDirection ? syncDirIcon[c.syncDirection] : null;

  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: T.sf,
        border: `1px solid ${c.status === 'error' ? '#FDE68A' : expanded ? T.ac + '60' : T.bd}`,
        boxShadow: expanded ? `0 4px 16px ${T.ac}15` : 'none',
      }}>
      {/* Header — always visible */}
      <div className="px-4 py-3.5 cursor-pointer" onClick={onToggle}
        style={{ transition: 'background 0.15s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 24, lineHeight: 1 }}>{c.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-bold truncate" style={{ fontSize: 14, color: T.t1 }}>{c.name}</span>
              {c.region === 'GR' && <span style={{ fontSize: 12 }}>🇬🇷</span>}
              {c.featured && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 8, fontWeight: 700, background: T.al, color: T.ac }}>{t('integrations.featured')}</span>}
            </div>
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                {StatusIcon && <StatusIcon size={10} />}
                {cfg.label}
                {c.errorCount > 0 && ` (${c.errorCount})`}
              </span>
              {isActive && SyncIcon && (
                <span className="inline-flex items-center gap-1" style={{ fontSize: 10, color: T.t3 }}>
                  <SyncIcon size={10} />
                  {syncDirLabel[c.syncDirection]}
                </span>
              )}
            </div>
          </div>
          {/* Action */}
          {c.status === 'not_connected' && (
            <button onClick={(e) => { e.stopPropagation(); if (isBc) onToggle(); else toast.info(t('integrations.connectMock')); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold shrink-0 transition-transform duration-200 hover:-translate-y-px"
              style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
              {t('integrations.connect')}
            </button>
          )}
          {isActive && (
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none shrink-0"
              style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
              {t('integrations.configure')} <ChevronRight size={10} />
            </button>
          )}
          {c.status === 'coming_soon' && (
            <span className="px-2 py-1 rounded-lg shrink-0" style={{ fontSize: 10, color: T.t3, background: T.sa, border: `1px solid ${T.bd}` }}>
              {t('integrations.comingSoon')}
            </span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${T.bd}` }}>
          <div className="pt-3">
            {/* Description */}
            {c.description && (
              <p className="mb-3" style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}>{c.description}</p>
            )}

            {/* Data types */}
            {c.dataTypes?.length > 0 && (
              <div className="mb-3">
                <span className="font-semibold block mb-1.5" style={{ fontSize: 11, color: T.t3 }}>{t('integrations.dataTypes')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {c.dataTypes.map(dt => (
                    <span key={dt} className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 500, background: T.al, color: T.ac, border: `1px solid ${T.ac}25` }}>
                      {t(`integrations.dtype.${dt}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isBc && expanded && (
              <BusinessCentralConnectPanel T={T} t={t} toast={toast} onChanged={onCatalogChanged} />
            )}

            {/* Last sync + records (connected only) */}
            {!isBc && isActive && c.lastSync && (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1" style={{ fontSize: 11, color: T.t3 }}>
                  <Clock size={10} /> {t('integrations.lastSync')}: {new Date(c.lastSync).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 2: API & Webhooks
   ═══════════════════════════════════════════ */
function ApiTab({ T, t, tUp, toast }) {
  const [showKey, setShowKey] = useState(null);

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <Shield size={15} style={{ color: T.ac }} />
            <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('integrations.api.keysTitle')}</h3>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold transition-transform duration-200 hover:-translate-y-px"
            style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
            <Plus size={12} /> {t('integrations.api.createKey')}
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: T.bd }}>
          {API_KEYS.map(key => (
            <div key={key.id} className="px-5 py-4 transition-colors duration-150"
              onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <div className="flex items-center gap-4 mb-2">
                <Code size={16} style={{ color: T.ac }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ fontSize: 13, color: T.t1 }}>{key.name}</span>
                    <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 700, background: key.env === 'production' ? '#ECFDF5' : '#EFF6FF', color: key.env === 'production' ? '#047857' : '#1D4ED8' }}>
                      {key.env}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code style={{ fontSize: 11, color: T.t3, fontFamily: 'monospace' }}>{showKey === key.id ? 'mv_live_a8f3k2h9w5p1' : key.prefix}</code>
                    <button onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                      className="cursor-pointer border-none bg-transparent p-0.5">
                      {showKey === key.id ? <EyeOff size={11} style={{ color: T.t3 }} /> : <Eye size={11} style={{ color: T.t3 }} />}
                    </button>
                    <button onClick={() => { navigator.clipboard?.writeText(key.prefix); toast.success(t('integrations.api.copied')); }}
                      className="cursor-pointer border-none bg-transparent p-0.5">
                      <Copy size={11} style={{ color: T.t3 }} />
                    </button>
                  </div>
                </div>
                <button className="px-2.5 py-1 rounded-lg cursor-pointer border-none font-semibold" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 11 }}>
                  {t('integrations.api.revoke')}
                </button>
              </div>
              {/* Usage stats row */}
              <div className="flex items-center gap-6 ml-8" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 11, color: T.t3 }}>{t('integrations.api.createdBy')} {key.createdBy}</span>
                <span style={{ fontSize: 11, color: T.t3 }}>{t('integrations.api.today')}: <strong style={{ color: T.t1, fontWeight: 600 }}>{key.requestsToday?.toLocaleString()}</strong> {t('integrations.api.calls')}</span>
                <span style={{ fontSize: 11, color: T.t3 }}>{t('integrations.api.thisMonth')}: <strong style={{ color: T.t1, fontWeight: 600 }}>{key.requestsMonth?.toLocaleString()}</strong> {t('integrations.api.calls')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhooks */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: T.ac }} />
            <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('integrations.webhooks.title')}</h3>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold transition-transform duration-200 hover:-translate-y-px"
            style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
            <Plus size={12} /> {t('integrations.webhooks.add')}
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: T.bd }}>
          {WEBHOOKS.map(wh => {
            const isFailing = wh.status === 'failing';
            return (
              <div key={wh.id} className="px-5 py-4 flex items-start gap-4 transition-colors duration-150"
                style={{ background: isFailing ? '#FEF2F230' : 'transparent' }}
                onMouseEnter={(e) => { if (!isFailing) e.currentTarget.style.background = T.sh; }}
                onMouseLeave={(e) => { if (!isFailing) e.currentTarget.style.background = 'transparent'; }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: isFailing ? '#EF4444' : '#10B981' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold" style={{ fontSize: 13, color: T.t1 }}>{wh.name}</span>
                    {isFailing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 600, background: '#FEF2F2', color: '#EF4444' }}>
                        <AlertTriangle size={9} /> {t('integrations.webhooks.failing')}
                      </span>
                    )}
                  </div>
                  <div className="truncate" style={{ fontSize: 11, color: T.t3, fontFamily: 'monospace' }}>{wh.url}</div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span style={{ fontSize: 11, color: T.t3 }}>{wh.events} {t('integrations.webhooks.events')}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{t('integrations.webhooks.successRateLabel')}: <strong style={{ fontWeight: 600, color: isFailing ? '#EF4444' : '#10B981' }}>{wh.successRate}%</strong></span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{t('integrations.webhooks.lastResponse')}: <strong style={{ fontWeight: 600, color: wh.lastStatus >= 400 ? '#EF4444' : T.t1 }}>{wh.lastStatus}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="p-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                    <RefreshCw size={12} style={{ color: T.t3 }} />
                  </button>
                  <button className="p-1.5 rounded-lg cursor-pointer border-none" style={{ background: '#FEF2F2', border: `1px solid #FECACA` }}>
                    <Trash2 size={12} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Docs card */}
      <div className="rounded-xl p-5 flex items-start gap-4" style={{ background: T.al, border: `1px solid ${T.ac}30` }}>
        <ExternalLink size={18} style={{ color: T.ac, marginTop: 2 }} />
        <div>
          <div className="font-bold mb-1" style={{ fontSize: 14, color: T.ac }}>{t('integrations.api.docsTitle')}</div>
          <div style={{ fontSize: 12, color: T.t2, marginBottom: 4 }}>
            Base URL: <code className="px-1.5 py-0.5 rounded" style={{ fontFamily: 'monospace', background: T.sf, fontSize: 11 }}>https://api.myvagon.com/v1</code>
          </div>
          <div style={{ fontSize: 11, color: T.t3 }}>{t('integrations.api.rateLimits')}</div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 3: Data Flow Monitor
   ═══════════════════════════════════════════ */
function MonitorTab({ T, t, tUp }) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label={t('integrations.monitor.totalEvents')} value={SYNC_STATS.total.toLocaleString()} icon={<Activity size={14} />} T={T} />
        <StatBox label={t('integrations.monitor.successRate')} value={`${SYNC_STATS.successRate}%`} icon={<CheckCircle size={14} />} color="#10B981" T={T} />
        <StatBox label={t('integrations.monitor.warnings')} value={String(SYNC_STATS.warnings)} icon={<AlertTriangle size={14} />} color="#F59E0B" T={T} />
        <StatBox label={t('integrations.monitor.failed')} value={String(SYNC_STATS.failed)} icon={<X size={14} />} color="#EF4444" T={T} />
      </div>

      {/* Health table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <Activity size={14} style={{ color: T.ac }} />
          <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('integrations.monitor.healthTitle')}</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-5 py-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <div className="col-span-3" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.monitor.colSystem')}</div>
          <div className="col-span-2" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.monitor.colDirection')}</div>
          <div className="col-span-2" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.monitor.colStatus')}</div>
          <div className="col-span-2 text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.monitor.colRecords')}</div>
          <div className="col-span-3 text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.monitor.colLastSync')}</div>
        </div>

        {/* Rows */}
        {DATA_FLOW_HEALTH.map((row, i) => {
          const statusCfg = {
            ok: { color: '#10B981', bg: '#ECFDF5', label: t('integrations.monitor.statusOk'), Icon: CheckCircle },
            error: { color: '#F59E0B', bg: '#FFFBEB', label: `${row.errors} ${t('integrations.monitor.statusErrors')}`, Icon: AlertTriangle },
            failing: { color: '#EF4444', bg: '#FEF2F2', label: `${row.errors} ${t('integrations.monitor.statusFailed')}`, Icon: X },
          };
          const st = statusCfg[row.status] || statusCfg.ok;
          const DirIcon = row.direction === '↔' ? ArrowLeftRight : row.direction === '←' ? ArrowDownRight : ArrowUpRight;

          return (
            <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 items-center transition-colors duration-150"
              style={{ borderBottom: i < DATA_FLOW_HEALTH.length - 1 ? `1px solid ${T.bd}` : 'none', background: T.sf }}
              onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
              onMouseLeave={(e) => e.currentTarget.style.background = T.sf}>
              <div className="col-span-3 font-semibold" style={{ fontSize: 13, color: T.t1 }}>{row.system}</div>
              <div className="col-span-2 flex items-center gap-1.5">
                <DirIcon size={12} style={{ color: T.t3 }} />
                <span style={{ fontSize: 12, color: T.t2 }}>
                  {row.direction === '↔' ? t('integrations.syncDir.bidirectional') : row.direction === '←' ? t('integrations.syncDir.inbound') : t('integrations.syncDir.outbound')}
                </span>
              </div>
              <div className="col-span-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: st.bg, color: st.color }}>
                  <st.Icon size={10} /> {st.label}
                </span>
              </div>
              <div className="col-span-2 text-right" style={{ fontSize: 12, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>
                {row.records?.toLocaleString()}
              </div>
              <div className="col-span-3 text-right" style={{ fontSize: 12, color: T.t3 }}>
                {row.lastSync}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 4: Usage & Charges
   ═══════════════════════════════════════════ */
function UsageTab({ T, t, tUp }) {
  const u = INTEGRATION_USAGE;

  return (
    <div className="space-y-6">
      {/* Current period summary */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div className="flex items-center gap-2">
            <DollarSign size={15} style={{ color: T.ac }} />
            <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('integrations.usage.currentPeriod')}</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: T.al, color: T.ac }}>
            {u.currentPlan} {t('integrations.usage.plan')}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontSize: 12, color: T.t3 }}>{u.billingPeriod.start} — {u.billingPeriod.end}</span>
            <span className="font-bold" style={{ fontSize: 20, color: T.t1 }}>€{u.charges.totalThisPeriod.toFixed(2)}</span>
          </div>

          {/* Usage bars */}
          {[
            { label: t('integrations.usage.apiCalls'), used: u.usage.apiCalls.used, total: u.usage.apiCalls.included, rate: `€${u.pricing.overageRate}/${t('integrations.usage.perCall')}` },
            { label: t('integrations.usage.webhookDeliveries'), used: u.usage.webhookDeliveries.used, total: u.usage.webhookDeliveries.included, rate: `€${u.pricing.webhookRate}/${t('integrations.usage.perCall')}` },
            { label: t('integrations.usage.dataTransfer'), used: u.usage.dataTransfer.usedMB, total: u.usage.dataTransfer.includedMB, suffix: 'MB' },
          ].map((bar, i) => {
            const pct = Math.min(Math.round((bar.used / bar.total) * 100), 100);
            const barColor = pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : T.ac;
            return (
              <div key={i} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, color: T.t1 }}>{bar.label}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>
                      {bar.used.toLocaleString()}{bar.suffix || ''} / {bar.total.toLocaleString()}{bar.suffix || ''}
                    </span>
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 600, background: pct >= 90 ? '#FEF2F2' : pct >= 75 ? '#FFFBEB' : T.al, color: barColor }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: T.bd }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                {bar.rate && (
                  <div className="text-right mt-0.5" style={{ fontSize: 10, color: T.t3 }}>{t('integrations.usage.overageRate')}: {bar.rate}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <TrendingUp size={15} style={{ color: T.ac }} />
          <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('integrations.usage.costBreakdown')}</h3>
        </div>
        <div className="p-5">
          {/* By API Key */}
          <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('integrations.usage.byApiKey')}</div>
          <div className="space-y-2 mb-4">
            {u.byKey.map((k, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                <Code size={14} style={{ color: T.ac }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ fontSize: 12, color: T.t1 }}>{k.keyName}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>{k.calls.toLocaleString()} {t('integrations.api.calls')} ({k.pct}%)</div>
                </div>
                <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>€{k.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Line items */}
          <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('integrations.usage.lineItems')}</div>
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
            {[
              { label: t('integrations.usage.baseSubscription'), amount: u.charges.baseSubscription },
              { label: t('integrations.usage.apiOverageLabel'), amount: u.charges.apiOverage },
              { label: t('integrations.usage.webhookOverageLabel'), amount: u.charges.webhookOverage },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: `1px solid ${T.bd}`, background: T.sf }}>
                <span style={{ fontSize: 12, color: T.t2 }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>€{item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: T.sa }}>
              <span className="font-bold" style={{ fontSize: 13, color: T.t1 }}>{t('integrations.usage.total')}</span>
              <span className="font-bold" style={{ fontSize: 16, color: T.ac }}>€{u.charges.totalThisPeriod.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing history */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <Clock size={15} style={{ color: T.ac }} />
          <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('integrations.usage.billingHistory')}</h3>
        </div>
        {/* Table header */}
        <div className="grid grid-cols-4 gap-2 px-5 py-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.usage.colMonth')}</div>
          <div className="text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.usage.apiCalls')}</div>
          <div className="text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.usage.webhookDeliveries')}</div>
          <div className="text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('integrations.usage.colTotal')}</div>
        </div>
        {u.history.map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 px-5 py-3 transition-colors duration-150"
            style={{ borderBottom: i < u.history.length - 1 ? `1px solid ${T.bd}` : 'none', background: T.sf }}
            onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
            onMouseLeave={(e) => e.currentTarget.style.background = T.sf}>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{row.month}</div>
            <div className="text-right" style={{ fontSize: 12, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>{row.apiCalls.toLocaleString()}</div>
            <div className="text-right" style={{ fontSize: 12, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>{row.webhooks.toLocaleString()}</div>
            <div className="text-right font-semibold" style={{ fontSize: 12, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>€{row.cost.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ── Shared sub-components ── */
function StatBox({ label, value, color, icon, T }) {
  return (
    <div className="rounded-xl p-4" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: color || T.t3 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
      </div>
      <div className="font-bold" style={{ fontSize: 22, color: color || T.t1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
