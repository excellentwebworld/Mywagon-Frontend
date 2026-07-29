/**
 * AiSettingsSection — v2  Vagon AI copilot settings with tabbed navigation.
 *
 * Each section lives in its own tab:
 * 1. Assistant — master toggle, access control with role selector
 * 2. Capabilities & Guardrails — clean approval matrix (no emojis)
 * 3. Knowledge & Context — custom instructions, data sources
 * 4. Behavior & Preferences — tone, verbosity, proactive suggestions
 * 5. Chat History & Privacy — retention, masking, training opt-out
 * 6. AI Provider — default vs BYOK
 * 7. MCP Server — server config, tokens, connected assistants
 * 8. Usage & Billing — Claude-style usage bars, purchase credits, auto-purchase
 *
 * Used by roles: Shipper, Forwarder (org admins only)
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot, Shield, Brain, Sliders, Clock, Cpu, Server, BarChart3,
  Copy, Trash2, RefreshCw, Plus, Check, ExternalLink,
  Users, ShoppingCart, Sparkles, CreditCard, ChevronDown,
  Info, AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { toUpperGreek } from '../../../utils/greekUppercase';
import {
  AI_CONFIG, AI_CAPABILITIES, AI_CAPABILITY_GROUPS, AI_KNOWLEDGE,
  AI_BEHAVIOR, AI_HISTORY, AI_PROVIDER, MCP_CONFIG, AI_ASSISTANTS, AI_USAGE,
  AI_ROLE_OPTIONS,
} from '../../../mocks/toolsData';

const AI_TABS = [
  { id: 'assistant', icon: Bot, labelKey: 'ai.tabs.assistant' },
  { id: 'capabilities', icon: Shield, labelKey: 'ai.tabs.capabilities' },
  { id: 'knowledge', icon: Brain, labelKey: 'ai.tabs.knowledge' },
  { id: 'behavior', icon: Sliders, labelKey: 'ai.tabs.behavior' },
  { id: 'history', icon: Clock, labelKey: 'ai.tabs.history' },
  { id: 'provider', icon: Cpu, labelKey: 'ai.tabs.provider' },
  { id: 'mcp', icon: Server, labelKey: 'ai.tabs.mcp' },
  { id: 'usage', icon: BarChart3, labelKey: 'ai.tabs.usage' },
];

export default function AiSettingsSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const isGreek = i18n.language === 'el';

  const [activeTab, setActiveTab] = useState('assistant');
  const [config, setConfig] = useState({ ...AI_CONFIG });
  const [caps, setCaps] = useState([...AI_CAPABILITIES]);
  const [knowledge, setKnowledge] = useState({ ...AI_KNOWLEDGE });
  const [behavior, setBehavior] = useState({ ...AI_BEHAVIOR });
  const [history, setHistory] = useState({ ...AI_HISTORY });
  const [provider, setProvider] = useState({ ...AI_PROVIDER });
  const [mcp, setMcp] = useState({ ...MCP_CONFIG, capabilities: MCP_CONFIG.capabilities.map(c => ({ ...c })) });
  const [usage, setUsage] = useState({ ...AI_USAGE, extra: { ...AI_USAGE.extra } });

  const tUp = (key) => isGreek ? toUpperGreek(t(key)) : t(key);

  return (
    <div>
      <h2 className="font-bold mb-1" style={{ fontSize: 18, color: T.t1 }}>{t('ai.title')}</h2>
      <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>{t('ai.subtitle')}</p>

      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto mb-5 pb-px" style={{ borderBottom: `2px solid ${T.bd}` }}>
        {AI_TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 cursor-pointer border-none whitespace-nowrap"
              style={{ background: 'transparent', fontSize: 12, fontWeight: active ? 600 : 500, color: active ? T.ac : T.t3, borderBottom: `2px solid ${active ? T.ac : 'transparent'}`, marginBottom: -2, transition: 'color 0.15s' }}>
              <Icon size={14} />
              <span>{tUp(labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ 1. Assistant ═══ */}
      {activeTab === 'assistant' && (
        <AssistantTab config={config} setConfig={setConfig} T={T} t={t} toast={toast} />
      )}

      {/* ═══ 2. Capabilities ═══ */}
      {activeTab === 'capabilities' && (
        <CapabilitiesTab caps={caps} setCaps={setCaps} T={T} t={t} toast={toast} />
      )}

      {/* ═══ 3. Knowledge ═══ */}
      {activeTab === 'knowledge' && (
        <KnowledgeTab knowledge={knowledge} setKnowledge={setKnowledge} T={T} t={t} toast={toast} />
      )}

      {/* ═══ 4. Behavior ═══ */}
      {activeTab === 'behavior' && (
        <BehaviorTab behavior={behavior} setBehavior={setBehavior} T={T} t={t} toast={toast} />
      )}

      {/* ═══ 5. History ═══ */}
      {activeTab === 'history' && (
        <HistoryTab history={history} setHistory={setHistory} T={T} t={t} toast={toast} />
      )}

      {/* ═══ 6. Provider ═══ */}
      {activeTab === 'provider' && (
        <ProviderTab provider={provider} setProvider={setProvider} T={T} t={t} />
      )}

      {/* ═══ 7. MCP ═══ */}
      {activeTab === 'mcp' && (
        <McpTab mcp={mcp} setMcp={setMcp} T={T} t={t} toast={toast} />
      )}

      {/* ═══ 8. Usage ═══ */}
      {activeTab === 'usage' && (
        <UsageBillingTab usage={usage} setUsage={setUsage} T={T} t={t} toast={toast} />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 1: Assistant
   ═══════════════════════════════════════════ */
function AssistantTab({ config, setConfig, T, t, toast }) {
  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <Card T={T}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.al }}>
              <Bot size={20} style={{ color: T.ac }} />
            </div>
            <div>
              <div className="font-bold" style={{ fontSize: 15, color: T.t1 }}>{t('ai.assistant.masterToggle')}</div>
              <div style={{ fontSize: 12, color: T.t3 }}>{t('ai.assistant.desc')}</div>
            </div>
          </div>
          <Toggle on={config.enabled} onChange={(v) => setConfig(p => ({ ...p, enabled: v }))} T={T} />
        </div>
      </Card>

      {/* Access control */}
      <Card title={t('ai.assistant.access')} T={T}>
        <div className="space-y-2 mb-4">
          {['all', 'specific'].map(v => (
            <label key={v} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors duration-150"
              style={{ background: config.access === v ? T.al : T.sa, border: `1px solid ${config.access === v ? T.ac + '40' : T.bd}` }}>
              <input type="radio" name="access" checked={config.access === v}
                onChange={() => setConfig(p => ({ ...p, access: v }))}
                className="accent-current" style={{ accentColor: T.ac }} />
              <div className="flex items-center gap-2">
                {v === 'all' ? <Users size={14} style={{ color: T.t2 }} /> : <Shield size={14} style={{ color: T.t2 }} />}
                <span style={{ fontSize: 13, color: T.t1, fontWeight: config.access === v ? 600 : 400 }}>{t(`ai.assistant.access_${v}`)}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Role selector — shown when "Specific roles only" is selected */}
        {config.access === 'specific' && (
          <div className="rounded-xl p-4 mt-2" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
            <div className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: 12, color: T.t2 }}>
              <Users size={13} />
              {t('ai.assistant.selectRoles')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AI_ROLE_OPTIONS.map(role => {
                const isSelected = config.allowedRoles.includes(role.key);
                return (
                  <label key={role.key}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                    style={{
                      background: isSelected ? T.al : 'transparent',
                      border: `1px solid ${isSelected ? T.ac + '40' : T.bd}`,
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = T.sh; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                    <input type="checkbox" checked={isSelected}
                      onChange={() => {
                        setConfig(p => ({
                          ...p,
                          allowedRoles: isSelected
                            ? p.allowedRoles.filter(r => r !== role.key)
                            : [...p.allowedRoles, role.key]
                        }));
                      }}
                      className="accent-current rounded" style={{ accentColor: T.ac }} />
                    <span style={{ fontSize: 13, color: isSelected ? T.ac : T.t1, fontWeight: isSelected ? 600 : 400 }}>
                      {t(role.labelKey)}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-1.5" style={{ fontSize: 11, color: T.t3 }}>
              <Info size={11} />
              {t('ai.assistant.rolesHint', { count: config.allowedRoles.length })}
            </div>
          </div>
        )}
      </Card>

      {/* Chat location */}
      <Card title={t('ai.assistant.chatLocation')} T={T}>
        <div className="space-y-2">
          {Object.entries(config.chatLocations).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors duration-150"
              style={{ background: v ? T.al : T.sa, border: `1px solid ${v ? T.ac + '40' : T.bd}` }}>
              <span style={{ fontSize: 13, color: T.t1 }}>{t(`ai.assistant.loc_${k}`)}</span>
              <Toggle on={v} onChange={() => setConfig(p => ({ ...p, chatLocations: { ...p.chatLocations, [k]: !v } }))} T={T} small />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 2: Capabilities & Guardrails
   ═══════════════════════════════════════════ */
function CapabilitiesTab({ caps, setCaps, T, t, toast }) {
  const updateCap = (id, level) => setCaps(prev => prev.map(c => c.id === id ? { ...c, level } : c));

  const LEVELS = [
    { key: 'auto', label: t('ai.level.auto'), color: '#10B981', bg: '#ECFDF5', darkBg: '#064E3B' },
    { key: 'confirm', label: t('ai.level.confirm'), color: '#F59E0B', bg: '#FFFBEB', darkBg: '#78350F' },
    { key: 'blocked', label: t('ai.level.blocked'), color: '#EF4444', bg: '#FEF2F2', darkBg: '#7F1D1D' },
  ];

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="rounded-xl p-4" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
        <div style={{ fontSize: 12, color: T.t2, marginBottom: 10 }}>{t('ai.capabilities.desc')}</div>
        <div className="flex flex-wrap gap-3">
          {LEVELS.map(l => (
            <div key={l.key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: l.bg }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: l.color }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Capability groups */}
      {AI_CAPABILITY_GROUPS.map(group => {
        const groupCaps = caps.filter(c => c.group === group.key);
        return (
          <div key={group.key} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
            {/* Group header */}
            <div className="px-5 py-2.5" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
              <span className="font-bold" style={{ fontSize: 12, color: T.t1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t(group.labelKey)}
              </span>
            </div>
            {/* Capability rows */}
            {groupCaps.map((cap, i) => {
              const currentLevel = LEVELS.find(l => l.key === cap.level);
              return (
                <div key={cap.id} className="flex items-center gap-3 px-5 py-3 transition-colors duration-150"
                  style={{ borderBottom: i < groupCaps.length - 1 ? `1px solid ${T.bd}` : 'none', background: T.sf }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
                  onMouseLeave={(e) => e.currentTarget.style.background = T.sf}>
                  <span className="flex-1" style={{ fontSize: 13, color: T.t1 }}>{t(`ai.cap.${cap.id}`)}</span>
                  <div className="flex gap-1">
                    {LEVELS.map(l => {
                      const isActive = cap.level === l.key;
                      return (
                        <button key={l.key} onClick={() => updateCap(cap.id, l.key)}
                          className="px-3 py-1.5 rounded-lg cursor-pointer border-none transition-all duration-150 whitespace-nowrap"
                          style={{
                            background: isActive ? l.bg : 'transparent',
                            border: `1px solid ${isActive ? l.color + '50' : T.bd}`,
                            color: isActive ? l.color : T.t3,
                            fontSize: 11,
                            fontWeight: isActive ? 600 : 400,
                          }}>
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Reset defaults */}
      <div className="flex justify-end">
        <button onClick={() => { setCaps([...AI_CAPABILITIES]); toast.success(t('ai.capabilities.reset')); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold transition-transform duration-200 hover:-translate-y-px"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
          <RefreshCw size={12} /> {t('ai.capabilities.resetDefaults')}
        </button>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 3: Knowledge & Context
   ═══════════════════════════════════════════ */
function KnowledgeTab({ knowledge, setKnowledge, T, t, toast }) {
  return (
    <div className="space-y-6">
      {/* Custom Instructions */}
      <Card title={t('ai.knowledge.instructions')} T={T}>
        <textarea value={knowledge.customInstructions}
          onChange={(e) => setKnowledge(p => ({ ...p, customInstructions: e.target.value }))}
          rows={8} maxLength={5000}
          className="w-full px-4 py-3 rounded-xl outline-none resize-none mb-2"
          style={{ border: `1px solid ${T.bd}`, background: T.sa, color: T.t1, fontSize: 13, lineHeight: 1.7, transition: 'border-color 0.15s' }}
          onFocus={(e) => e.target.style.borderColor = T.ac}
          onBlur={(e) => e.target.style.borderColor = T.bd} />
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 11, color: T.t3 }}>{knowledge.customInstructions.length} / 5,000</span>
          <button onClick={() => toast.success(t('ai.knowledge.saved'))}
            className="flex items-center gap-1 px-4 py-2 rounded-lg cursor-pointer border-none font-semibold transition-transform duration-200 hover:-translate-y-px"
            style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
            <Check size={12} /> {t('common.save')}
          </button>
        </div>
      </Card>

      {/* Data Sources */}
      <Card title={t('ai.knowledge.dataSources')} T={T}>
        {[
          { key: 'platformDocs', label: t('ai.knowledge.src_platform'), desc: t('ai.knowledge.src_platform_desc') },
          { key: 'companyData', label: t('ai.knowledge.src_company'), desc: t('ai.knowledge.src_company_desc') },
          { key: 'externalSearch', label: t('ai.knowledge.src_external'), desc: t('ai.knowledge.src_external_desc'), warn: true },
        ].map(s => (
          <label key={s.key} className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer mb-2 transition-colors duration-150"
            style={{ background: knowledge.dataSources[s.key] ? T.al : T.sa, border: `1px solid ${knowledge.dataSources[s.key] ? T.ac + '40' : T.bd}` }}>
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, color: T.t1, fontWeight: knowledge.dataSources[s.key] ? 600 : 400 }}>{s.label}</span>
                {s.warn && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ fontSize: 9, fontWeight: 600, background: '#FFFBEB', color: '#F59E0B' }}>
                  <AlertCircle size={9} /> {t('ai.knowledge.caution')}
                </span>}
              </div>
              {s.desc && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{s.desc}</div>}
            </div>
            <Toggle on={knowledge.dataSources[s.key]}
              onChange={() => setKnowledge(p => ({ ...p, dataSources: { ...p.dataSources, [s.key]: !p.dataSources[s.key] } }))} T={T} small />
          </label>
        ))}
      </Card>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 4: Behavior & Preferences
   ═══════════════════════════════════════════ */
function BehaviorTab({ behavior, setBehavior, T, t, toast }) {
  return (
    <div className="space-y-6">
      <Card T={T}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField label={t('ai.behavior.tone')} value={behavior.tone}
            onChange={(v) => setBehavior(p => ({ ...p, tone: v }))}
            options={[{ v: 'casual', l: t('ai.behavior.casual') }, { v: 'professional', l: t('ai.behavior.professional') }, { v: 'formal', l: t('ai.behavior.formal') }]} T={T} />
          <SelectField label={t('ai.behavior.verbosity')} value={behavior.verbosity}
            onChange={(v) => setBehavior(p => ({ ...p, verbosity: v }))}
            options={[{ v: 'concise', l: t('ai.behavior.concise') }, { v: 'balanced', l: t('ai.behavior.balanced') }, { v: 'detailed', l: t('ai.behavior.detailed') }]} T={T} />
        </div>
      </Card>

      <Card title={t('ai.behavior.proactive')} T={T}>
        <div className="space-y-2">
          {Object.entries(behavior.proactive).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors duration-150"
              style={{ background: v ? T.al : T.sa, border: `1px solid ${v ? T.ac + '40' : T.bd}` }}>
              <span style={{ fontSize: 13, color: T.t1 }}>{t(`ai.behavior.proactive_${k}`)}</span>
              <Toggle on={v} onChange={() => setBehavior(p => ({ ...p, proactive: { ...p.proactive, [k]: !v } }))} T={T} small />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 5: Chat History & Privacy
   ═══════════════════════════════════════════ */
function HistoryTab({ history, setHistory, T, t, toast }) {
  return (
    <div className="space-y-6">
      <Card title={t('ai.history.retention')} T={T}>
        <SelectField label="" value={history.retention}
          onChange={(v) => setHistory(p => ({ ...p, retention: v }))}
          options={[
            { v: '7', l: t('ai.history.days', { count: 7 }) },
            { v: '30', l: t('ai.history.days', { count: 30 }) },
            { v: '90', l: t('ai.history.days', { count: 90 }) },
            { v: '365', l: t('ai.history.days', { count: 365 }) },
            { v: 'forever', l: t('ai.history.forever') },
          ]} T={T} />
      </Card>

      <Card title={t('ai.history.privacyTitle')} T={T}>
        <div className="space-y-2">
          {[
            { key: 'maskSensitive', label: t('ai.history.maskSensitive'), desc: t('ai.history.maskSensitive_desc') },
            { key: 'noTraining', label: t('ai.history.noTraining'), desc: t('ai.history.noTraining_desc') },
          ].map(o => (
            <label key={o.key} className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors duration-150"
              style={{ background: history[o.key] ? T.al : T.sa, border: `1px solid ${history[o.key] ? T.ac + '40' : T.bd}` }}>
              <div className="mr-3">
                <div style={{ fontSize: 13, color: T.t1, fontWeight: history[o.key] ? 600 : 400 }}>{o.label}</div>
                {o.desc && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{o.desc}</div>}
              </div>
              <Toggle on={history[o.key]} onChange={() => setHistory(p => ({ ...p, [o.key]: !p[o.key] }))} T={T} small />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 6: AI Provider
   ═══════════════════════════════════════════ */
function ProviderTab({ provider, setProvider, T, t }) {
  return (
    <div className="space-y-3">
      {['default', 'byok'].map(m => (
        <label key={m} className="flex items-start gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-150"
          style={{ background: provider.mode === m ? T.al : T.sf, border: `1px solid ${provider.mode === m ? T.ac + '40' : T.bd}` }}>
          <input type="radio" name="provider" checked={provider.mode === m}
            onChange={() => setProvider(p => ({ ...p, mode: m }))}
            className="mt-1 accent-current" style={{ accentColor: T.ac }} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {m === 'default' ? <Sparkles size={14} style={{ color: T.ac }} /> : <Cpu size={14} style={{ color: T.t2 }} />}
              <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t(`ai.provider.${m}`)}</span>
              {m === 'default' && <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: '#ECFDF5', color: '#10B981' }}>{t('ai.provider.recommended')}</span>}
            </div>
            <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.5 }}>{t(`ai.provider.${m}_desc`)}</div>
          </div>
        </label>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 7: MCP Server
   ═══════════════════════════════════════════ */
function McpTab({ mcp, setMcp, T, t, toast }) {
  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <Card T={T}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: mcp.enabled ? '#ECFDF5' : T.sa }}>
              <Server size={20} style={{ color: mcp.enabled ? '#10B981' : T.t3 }} />
            </div>
            <div>
              <div className="font-bold" style={{ fontSize: 14, color: T.t1 }}>MCP Server</div>
              <div style={{ fontSize: 12, color: mcp.enabled ? '#10B981' : T.t3, fontWeight: 600 }}>
                {mcp.enabled ? t('ai.mcp.active') : t('ai.mcp.inactive')}
              </div>
            </div>
          </div>
          <Toggle on={mcp.enabled} onChange={(v) => setMcp(p => ({ ...p, enabled: v }))} T={T} />
        </div>
      </Card>

      {mcp.enabled && (
        <>
          {/* Server URL */}
          <Card title={t('ai.mcp.serverUrl')} T={T}>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
              <code className="flex-1 truncate" style={{ fontSize: 12, color: T.t1, fontFamily: 'monospace' }}>{mcp.serverUrl}</code>
              <button onClick={() => { navigator.clipboard?.writeText(mcp.serverUrl); toast.success(t('common.copied')); }}
                className="cursor-pointer border-none bg-transparent p-1.5 rounded-lg"
                style={{ background: T.sh }}>
                <Copy size={13} style={{ color: T.t3 }} />
              </button>
            </div>
          </Card>

          {/* Capabilities */}
          <Card title={t('ai.mcp.capabilities')} T={T}>
            <div className="space-y-2">
              {mcp.capabilities.map(cap => (
                <div key={cap.key} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150"
                  style={{ background: cap.enabled ? T.al : T.sa, border: `1px solid ${cap.enabled ? T.ac + '25' : T.bd}` }}>
                  <input type="checkbox" checked={cap.enabled}
                    onChange={() => setMcp(p => ({ ...p, capabilities: p.capabilities.map(c => c.key === cap.key ? { ...c, enabled: !c.enabled } : c) }))}
                    className="accent-current" style={{ accentColor: T.ac }} />
                  <span className="flex-1" style={{ fontSize: 13, color: cap.enabled ? T.t1 : T.t3 }}>{t(`ai.mcp.cap_${cap.key}`)}</span>
                  {cap.enabled && (
                    <select value={cap.permission}
                      onChange={(e) => setMcp(p => ({ ...p, capabilities: p.capabilities.map(c => c.key === cap.key ? { ...c, permission: e.target.value } : c) }))}
                      className="px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                      style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 12 }}>
                      <option value="read">{t('ai.mcp.readOnly')}</option>
                      <option value="readwrite">{t('ai.mcp.readWrite')}</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Tokens */}
          <Card title={t('ai.mcp.tokens')} action={
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold"
              style={{ background: T.ac, color: '#fff', fontSize: 11 }}>
              <Plus size={12} /> {t('ai.mcp.generateToken')}
            </button>
          } T={T}>
            <div className="space-y-2">
              {mcp.tokens.map(tok => (
                <div key={tok.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ fontSize: 13, color: T.t1 }}>{tok.name}</div>
                    <div style={{ fontSize: 11, color: T.t3, fontFamily: 'monospace' }}>{tok.prefix}</div>
                  </div>
                  <button className="px-2.5 py-1 rounded-lg cursor-pointer border-none font-semibold" style={{ background: '#FEF2F2', color: '#EF4444', fontSize: 11 }}>
                    {t('ai.mcp.revoke')}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Connected assistants */}
          <Card title={t('ai.mcp.assistants')} T={T}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AI_ASSISTANTS.map(a => (
                <div key={a.key} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150"
                  style={{ background: a.connected ? T.al : T.sa, border: `1px solid ${a.connected ? T.ac + '25' : T.bd}` }}>
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ fontSize: 13, color: T.t1 }}>{a.name}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: a.connected ? '#ECFDF5' : T.sa, color: a.connected ? '#10B981' : T.t3 }}>
                    {a.connected ? t('ai.mcp.connectedLabel') : t('ai.mcp.notConnected')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Tab 8: Usage & Billing  (Claude-style)
   ═══════════════════════════════════════════ */
function UsageBillingTab({ usage, setUsage, T, t, toast }) {
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(50);
  const u = usage;

  return (
    <div className="space-y-6">
      {/* Plan overview */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles size={16} style={{ color: T.ac }} />
              <span className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{u.plan} {t('ai.usage.planLabel')}</span>
            </div>
            <span style={{ fontSize: 12, color: T.t3 }}>€{u.planPrice}/{t('ai.usage.perMonth')}</span>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 12, color: T.t3 }}>{t('ai.usage.period')}: {u.period.start} — {u.period.end}</div>
            <div style={{ fontSize: 12, color: T.ac, fontWeight: 600 }}>{t('ai.usage.resets', { days: u.period.daysLeft })}</div>
          </div>
        </div>

        {/* Usage bars */}
        <div className="p-5 space-y-5">
          {[
            { label: t('ai.usage.requests'), used: u.limits.requests.used, total: u.limits.requests.total, icon: <BarChart3 size={14} /> },
            { label: t('ai.usage.tokens'), used: Math.round(u.limits.tokens.used / 1000000 * 10) / 10, total: u.limits.tokens.total / 1000000, suffix: 'M', icon: <Brain size={14} /> },
            { label: t('ai.usage.ocr'), used: u.limits.ocr.used, total: u.limits.ocr.total, icon: <Bot size={14} /> },
          ].map((bar, i) => {
            const pct = Math.round((bar.used / bar.total) * 100);
            const barColor = pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : T.ac;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2" style={{ color: T.t1 }}>
                    <span style={{ color: barColor }}>{bar.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{bar.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>
                      {bar.used}{bar.suffix || ''} / {bar.total}{bar.suffix || ''}
                    </span>
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: pct >= 90 ? '#FEF2F2' : pct >= 75 ? '#FFFBEB' : T.al, color: barColor }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: T.bd }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage by feature */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <BarChart3 size={14} style={{ color: T.ac }} />
          <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('ai.usage.byFeature')}</span>
        </div>
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-5 py-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <div className="col-span-5" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.feature')}</div>
          <div className="col-span-2 text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.requests')}</div>
          <div className="col-span-3 text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.tokens')}</div>
          <div className="col-span-2 text-right" style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.cost')}</div>
        </div>
        {u.byFeature.map((f, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 px-5 py-2.5 transition-colors duration-150"
            style={{ borderBottom: i < u.byFeature.length - 1 ? `1px solid ${T.bd}` : 'none', background: T.sf }}
            onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
            onMouseLeave={(e) => e.currentTarget.style.background = T.sf}>
            <div className="col-span-5" style={{ fontSize: 12, color: T.t1 }}>{f.label}</div>
            <div className="col-span-2 text-right" style={{ fontSize: 12, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>{f.requests.toLocaleString()}</div>
            <div className="col-span-3 text-right" style={{ fontSize: 12, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>{(f.tokens / 1000000).toFixed(1)}M</div>
            <div className="col-span-2 text-right font-semibold" style={{ fontSize: 12, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>€{f.cost.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Extra Usage — Claude-style */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <CreditCard size={14} style={{ color: T.ac }} />
          <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('ai.usage.extraUsage')}</span>
        </div>
        <div className="p-5">
          {/* Enable/disable */}
          <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl"
            style={{ background: u.extra.enabled ? T.al : T.sa, border: `1px solid ${u.extra.enabled ? T.ac + '40' : T.bd}` }}>
            <div>
              <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>{t('ai.usage.enableExtraUsage')}</div>
              <div style={{ fontSize: 11, color: T.t3 }}>{t('ai.usage.enableExtraUsage_desc')}</div>
            </div>
            <Toggle on={u.extra.enabled} onChange={(v) => setUsage(p => ({ ...p, extra: { ...p.extra, enabled: v } }))} T={T} />
          </div>

          {u.extra.enabled && (
            <>
              {/* Balance overview */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl p-4" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.spent')}</div>
                  <div className="font-bold mt-1" style={{ fontSize: 18, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>€{u.extra.spent.toFixed(2)}</div>
                </div>
                <div className="rounded-xl p-4" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.limit')}</div>
                  <div className="font-bold mt-1" style={{ fontSize: 18, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>€{u.extra.limit}</div>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#ECFDF5', border: `1px solid #A7F3D0` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai.usage.balance')}</div>
                  <div className="font-bold mt-1" style={{ fontSize: 18, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>€{u.extra.balance.toFixed(2)}</div>
                </div>
              </div>

              {/* Auto purchase */}
              <div className="mb-5 px-4 py-3 rounded-xl"
                style={{ background: u.extra.autoPurchase ? T.al : T.sa, border: `1px solid ${u.extra.autoPurchase ? T.ac + '40' : T.bd}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold" style={{ fontSize: 13, color: T.t1 }}>{t('ai.usage.autoPurchase')}</div>
                    <div style={{ fontSize: 11, color: T.t3 }}>{t('ai.usage.autoPurchase_desc')}</div>
                  </div>
                  <Toggle on={u.extra.autoPurchase}
                    onChange={(v) => setUsage(p => ({ ...p, extra: { ...p.extra, autoPurchase: v } }))} T={T} />
                </div>
                {u.extra.autoPurchase && (
                  <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${T.bd}` }}>
                    <span style={{ fontSize: 12, color: T.t2 }}>{t('ai.usage.autoPurchaseAmount')}:</span>
                    <select value={u.extra.autoPurchaseAmount}
                      onChange={(e) => setUsage(p => ({ ...p, extra: { ...p.extra, autoPurchaseAmount: Number(e.target.value) } }))}
                      className="px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                      style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13, fontWeight: 600 }}>
                      {[25, 50, 100, 200].map(v => <option key={v} value={v}>€{v}</option>)}
                    </select>
                    <span style={{ fontSize: 11, color: T.t3 }}>{t('ai.usage.whenBalanceLow')}</span>
                  </div>
                )}
              </div>

              {/* Purchase credits button */}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setShowPurchase(!showPurchase)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer border-none font-bold transition-transform duration-200 hover:-translate-y-px"
                  style={{ background: T.ac, color: '#fff', fontSize: 13, boxShadow: `0 4px 12px ${T.ac}40` }}>
                  <ShoppingCart size={14} /> {t('ai.usage.purchaseCredits')}
                </button>
              </div>

              {/* Purchase dialog */}
              {showPurchase && (
                <div className="rounded-xl p-5 mb-5" style={{ background: T.al, border: `1px solid ${T.ac}40` }}>
                  <div className="font-bold mb-3" style={{ fontSize: 14, color: T.t1 }}>{t('ai.usage.purchaseCredits')}</div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[25, 50, 100, 200].map(amt => (
                      <button key={amt} onClick={() => setPurchaseAmount(amt)}
                        className="py-3 rounded-xl cursor-pointer border-none font-bold transition-all duration-150"
                        style={{
                          background: purchaseAmount === amt ? T.ac : T.sf,
                          color: purchaseAmount === amt ? '#fff' : T.t1,
                          border: `1px solid ${purchaseAmount === amt ? T.ac : T.bd}`,
                          fontSize: 14,
                        }}>
                        €{amt}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg" style={{ background: T.sf }}>
                    <span style={{ fontSize: 12, color: T.t2 }}>{t('ai.usage.youWillReceive')}</span>
                    <span className="font-bold" style={{ fontSize: 14, color: T.ac }}>{(purchaseAmount / u.extra.pricePerCredit * 1000).toLocaleString()} {t('ai.usage.requests').toLowerCase()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPurchase(false); toast.success(t('ai.usage.purchaseSuccess', { amount: purchaseAmount })); }}
                      className="flex-1 py-2.5 rounded-xl cursor-pointer border-none font-bold transition-transform duration-200 hover:-translate-y-px"
                      style={{ background: T.ac, color: '#fff', fontSize: 13 }}>
                      {t('ai.usage.confirmPurchase')} — €{purchaseAmount}
                    </button>
                    <button onClick={() => setShowPurchase(false)}
                      className="px-4 py-2.5 rounded-xl cursor-pointer border-none font-semibold"
                      style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Purchase history */}
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
                <div className="px-5 py-2.5 flex items-center gap-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
                  <Clock size={13} style={{ color: T.t3 }} />
                  <span className="font-semibold" style={{ fontSize: 12, color: T.t2 }}>{t('ai.usage.purchaseHistory')}</span>
                </div>
                {u.purchaseHistory.map((ph, i) => (
                  <div key={ph.id} className="flex items-center gap-4 px-5 py-3 transition-colors duration-150"
                    style={{ borderBottom: i < u.purchaseHistory.length - 1 ? `1px solid ${T.bd}` : 'none', background: T.sf }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.sh}
                    onMouseLeave={(e) => e.currentTarget.style.background = T.sf}>
                    <span style={{ fontSize: 12, color: T.t3, fontVariantNumeric: 'tabular-nums', width: 90 }}>{ph.date}</span>
                    <span className="flex-1" style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{ph.credits.toLocaleString()} {t('ai.usage.credits')}</span>
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: ph.method === 'Auto' ? '#EFF6FF' : T.al, color: ph.method === 'Auto' ? '#1D4ED8' : T.ac }}>
                      {ph.method}
                    </span>
                    <span className="font-semibold" style={{ fontSize: 12, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>€{ph.amount}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <Sparkles size={14} style={{ color: T.ac }} />
          <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t('ai.usage.planComparison')}</span>
        </div>
        <div className="grid grid-cols-4" style={{ background: T.sf }}>
          {u.planTiers.map((tier, i) => {
            const isCurrent = tier.name === u.plan;
            return (
              <div key={tier.name} className="p-4 flex flex-col"
                style={{
                  borderRight: i < u.planTiers.length - 1 ? `1px solid ${T.bd}` : 'none',
                  background: isCurrent ? T.al : 'transparent',
                }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="font-bold" style={{ fontSize: 13, color: isCurrent ? T.ac : T.t1 }}>{tier.name}</span>
                  {isCurrent && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 8, fontWeight: 700, background: T.ac, color: '#fff' }}>{t('ai.usage.current')}</span>}
                </div>
                <div className="font-bold mb-3" style={{ fontSize: 18, color: T.t1 }}>
                  {tier.price !== null ? `€${tier.price}` : t('ai.usage.custom')}
                  {tier.price !== null && <span style={{ fontSize: 11, fontWeight: 400, color: T.t3 }}>/{t('ai.usage.mo')}</span>}
                </div>
                <div className="space-y-1.5 text-left">
                  <div style={{ fontSize: 11, color: T.t2 }}>{tier.requests !== null ? `${tier.requests.toLocaleString()} ${t('ai.usage.requests').toLowerCase()}` : t('ai.usage.unlimited')}</div>
                  <div style={{ fontSize: 11, color: T.t2 }}>{tier.tokens !== null ? `${(tier.tokens / 1000000).toFixed(0)}M ${t('ai.usage.tokens').toLowerCase()}` : t('ai.usage.unlimited')}</div>
                  <div style={{ fontSize: 11, color: T.t2 }}>{tier.ocr !== null ? `${tier.ocr} OCR` : t('ai.usage.unlimited')}</div>
                </div>
                {!isCurrent && tier.price !== null && (
                  <button className="mt-3 w-full py-1.5 rounded-lg cursor-pointer border-none font-semibold"
                    style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}>
                    {tier.price > (u.planPrice || 0) ? t('ai.usage.upgrade') : t('ai.usage.downgrade')}
                  </button>
                )}
                {!isCurrent && tier.price === null && (
                  <button className="mt-3 w-full py-1.5 rounded-lg cursor-pointer border-none font-semibold"
                    style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}>
                    {t('ai.usage.contactSales')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ═════════════════════════════════════════
   Shared sub-components
   ═════════════════════════════════════════ */
function Card({ title, action, children, T }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.bd}` }}>
          <h3 className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{title}</h3>
          {action}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, T, small }) {
  const w = small ? 36 : 44;
  const h = small ? 20 : 24;
  const dot = small ? 16 : 20;
  return (
    <button onClick={() => onChange(!on)} className="relative cursor-pointer border-none rounded-full shrink-0"
      style={{ width: w, height: h, background: on ? T.ac : T.bd, padding: 0, transition: 'background 0.2s' }}>
      <span className="absolute rounded-full bg-white shadow" style={{ width: dot, height: dot, top: (h - dot) / 2, left: on ? w - dot - 2 : 2, transition: 'left 0.2s' }} />
    </button>
  );
}

function SelectField({ label, value, onChange, options, T }) {
  return (
    <div>
      {label && <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl outline-none cursor-pointer"
        style={{ border: `1px solid ${T.bd}`, background: T.sa, color: T.t1, fontSize: 13 }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
