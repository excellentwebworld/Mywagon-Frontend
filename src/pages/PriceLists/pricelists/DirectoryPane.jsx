/**
 * DirectoryPane — Left-side tree filter for Price Lists.
 *
 * Nodes: All / Active / pricing methods / special groups / By scope (collapsible) / status.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { getScopeLabels } from '../../../mocks/priceListsData';
import {
  laneHasMetric,
  laneIsDirectTrip,
  laneIsExpiringSoonActive,
  laneIsFtl,
  laneIsMultistop,
  laneIsSimpleLane,
} from '../../../api/utils/laneMetricDisplay';

export default function DirectoryPane({ lanes, activeNode, onNodeClick }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [scopeOpen, setScopeOpen] = useState(true);

  const counts = useMemo(() => {
    const c = {
      all: lanes.length,
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

    lanes.forEach((l) => {
      if (l.status === 'active') c.active++;
      if (l.status === 'inactive') c.inactive++;
      if (l.status === 'archived') c.archived++;
      if (laneIsFtl(l)) c.ftl++;
      if (laneHasMetric(l, 'weight')) c.weight++;
      if (laneHasMetric(l, 'load_any_size')) c.load++;
      if (laneHasMetric(l, 'unit_transport')) c.unitTransport++;
      if (laneIsExpiringSoonActive(l)) c.expiring++;
      if (l.isRoundTrip) c.roundTrip++;
      if (laneIsDirectTrip(l)) c.directTrip++;
      if (laneIsSimpleLane(l)) c.simpleLane++;
      if (laneIsMultistop(l)) c.multiStop++;

      if (l.scope === 'default') {
        c.scopePartners.default = c.scopePartners.default || { count: 0, name: null };
        c.scopePartners.default.count++;
      }
      (l.scopePartnerIds || []).forEach((pid) => {
        if (!c.scopePartners[pid]) {
          const names = getScopeLabels([pid]);
          c.scopePartners[pid] = { count: 0, name: names[0] || pid };
        }
        c.scopePartners[pid].count++;
      });
    });

    return c;
  }, [lanes]);

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
      <NodeButton node={{ key: 'roundTrips', icon: '🔄', label: t('priceLists.directory.roundTrips', 'Round trips'), count: counts.roundTrip }} />
      <NodeButton node={{ key: 'simpleLane', icon: '2️⃣', label: t('priceLists.directory.simpleLane', 'Simple Lane'), count: counts.simpleLane }} />
      <NodeButton node={{ key: 'multiStop', icon: '📍', label: t('priceLists.directory.multiStop', 'Multi-stop'), count: counts.multiStop }} />
      <Sep />

      <button
        onClick={() => setScopeOpen(!scopeOpen)}
        className="flex items-center gap-2 w-full px-2 py-1.5 cursor-pointer border-none rounded-lg"
        style={{ background: 'transparent', fontSize: 11, fontWeight: 600, color: T.t3 }}
      >
        {scopeOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>👤 {t('priceLists.directory.byScope', 'By scope')}</span>
      </button>
      {scopeOpen && scopeNodes.map((node) => <NodeButton key={node.key} node={node} />)}
      <Sep />

      <NodeButton node={{ key: 'inactive', icon: '📁', label: t('priceLists.directory.inactive', 'Inactive'), count: counts.inactive }} />
      <NodeButton node={{ key: 'archived', icon: '🗄️', label: t('priceLists.directory.archived', 'Archived'), count: counts.archived }} />
    </div>
  );
}
