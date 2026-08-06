/**
 * DirectoryPane — Left-side tree filter for Price Lists.
 *
 * Nodes: All / Active / pricing methods / special groups / By scope (collapsible) / status.
 * By Scope section collapsible/expandable, nodes from scopePartnerIds.
 */
import { useCallback, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, FolderPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { isExpiringSoon, getPrimaryUnit, getScopeLabels } from '../../../mocks/priceListsData';
import { resolveLanePricingRows } from '../../../api/utils/laneMetricDisplay';

const FOLDER_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#BE185D'];
let nextFolderId = 100;

export default function DirectoryPane({ lanes, activeNode, onNodeClick, role, folders, setFolders, onMoveToFolder }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [scopeOpen, setScopeOpen] = useState(true);
  const counts = useMemo(() => {
    const c = {
      all: lanes.length, active: 0, inactive: 0, archived: 0,
      ftl: 0, pallet: 0, km: 0, weight: 0,
      load: 0, unitTransport: 0, expiring: 0, roundTrip: 0, directTrip: 0, simpleLane: 0, multiStop: 0,
      scopePartners: {}, // partnerId → { count, name }
    };
    lanes.forEach((l) => {
      if (l.status === 'active') c.active++;
      if (l.status === 'inactive') c.inactive++;
      if (l.status === 'archived') c.archived++;
      const unit = getPrimaryUnit(l);
      if (unit === 'load') c.ftl++;
      if (unit === 'pallet') c.pallet++;
      if (unit === 'km') c.km++;
      if (unit === 'tonne' || unit === 'kg') c.weight++;
      if (resolveLanePricingRows(l).some((row) => row.metric === 'load_any_size')) c.load++;
      if (resolveLanePricingRows(l).some((row) => row.metric === 'unit_transport')) c.unitTransport++;
      if (isExpiringSoon(l)) c.expiring++;
      if (l.isRoundTrip) c.roundTrip++;
      if (!l.isRoundTrip) c.directTrip++;
      if (Array.isArray(l.stops) && l.stops.length === 2) c.simpleLane++;
      if (l.stops.length > 2) c.multiStop++;
      // Scope: count default vs per-partner
      if (l.scope === 'default') {
        c.scopePartners['default'] = c.scopePartners['default'] || { count: 0, name: null };
        c.scopePartners['default'].count++;
      }
      (l.scopePartnerIds || []).forEach(pid => {
        if (!c.scopePartners[pid]) {
          const names = getScopeLabels([pid]);
          c.scopePartners[pid] = { count: 0, name: names[0] || pid };
        }
        c.scopePartners[pid].count++;
      });
    });
    return c;
  }, [lanes]);

  // Scope sub-nodes
  const scopeNodes = Object.entries(counts.scopePartners)
    .sort(([a], [b]) => (a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b)))
    .map(([key, { count, name }]) => ({
      key: `scope_${key}`,
      icon: key === 'default' ? '🌐' : '🏪',
      label: key === 'default' ? t('priceLists.directory.defaultScope', 'Default') : (name || key),
      count, indent: true,
    }));

  const NodeButton = ({ node }) => {
    const isActive = activeNode === node.key;
    return (
      <button
        onClick={() => onNodeClick(node.key)}
        className="flex items-center gap-2 w-full rounded-lg cursor-pointer border-none text-left"
        style={{
          padding: node.indent ? '6px 8px 6px 28px' : '6px 8px',
          fontSize: 12, fontWeight: isActive ? 600 : 400,
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
      <NodeButton node={{ key: 'ftl', icon: '📦', label: t('priceLists.directory.ftl', 'FTL / Per load'), count: counts.ftl }} />
      <NodeButton node={{ key: 'perPallet', icon: '📐', label: t('priceLists.directory.perPallet', 'Per pallet'), count: counts.pallet }} />
      <NodeButton node={{ key: 'perKm', icon: '📏', label: t('priceLists.directory.perKm', 'Per km'), count: counts.km }} />
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

      {/* ── By Scope (collapsible) ── */}
      <button onClick={() => setScopeOpen(!scopeOpen)}
        className="flex items-center gap-2 w-full px-2 py-1.5 cursor-pointer border-none rounded-lg"
        style={{ background: 'transparent', fontSize: 11, fontWeight: 600, color: T.t3 }}>
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
