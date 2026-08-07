/**
 * DirectoryPane — Left-side tree filter for Price Lists.
 *
 * Counts come from GET /price-lists/lanes/summary (API), not client-side filtering.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { getScopeLabels } from '../../../mocks/priceListsData';

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

export default function DirectoryPane({ summary, activeNode, onNodeClick }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [scopeOpen, setScopeOpen] = useState(true);

  const counts = useMemo(() => {
    if (!summary) return EMPTY_COUNTS;
    const scopePartners = {};
    Object.entries(summary.scopes || {}).forEach(([key, count]) => {
      if (key === 'default') {
        scopePartners.default = { count: Number(count) || 0, name: null };
        return;
      }
      const names = getScopeLabels([key]);
      scopePartners[key] = { count: Number(count) || 0, name: names[0] || key };
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
  }, [summary]);

  const scopeNodes = Object.entries(counts.scopePartners)
    .sort(([a], [b]) => (a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b)))
    .map(([key, { count, name }]) => ({
      key: `scope_${key}`,
      icon: key === 'default' ? '🌐' : '🏪',
      label: key === 'default' ? t('priceLists.directory.defaultScope', 'Default') : (name || key),
      count,
      indent: true,
    }));

  const NodeButton = ({ node }) => {
    const isActive = activeNode === node.key;
    return (
      <button
        onClick={() => onNodeClick(node.key)}
        className="flex items-center gap-2 w-full rounded-lg cursor-pointer border-none text-left"
        style={{
          padding: node.indent ? '6px 8px 6px 28px' : '6px 8px',
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? T.ac : T.t1,
          background: isActive ? T.al : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.sh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? T.al : 'transparent'; }}
      >
        <span style={{ width: 16, textAlign: 'center', fontSize: 13 }}>{node.icon}</span>
        <span className="flex-1 min-w-0 truncate">{node.label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>({node.count})</span>
      </button>
    );
  };

  const Sep = () => <div style={{ height: 1, background: T.bd, margin: '8px 8px' }} />;

  return (
    <div className="shrink-0 overflow-y-auto overflow-x-hidden" style={{ width: 230, borderRight: `1px solid ${T.bd}`, background: T.sf, padding: '12px 8px' }}>
      <NodeButton node={{ key: 'all', icon: '📋', label: t('priceLists.directory.all', 'All lanes'), count: counts.all }} />
      <NodeButton node={{ key: 'active', icon: '✅', label: t('priceLists.directory.active', 'Active'), count: counts.active }} />
      <Sep />
      <NodeButton node={{ key: 'ftl', icon: '🚛', label: t('priceLists.directory.ftl', 'FTL truck type'), count: counts.ftl }} />
      <NodeButton node={{ key: 'perWeight', icon: '⚖️', label: t('priceLists.directory.perWeight', 'Per weight'), count: counts.weight }} />
      <NodeButton node={{ key: 'perLoad', icon: '📦', label: t('priceLists.directory.perLoadAny', 'Per load (any size)'), count: counts.load }} />
      <NodeButton node={{ key: 'perUnitTransport', icon: '🧮', label: t('priceLists.directory.perUnitTransport', 'Per unit of transport'), count: counts.unitTransport }} />
      <Sep />
      <NodeButton node={{ key: 'expiring', icon: '⏰', label: t('priceLists.directory.expiring', 'Expiring soon'), count: counts.expiring }} />
      <NodeButton node={{ key: 'directTrip', icon: '➡️', label: t('priceLists.directory.directTrip', 'Direct Trip'), count: counts.directTrip }} />
      <NodeButton node={{ key: 'roundTrips', icon: '🔄', label: t('priceLists.directory.roundTrips', 'Round Trips'), count: counts.roundTrip }} />
      <NodeButton node={{ key: 'simpleLane', icon: '📍', label: t('priceLists.directory.simpleLane', 'Simple Lane'), count: counts.simpleLane }} />
      <NodeButton node={{ key: 'multiStop', icon: '📍📍', label: t('priceLists.directory.multiStop', 'Multi-Stop'), count: counts.multiStop }} />
      <Sep />
      <button
        type="button"
        onClick={() => setScopeOpen((v) => !v)}
        className="flex items-center gap-2 w-full rounded-lg cursor-pointer border-none text-left"
        style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600, color: T.t2, background: 'transparent' }}
      >
        {scopeOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{t('priceLists.directory.byScope', 'By Scope')}</span>
      </button>
      {scopeOpen && scopeNodes.map((node) => <NodeButton key={node.key} node={node} />)}
      <Sep />
      <NodeButton node={{ key: 'inactive', icon: '⏸️', label: t('priceLists.directory.inactive', 'Inactive'), count: counts.inactive }} />
      <NodeButton node={{ key: 'archived', icon: '🗄️', label: t('priceLists.directory.archived', 'Archived'), count: counts.archived }} />
    </div>
  );
}
