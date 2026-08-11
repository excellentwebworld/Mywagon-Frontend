/**
 * DirectoryPane — Left-side tree filter for Price Lists.
 *
 * Counts come from GET /price-lists/lanes/summary (API), not client-side filtering.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Archive,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Globe,
  Map,
  MapPin,
  Package,
  Pause,
  RefreshCw,
  Scale,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { resolvePartnerDisplayName } from '../../../mocks/priceListsData';

const EMPTY_COUNTS = {
  all: 0,
  active: 0,
  inactive: 0,
  archived: 0,
  ftl: 0,
  weight: 0,
  load: 0,
  unitTransport: 0,
  expiring: 0,
  roundTrip: 0,
  directTrip: 0,
  simpleLane: 0,
  multiStop: 0,
  scopePartners: {},
};

const SCOPE_PREVIEW_COUNT = 5;
const SCOPE_COLLAPSE_THRESHOLD = 5;

/** Distinct icon colors aligned with table metric/status pills. */
const NODE_ICON_COLORS = {
  all: '#6366F1',
  active: '#059669',
  ftl: '#2563EB',
  perWeight: '#059669',
  perLoad: '#D97706',
  perUnitTransport: '#7C3AED',
  expiring: '#F59E0B',
  directTrip: '#2563EB',
  roundTrips: '#0891B2',
  simpleLane: '#10B981',
  multiStop: '#7C3AED',
  inactive: '#6B7280',
  archived: '#92400E',
  scopeDefault: '#6366F1',
  scopePartner: '#64748B',
};

function IconWrap({ children, color, active = false }) {
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-md"
      style={{
        width: 22,
        height: 22,
        color,
        background: active ? `${color}18` : `${color}12`,
      }}
    >
      {children}
    </span>
  );
}

export default function DirectoryPane({ summary, activeNode, onNodeClick, partnerNameById }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [scopeOpen, setScopeOpen] = useState(true);
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [scopeSearch, setScopeSearch] = useState('');
  const didInitScopeOpen = useRef(false);

  const counts = useMemo(() => {
    if (!summary) return EMPTY_COUNTS;
    const scopePartners = {};
    Object.entries(summary.scopes || {}).forEach(([key, count]) => {
      if (key === 'default') {
        scopePartners.default = { count: Number(count) || 0, name: null };
        return;
      }
      const summaryLabel = summary?.scope_labels?.[key];
      scopePartners[key] = {
        count: Number(count) || 0,
        name: summaryLabel || resolvePartnerDisplayName(key, partnerNameById),
      };
    });

    return {
      all: Number(summary.all) || 0,
      active: Number(summary.active) || 0,
      inactive: Number(summary.inactive) || 0,
      archived: Number(summary.archived) || 0,
      ftl: Number(summary.ftl) || 0,
      weight: Number(summary.weight) || 0,
      load: Number(summary.load) || 0,
      unitTransport: Number(summary.unit_transport) || 0,
      expiring: Number(summary.expiring) || 0,
      roundTrip: Number(summary.round_trip) || 0,
      directTrip: Number(summary.direct_trip) || 0,
      simpleLane: Number(summary.simple_lane) || 0,
      multiStop: Number(summary.multi_stop) || 0,
      scopePartners,
    };
  }, [summary, partnerNameById]);

  const defaultScopeLabel = t('priceLists.scope.allPartners', 'All Partners');

  const scopeNodes = useMemo(() => (
    Object.entries(counts.scopePartners)
      .map(([key, { count, name }]) => ({
        key: `scope_${key}`,
        isDefault: key === 'default',
        label: key === 'default' ? defaultScopeLabel : (name || key),
        count,
        indent: true,
        iconColor: key === 'default' ? NODE_ICON_COLORS.scopeDefault : NODE_ICON_COLORS.scopePartner,
      }))
      .sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return b.count - a.count || a.label.localeCompare(b.label);
      })
  ), [counts.scopePartners, defaultScopeLabel]);

  useEffect(() => {
    if (didInitScopeOpen.current || scopeNodes.length === 0) return;
    didInitScopeOpen.current = true;
    if (scopeNodes.length > SCOPE_COLLAPSE_THRESHOLD) {
      setScopeOpen(false);
    }
  }, [scopeNodes.length]);

  const scopeSearchActive = scopeSearch.trim().length > 0;

  const filteredScopeNodes = useMemo(() => {
    const q = scopeSearch.trim().toLowerCase();
    if (!q) return scopeNodes;
    return scopeNodes.filter((node) => node.label.toLowerCase().includes(q));
  }, [scopeNodes, scopeSearch]);

  const visibleScopeNodes = useMemo(() => {
    if (scopeSearchActive || scopeExpanded || filteredScopeNodes.length <= SCOPE_PREVIEW_COUNT) {
      return filteredScopeNodes;
    }
    return filteredScopeNodes.slice(0, SCOPE_PREVIEW_COUNT);
  }, [filteredScopeNodes, scopeSearchActive, scopeExpanded]);

  const hiddenScopeCount = Math.max(0, filteredScopeNodes.length - visibleScopeNodes.length);

  const staticNodes = useMemo(() => ([
    { key: 'all', icon: <ClipboardList size={14} />, iconColor: NODE_ICON_COLORS.all, label: t('priceLists.directory.all', 'All lanes'), count: counts.all },
    { key: 'active', icon: <CheckCircle2 size={14} />, iconColor: NODE_ICON_COLORS.active, label: t('priceLists.directory.active', 'Active'), count: counts.active },
    { key: 'ftl', icon: <Truck size={14} />, iconColor: NODE_ICON_COLORS.ftl, label: t('priceLists.directory.ftl', 'FTL truck type'), count: counts.ftl },
    { key: 'perWeight', icon: <Scale size={14} />, iconColor: NODE_ICON_COLORS.perWeight, label: t('priceLists.directory.perWeight', 'Per weight'), count: counts.weight },
    { key: 'perLoad', icon: <Package size={14} />, iconColor: NODE_ICON_COLORS.perLoad, label: t('priceLists.directory.perLoadAny', 'Per load (any size)'), count: counts.load },
    { key: 'perUnitTransport', icon: <Calculator size={14} />, iconColor: NODE_ICON_COLORS.perUnitTransport, label: t('priceLists.directory.perUnitTransport', 'Per unit of transport'), count: counts.unitTransport },
    { key: 'expiring', icon: <Clock size={14} />, iconColor: NODE_ICON_COLORS.expiring, label: t('priceLists.directory.expiring', 'Expiring soon'), count: counts.expiring },
    { key: 'directTrip', icon: <ArrowRight size={14} />, iconColor: NODE_ICON_COLORS.directTrip, label: t('priceLists.directory.directTrip', 'Direct Trip'), count: counts.directTrip },
    { key: 'roundTrips', icon: <RefreshCw size={14} />, iconColor: NODE_ICON_COLORS.roundTrips, label: t('priceLists.directory.roundTrips', 'Round Trips'), count: counts.roundTrip },
    { key: 'simpleLane', icon: <MapPin size={14} />, iconColor: NODE_ICON_COLORS.simpleLane, label: t('priceLists.directory.simpleLane', 'Simple Lane'), count: counts.simpleLane },
    { key: 'multiStop', icon: <Map size={14} />, iconColor: NODE_ICON_COLORS.multiStop, label: t('priceLists.directory.multiStop', 'Multi-Stop'), count: counts.multiStop },
    { key: 'inactive', icon: <Pause size={14} />, iconColor: NODE_ICON_COLORS.inactive, label: t('priceLists.directory.inactive', 'Inactive'), count: counts.inactive },
    { key: 'archived', icon: <Archive size={14} />, iconColor: NODE_ICON_COLORS.archived, label: t('priceLists.directory.archived', 'Archived'), count: counts.archived },
  ]), [counts, t]);

  const NodeButton = ({ node }) => {
    const isActive = activeNode === node.key;
    const iconColor = node.iconColor || T.ac;
    const scopeIcon = node.isDefault
      ? <Globe size={14} />
      : <Building2 size={14} />;

    return (
      <button
        type="button"
        onClick={() => onNodeClick(node.key)}
        className="flex items-center gap-2 w-full rounded-lg cursor-pointer border-none text-left"
        style={{
          padding: node.indent ? '6px 8px 6px 24px' : '6px 8px',
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? T.ac : T.t1,
          background: isActive ? T.al : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.sh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? T.al : 'transparent'; }}
      >
        <IconWrap color={iconColor} active={isActive}>
          {node.icon ?? scopeIcon}
        </IconWrap>
        <span className="flex-1 min-w-0 truncate" title={node.label}>{node.label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>
          ({node.count})
        </span>
      </button>
    );
  };

  const Sep = () => <div style={{ height: 1, background: T.bd, margin: '8px 8px' }} />;

  return (
    <div className="flex flex-col h-full min-h-0 w-full" style={{ background: T.sf }}>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3">
        <NodeButton node={staticNodes[0]} />
        <NodeButton node={staticNodes[1]} />
        <Sep />
        {staticNodes.slice(2, 6).map((node) => <NodeButton key={node.key} node={node} />)}
        <Sep />
        {staticNodes.slice(6, 11).map((node) => <NodeButton key={node.key} node={node} />)}
        <Sep />

        {/* By Scope — dynamic partner scope section */}
        <div
          className="rounded-lg my-1"
          style={{
            background: T.sh,
            border: `1px solid ${T.bd}`,
            borderLeft: `3px solid ${T.ac}`,
          }}
        >
          <button
            type="button"
            onClick={() => setScopeOpen((v) => !v)}
            className="flex items-center gap-2 w-full rounded-t-lg cursor-pointer border-none text-left"
            style={{ padding: '8px 8px 6px', fontSize: 12, fontWeight: 600, color: T.t1, background: 'transparent' }}
          >
            {scopeOpen ? <ChevronDown size={14} style={{ color: T.t3 }} /> : <ChevronRight size={14} style={{ color: T.t3 }} />}
            <Globe size={14} style={{ color: T.ac, flexShrink: 0 }} />
            <span className="flex-1 min-w-0 truncate">
              {t('priceLists.directory.byScope', 'By Scope')}
            </span>
            {scopeNodes.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>
                {scopeNodes.length}
              </span>
            )}
          </button>

          {scopeOpen && scopeNodes.length > 0 && (
            <div className="px-2 pb-2">
              <div className="relative mb-1.5">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: T.t3 }} />
                <input
                  type="search"
                  value={scopeSearch}
                  onChange={(e) => {
                    setScopeSearch(e.target.value);
                    setScopeExpanded(false);
                  }}
                  placeholder={t('priceLists.directory.searchScopes', 'Search scopes…')}
                  className="w-full pl-7 pr-7 py-1.5 rounded-md outline-none"
                  style={{
                    border: `1px solid ${T.bd}`,
                    background: T.sf,
                    color: T.t1,
                    fontSize: 11,
                  }}
                />
                {scopeSearch && (
                  <button
                    type="button"
                    onClick={() => setScopeSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 border-none cursor-pointer bg-transparent p-0.5 rounded"
                    style={{ color: T.t3 }}
                    aria-label={t('common.clear', 'Clear')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {filteredScopeNodes.length === 0 ? (
                <div style={{ fontSize: 11, color: T.t3, padding: '6px 8px' }}>
                  {t('priceLists.directory.noScopesMatch', 'No scopes match your search.')}
                </div>
              ) : (
                <>
                  {visibleScopeNodes.map((node) => <NodeButton key={node.key} node={node} />)}
                  {!scopeSearchActive && hiddenScopeCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setScopeExpanded(true)}
                      className="w-full border-none cursor-pointer rounded-md text-left"
                      style={{
                        padding: '6px 8px 6px 24px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.ac,
                        background: 'transparent',
                      }}
                    >
                      {t('priceLists.directory.showAllScopes', 'Show all ({{count}})').replace('{{count}}', String(filteredScopeNodes.length))}
                    </button>
                  )}
                  {!scopeSearchActive && scopeExpanded && filteredScopeNodes.length > SCOPE_PREVIEW_COUNT && (
                    <button
                      type="button"
                      onClick={() => setScopeExpanded(false)}
                      className="w-full border-none cursor-pointer rounded-md text-left"
                      style={{
                        padding: '6px 8px 6px 24px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.t3,
                        background: 'transparent',
                      }}
                    >
                      {t('priceLists.directory.showLessScopes', 'Show less')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <Sep />
        <NodeButton node={staticNodes[11]} />
        <NodeButton node={staticNodes[12]} />
      </div>
    </div>
  );
}
