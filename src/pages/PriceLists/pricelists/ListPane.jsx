/**
 * ListPane — Price Lists table view.
 *
 * Columns: Checkbox, Route, Stops, Total km, Price, Metric, Status, Scope,
 *          Effective, Margin% (carrier only), Updated, Actions.
 * Per-column sorting with dual-chevron asc/desc/unsorted pattern.
 * Shared PaginationBar. Click row → open detail pane.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { MoreHorizontal, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import PaginationBar from '../../../components/ui/PaginationBar';
import { getPrimaryUnit, getPrimaryPrice, isExpiringSoon, calcProfitability, cityLabel, formatScopeDisplay } from '../../../mocks/priceListsData';

const STATUS_PILL = {
  active: { bg: '#D1FAE5', fg: '#059669' },
  inactive: { bg: '#F3F4F6', fg: '#6B7280' },
  archived: { bg: '#FEF3C7', fg: '#92400E' },
};

const UNIT_PILL = {
  load: { labelKey: 'priceLists.filter.perLoad', bg: '#DBEAFE', fg: '#2563EB' },
  pallet: { labelKey: 'priceLists.filter.perPallet', bg: '#EDE9FE', fg: '#7C3AED' },
  km: { labelKey: 'priceLists.filter.perKm', bg: '#FEF3C7', fg: '#92400E' },
  kg: { labelKey: 'priceLists.pricing.perKg', bg: '#FFE4E6', fg: '#DC2626' },
  tonne: { labelKey: 'priceLists.pricing.perTonne', bg: '#ECFDF5', fg: '#059669' },
};

const STATUS_SORT_ORDER = { active: 0, inactive: 1, archived: 2 };

function SortIcon({ sortKey, currentSort, currentDir }) {
  if (currentSort !== sortKey) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
  return currentDir === 'asc'
    ? <ChevronUp size={12} />
    : <ChevronDown size={12} />;
}

function relativeTime(dateStr, t) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return t('priceLists.time.today', 'Today');
  if (days === 1) return t('priceLists.time.oneDayAgo', '1d ago');
  if (days < 30) return t('priceLists.time.daysAgo', '{{n}}d ago').replace('{{n}}', String(days));
  const months = Math.floor(days / 30);
  return t('priceLists.time.monthsAgo', '{{n}}mo ago').replace('{{n}}', String(months));
}

export default function ListPane({
  lanes, selectedId, onSelectLane, role,
  onAction, // (action, lane) → void
  selectedIds, onToggleSelect, onToggleAll,
  activeNode,
}) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language;

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return lanes;
    const arr = [...lanes];
    arr.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'route': va = a.stops[0]?.city || ''; vb = b.stops[0]?.city || ''; break;
        case 'stops': va = a.stops.length; vb = b.stops.length; break;
        case 'km': va = a.totalKm; vb = b.totalKm; break;
        case 'price': va = getPrimaryPrice(a); vb = getPrimaryPrice(b); break;
        case 'metric': va = t(UNIT_PILL[getPrimaryUnit(a)]?.labelKey || 'priceLists.filter.perLoad', UNIT_PILL[getPrimaryUnit(a)]?.labelKey || 'Load'); vb = t(UNIT_PILL[getPrimaryUnit(b)]?.labelKey || 'priceLists.filter.perLoad', UNIT_PILL[getPrimaryUnit(b)]?.labelKey || 'Load'); break;
        case 'status': va = STATUS_SORT_ORDER[a.status] ?? 99; vb = STATUS_SORT_ORDER[b.status] ?? 99; break;
        case 'scope': va = formatScopeDisplay(a, t); vb = formatScopeDisplay(b, t); break;
        case 'effective': va = a.effectiveFrom; vb = b.effectiveFrom; break;
        case 'updated': va = a.updatedAt; vb = b.updatedAt; break;
        case 'margin': {
          const ma = calcProfitability(a); const mb = calcProfitability(b);
          va = ma.marginPct; vb = mb.marginPct; break;
        }
        default: va = 0; vb = 0;
      }
      if (typeof va === 'string') {
        const cmp = va.localeCompare(vb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [lanes, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageData = sorted.slice(startIdx, startIdx + pageSize);
  const showFrom = sorted.length > 0 ? startIdx + 1 : 0;
  const showTo = Math.min(startIdx + pageSize, sorted.length);

  const allOnPageSelected = pageData.length > 0 && pageData.every((l) => selectedIds.has(l.id));

  const thStyle = {
    fontSize: 11, fontWeight: 600, color: T.t3, padding: '8px 10px',
    borderBottom: `1px solid ${T.bd}`, whiteSpace: 'nowrap', userSelect: 'none',
    background: T.sh, position: 'sticky', top: 0, zIndex: 2,
  };
  const tdStyle = { fontSize: 12, padding: '8px 10px', borderBottom: `1px solid ${T.bd}`, color: T.t1 };

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={() => onToggleAll(pageData.map(d => d.id))}
                  className="cursor-pointer"
                />
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('route')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.route', 'Route')}
                  <SortIcon sortKey="route" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer hidden xl:table-cell" onClick={() => handleSort('stops')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.stops', 'Stops')}
                  <SortIcon sortKey="stops" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('km')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.totalKm', 'Total km')}
                  <SortIcon sortKey="km" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('price')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.price', 'Price')}
                  <SortIcon sortKey="price" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('metric')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.metric', 'Metric')}
                  <SortIcon sortKey="metric" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('status')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.status', 'Status')}
                  <SortIcon sortKey="status" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={{ ...thStyle }} className="hidden lg:table-cell cursor-pointer" onClick={() => handleSort('scope')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.scope', 'Scope')}
                  <SortIcon sortKey="scope" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer hidden xl:table-cell" onClick={() => handleSort('effective')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.effective', 'Effective')}
                  <SortIcon sortKey="effective" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              {role === 'carrier' && (
                <th style={thStyle} className="cursor-pointer hidden xl:table-cell" onClick={() => handleSort('margin')}>
                  <span className="flex items-center gap-1">
                    {t('priceLists.col.margin', 'Margin %')}
                    <SortIcon sortKey="margin" currentSort={sortKey} currentDir={sortDir} />
                  </span>
                </th>
              )}
              <th style={thStyle} className="hidden lg:table-cell cursor-pointer" onClick={() => handleSort('updated')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.updated', 'Updated')}
                  <SortIcon sortKey="updated" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={99} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: T.t3 }}>
                  {t('priceLists.empty.noLanes', 'No lanes match your filters.')}
                </td>
              </tr>
            ) : pageData.map((lane) => {
              const unit = getPrimaryUnit(lane);
              const price = getPrimaryPrice(lane);
              const unitInfo = UNIT_PILL[unit] || UNIT_PILL.load;
              const statusInfo = STATUS_PILL[lane.status] || STATUS_PILL.active;
              const isSelected = selectedId === lane.id;
              const expiring = isExpiringSoon(lane);
              const profitability = role === 'carrier' ? calcProfitability(lane) : null;

              // Route display with bilingual support
              const routeDisplay = lane.stops.map((s) => cityLabel(s.city, lang)).join(lane.isRoundTrip ? ' ↔ ' : ' → ');

              return (
                <tr
                  key={lane.id}
                  onClick={() => onSelectLane(selectedId === lane.id ? null : lane.id)}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? T.al : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = T.sh; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isSelected ? T.al : 'transparent'; }}
                >
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lane.id)}
                      onChange={() => onToggleSelect(lane.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>
                      {routeDisplay}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span style={{ fontSize: 10, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>{lane.id}</span>
                      {lane.isRoundTrip && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#DBEAFE', color: '#2563EB' }}>
                          {t('priceLists.badge.roundTrip', 'RT')}
                        </span>
                      )}
                      {lane.stops.length > 2 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#EDE9FE', color: '#7C3AED' }}>
                          {t('priceLists.badge.multiStop', 'Multi')}
                        </span>
                      )}
                      {expiring && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#FEF3C7', color: '#92400E' }}>
                          ⏰
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle} className="hidden xl:table-cell">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{lane.stops.length}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {lane.totalKm.toLocaleString()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      €{typeof price === 'number' ? price.toLocaleString(undefined, { minimumFractionDigits: price < 10 ? 2 : 0 }) : price}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        background: unitInfo.bg, color: unitInfo.fg,
                      }}
                    >
                      {t(unitInfo.labelKey)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        background: statusInfo.bg, color: statusInfo.fg,
                      }}
                    >
                      {t(`priceLists.status.${lane.status}`, lane.status)}
                    </span>
                  </td>
                  <td style={tdStyle} className="hidden lg:table-cell">
                    <span style={{ fontSize: 11, color: T.t2 }}>
                      {formatScopeDisplay(lane, t)}
                      {lane.scopeDirection && (
                        <span style={{ fontSize: 9, marginLeft: 4, fontWeight: 600, color: lane.scopeDirection === 'sell' ? '#059669' : '#DC2626' }}>
                          ({lane.scopeDirection === 'sell' ? '↑ Sell' : '↓ Buy'})
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={tdStyle} className="hidden xl:table-cell">
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: T.t2 }}>
                      {lane.effectiveFrom?.slice(0, 10)}
                      {lane.effectiveTo ? ` → ${lane.effectiveTo.slice(0, 10)}` : ` → ${t('priceLists.validity.openEnded', '∞')}`}
                    </span>
                  </td>
                  {role === 'carrier' && (
                    <td style={tdStyle} className="hidden xl:table-cell">
                      {profitability && (
                        <span style={{
                          fontWeight: 700, fontSize: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: profitability.marginPct > 20 ? '#059669' : profitability.marginPct > 5 ? '#F59E0B' : '#DC2626',
                        }}>
                          {profitability.marginPct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  )}
                  <td style={tdStyle} className="hidden lg:table-cell">
                    <span style={{ fontSize: 11, color: T.t3 }}>{relativeTime(lane.updatedAt, t)}</span>
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === lane.id ? null : lane.id)}
                        className="border-none cursor-pointer bg-transparent rounded p-1"
                        style={{ color: T.t3 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = T.sh; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === lane.id && (
                        <RowMenu
                          lane={lane} T={T} t={t}
                          onAction={(action) => { setOpenMenuId(null); onAction(action, lane); }}
                          onClose={() => setOpenMenuId(null)}
                          activeNode={activeNode}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationBar
        showFrom={showFrom}
        showTo={showTo}
        totalCount={sorted.length}
        pageSize={pageSize}
        setPageSize={(sz) => { setPageSize(sz); setPage(1); }}
        safePage={safePage}
        totalPages={totalPages}
        setPage={setPage}
        itemLabel={t('priceLists.pagination.lanes', 'lanes')}
      />
    </div>
  );
}

function RowMenu({ lane, T, t, onAction, onClose, activeNode }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const inFolder = activeNode?.startsWith('folder_');
  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 rounded-lg shadow-lg z-50"
      style={{
        background: T.sf,
        border: `1px solid ${T.bd}`,
        minWidth: 160,
        padding: 4,
      }}
    >
      <MenuItem T={T} onClick={() => onAction('edit')}>✏️ {t('common.edit', 'Edit')}</MenuItem>
      <MenuItem T={T} onClick={() => onAction('duplicate')}>📋 {t('priceLists.actions.duplicate', 'Duplicate')}</MenuItem>
      {inFolder && (
        <MenuItem T={T} onClick={() => onAction('removeFromFolder')}>📂 {t('priceLists.actions.removeFromFolder', 'Remove from folder')}</MenuItem>
      )}
      {lane.status !== 'archived' && (
        <MenuItem T={T} onClick={() => onAction('archive')}>🗄️ {t('priceLists.actions.archive', 'Archive')}</MenuItem>
      )}
      {lane.status === 'archived' && (
        <>
          <MenuItem T={T} onClick={() => onAction('reactivate')}>♻️ {t('priceLists.actions.reactivate', 'Reactivate')}</MenuItem>
          <MenuItem T={T} onClick={() => onAction('deleteForever')} danger>🗑️ {t('priceLists.actions.deleteForever', 'Delete forever')}</MenuItem>
        </>
      )}
      {lane.status === 'active' && (
        <MenuItem T={T} onClick={() => onAction('deactivate')}>⏸️ {t('priceLists.actions.deactivate', 'Deactivate')}</MenuItem>
      )}
      {lane.status === 'inactive' && (
        <MenuItem T={T} onClick={() => onAction('activate')}>▶️ {t('priceLists.actions.activate', 'Activate')}</MenuItem>
      )}
    </div>
  );
}

function MenuItem({ T, children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border-none cursor-pointer rounded-md"
      style={{
        padding: '7px 10px',
        fontSize: 12,
        background: 'transparent',
        color: danger ? '#DC2626' : T.t1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.sh; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
