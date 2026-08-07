/**
 * ListPane — Price Lists table view.
 *
 * Columns: Route, Stops, Total km, Price, Metric, Status, Scope,
 *          Effective, Margin% (carrier only), Updated, Actions.
 * Per-column sorting with dual-chevron asc/desc/unsorted pattern.
 * Shared PaginationBar. Click row → open detail pane.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { MoreHorizontal, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import PaginationBar from '../../../components/ui/PaginationBar';
import { getPrimaryPrice, isExpiringSoon, calcProfitability, cityLabel, formatRouteLabel, formatScopeDisplay } from '../../../mocks/priceListsData';
import {
  METRIC_PILL,
  METRIC_SORT_ORDER,
  formatMetricLabel,
  getPrimaryMetricKey,
  resolveLanePricingRows,
} from '../../../api/utils/laneMetricDisplay';
import { formatDisplayDate, formatIsoDisplayDateTime } from '../../../utils/dateDisplay';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const STATUS_PILL = {
  active: { bg: '#D1FAE5', fg: '#059669' },
  inactive: { bg: '#F3F4F6', fg: '#6B7280' },
  archived: { bg: '#FEF3C7', fg: '#92400E' },
};

const STATUS_SORT_ORDER = { active: 0, inactive: 1, archived: 2 };

function SortIcon({ sortKey, currentSort, currentDir }) {
  if (currentSort !== sortKey) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
  return currentDir === 'asc'
    ? <ChevronUp size={12} />
    : <ChevronDown size={12} />;
}

export default function ListPane({
  lanes, selectedId, onSelectLane, role,
  onAction,
  loading = false,
  isEmptyCatalog = false,
  page: controlledPage,
  pageSize: controlledPageSize,
  totalCount: controlledTotal,
  onPageChange,
  onPageSizeChange,
}) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language;

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(10);
  const [openMenuId, setOpenMenuId] = useState(null);

  const serverPaged = typeof controlledTotal === 'number' && typeof onPageChange === 'function';
  const page = serverPaged ? (controlledPage || 1) : localPage;
  const pageSize = serverPaged ? (controlledPageSize || 10) : localPageSize;
  const setPage = (next) => {
    if (serverPaged) onPageChange(next);
    else setLocalPage(next);
  };
  const setPageSize = (sz) => {
    if (serverPaged) {
      onPageSizeChange?.(sz);
      onPageChange?.(1);
    } else {
      setLocalPageSize(sz);
      setLocalPage(1);
    }
  };

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
        case 'metric': {
          const ma = getPrimaryMetricKey(a);
          const mb = getPrimaryMetricKey(b);
          va = METRIC_SORT_ORDER[ma] ?? 99;
          vb = METRIC_SORT_ORDER[mb] ?? 99;
          break;
        }
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

  const totalCount = serverPaged ? controlledTotal : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageData = serverPaged ? sorted : sorted.slice(startIdx, startIdx + pageSize);
  const showFrom = totalCount > 0 ? (serverPaged ? startIdx + 1 : startIdx + 1) : 0;
  const showTo = Math.min(startIdx + pageData.length, totalCount);

  const thStyle = {
    fontSize: 11, fontWeight: 600, color: T.t3, padding: '8px 10px',
    borderBottom: `1px solid ${T.bd}`, whiteSpace: 'nowrap', userSelect: 'none',
    background: T.sh, position: 'sticky', top: 0, zIndex: 2,
  };
  const tdStyle = { fontSize: 12, padding: '8px 10px', borderBottom: `1px solid ${T.bd}`, color: T.t1, verticalAlign: 'middle' };
  const showMargin = role === 'carrier';

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table
          className="w-full border-collapse"
          style={{ tableLayout: 'fixed', width: '100%', minWidth: showMargin ? 980 : 920 }}
        >
          <colgroup>
            <col style={{ width: 'auto' }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 150 }} />
            {showMargin && <col style={{ width: 72 }} />}
            <col style={{ width: 80 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('route')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.route', 'Route')}
                  <SortIcon sortKey="route" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('stops')}>
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
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('scope')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.scope', 'Scope')}
                  <SortIcon sortKey="scope" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('effective')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.effective', 'Effective')}
                  <SortIcon sortKey="effective" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              {showMargin && (
                <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('margin')}>
                  <span className="flex items-center gap-1">
                    {t('priceLists.col.margin', 'Margin %')}
                    <SortIcon sortKey="margin" currentSort={sortKey} currentDir={sortDir} />
                  </span>
                </th>
              )}
              <th style={thStyle} className="cursor-pointer" onClick={() => handleSort('updated')}>
                <span className="flex items-center gap-1">
                  {t('priceLists.col.updated', 'Updated')}
                  <SortIcon sortKey="updated" currentSort={sortKey} currentDir={sortDir} />
                </span>
              </th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: showMargin ? 11 : 10 }).map((_, colIdx) => (
                    <td key={colIdx} style={{ ...tdStyle, borderBottom: `1px solid ${T.bd}` }}>
                      <Skeleton
                        width={
                          colIdx === 0 ? 180
                            : colIdx === 3 ? 64
                              : colIdx === 4 ? 88
                                : 52
                        }
                        height={colIdx === 0 ? 32 : 14}
                        baseColor={T.bg}
                        highlightColor={T.sf}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={showMargin ? 11 : 10} style={{ ...tdStyle, textAlign: 'center', padding: 40, color: T.t3 }}>
                  {isEmptyCatalog
                    ? t('priceLists.empty.noLanesYet', 'No price lanes yet. Add your first lane to get started.')
                    : t('priceLists.empty.noLanes', 'No lanes match your filters.')}
                </td>
              </tr>
            ) : pageData.map((lane) => {
              const price = getPrimaryPrice(lane);
              const pricingRows = resolveLanePricingRows(lane);
              const primaryMetric = getPrimaryMetricKey(lane);
              const metricInfo = METRIC_PILL[primaryMetric] || METRIC_PILL.load_any_size;
              const extraMetricCount = Math.max(0, pricingRows.length - 1);
              const statusInfo = STATUS_PILL[lane.status] || STATUS_PILL.active;
              const isSelected = selectedId === lane.id;
              const expiring = isExpiringSoon(lane);
              const profitability = showMargin ? calcProfitability(lane) : null;

              // Route display with bilingual support and country code resolution
              const routeDisplay = formatRouteLabel(lane, lang);

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
                  <td style={{ ...tdStyle, overflow: 'hidden' }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={routeDisplay}
                    >
                      {routeDisplay}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      <span style={{ fontSize: 10, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>{lane.id}</span>
                      {lane.isRoundTrip && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#DBEAFE', color: '#2563EB', flexShrink: 0 }}>
                          {t('priceLists.badge.roundTrip', 'RT')}
                        </span>
                      )}
                      {lane.stops.length > 2 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#EDE9FE', color: '#7C3AED', flexShrink: 0 }}>
                          {t('priceLists.badge.multiStop', 'Multi')}
                        </span>
                      )}
                      {expiring && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#FEF3C7', color: '#92400E', flexShrink: 0 }}>
                          ⏰
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
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
                  <td style={{ ...tdStyle, overflow: 'hidden' }}>
                    <span className="inline-flex items-center gap-1 max-w-full min-w-0">
                      <span
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: metricInfo.bg, color: metricInfo.fg,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                        }}
                        title={formatMetricLabel(primaryMetric, t)}
                      >
                        {formatMetricLabel(primaryMetric, t)}
                      </span>
                      {extraMetricCount > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: T.t3, flexShrink: 0 }}>
                          {t('priceLists.col.metricMultiple', '+{{count}}').replace('{{count}}', String(extraMetricCount))}
                        </span>
                      )}
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
                  <td style={{ ...tdStyle, overflow: 'hidden' }}>
                    <span
                      style={{ fontSize: 11, color: T.t2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={formatScopeDisplay(lane, t)}
                    >
                      {formatScopeDisplay(lane, t)}
                      {lane.scopeDirection && (
                        <span style={{ fontSize: 9, marginLeft: 4, fontWeight: 600, color: lane.scopeDirection === 'sell' ? '#059669' : '#DC2626' }}>
                          ({lane.scopeDirection === 'sell' ? '↑ Sell' : '↓ Buy'})
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, overflow: 'hidden' }}>
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: T.t2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatDisplayDate(lane.effectiveFrom?.slice(0, 10) || '')}
                      {lane.effectiveTo
                        ? ` → ${formatDisplayDate(lane.effectiveTo.slice(0, 10))}`
                        : ` → ${t('priceLists.validity.openEnded', '∞')}`}
                    </span>
                  </td>
                  {showMargin && (
                    <td style={tdStyle}>
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
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: T.t3 }}>{formatIsoDisplayDateTime(lane.updatedAt) || '—'}</span>
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
        totalCount={totalCount}
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

function RowMenu({ lane, T, t, onAction, onClose }) {
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
