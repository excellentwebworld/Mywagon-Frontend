/**
 * DetailPane — Price Lists detail drawer (420px, right-slide).
 *
 * Sections: Hero, Route Legs, Pricing, Profitability (carrier),
 * Margin Analysis (forwarder), Quote Calculator, History, Footer Actions.
 *
 * @API: GET /api/v1/price-lists/:id
 * @API: GET /price-lists/audit-log?lane_id=:id
 */
import { useState, useMemo, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import {
  getPrimaryPrice, isExpiringSoon,
  calcProfitability, cityLabel, formatRouteLabel, formatScopeDisplay,
  getScopeLabels,
} from '../../../mocks/priceListsData';
import {
  formatMetricLabel,
  formatMetricValueLabel,
  resolveLanePricingRows,
} from '../../../api/utils/laneMetricDisplay';
import { formatDisplayDate, formatIsoDisplayDateTime } from '../../../utils/dateDisplay';
import { priceListsService } from '../../../api/services/priceListsService';

const MARGIN_COLORS = { good: '#059669', ok: '#F59E0B', bad: '#DC2626' };

function marginColor(pct) {
  if (pct > 20) return MARGIN_COLORS.good;
  if (pct > 5) return MARGIN_COLORS.ok;
  return MARGIN_COLORS.bad;
}

function OpenEndedInfinity({ color }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: '1.35em',
        fontWeight: 600,
        lineHeight: 1,
        verticalAlign: 'middle',
        display: 'inline-block',
        color,
      }}
    >
      ∞
    </span>
  );
}

export default function DetailPane({ lane, onClose, role, onAction, allLanes, partnerNameById }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language;

  const [openSections, setOpenSections] = useState({
    scope: true, legs: true, pricing: true,
    profitability: false, marginAnalysis: false,
    calculator: false, history: false,
  });
  const [laneHistory, setLaneHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const toggle = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const marginPair = useMemo(() => {
    if (!lane || role !== 'forwarder') return null;
    const routeKey = lane.stops.map((s) => s.city).join('-');
    const otherDir = lane.scopeDirection === 'sell' ? 'buy' : 'sell';
    const match = allLanes?.find((l) =>
      l.id !== lane.id &&
      l.scopeDirection === otherDir &&
      l.stops.map((s) => s.city).join('-') === routeKey &&
      l.status === 'active'
    );
    if (!match) return null;
    const sellPrice = lane.scopeDirection === 'sell' ? getPrimaryPrice(lane) : getPrimaryPrice(match);
    const buyPrice = lane.scopeDirection === 'buy' ? getPrimaryPrice(lane) : getPrimaryPrice(match);
    const gross = sellPrice - buyPrice;
    const pct = sellPrice > 0 ? (gross / sellPrice) * 100 : 0;
    return { sellPrice, buyPrice, gross, pct, matchId: match.id };
  }, [lane, allLanes, role]);

  useEffect(() => {
    let cancelled = false;
    if (!lane?.apiId) {
      setLaneHistory([]);
      setHistoryTotal(0);
      return undefined;
    }
    (async () => {
      setHistoryLoading(true);
      try {
        const result = await priceListsService.listAuditLog({
          lane_id: lane.apiId,
          per_page: 10,
          page: 1,
        });
        if (!cancelled) {
          setLaneHistory(result.items || []);
          setHistoryTotal(result.meta?.total ?? result.items?.length ?? 0);
        }
      } catch (_e) {
        if (!cancelled) {
          setLaneHistory([]);
          setHistoryTotal(0);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lane?.apiId, lane?.updatedAt]);

  const pricingRows = useMemo(() => (lane ? resolveLanePricingRows(lane) : []), [lane]);

  const scopePartnerNames = useMemo(() => {
    if (!lane?.scopePartnerIds?.length) return [];
    return getScopeLabels(lane.scopePartnerIds, partnerNameById);
  }, [lane?.scopePartnerIds, partnerNameById]);

  const scopeDisplayFull = useMemo(
    () => (lane ? formatScopeDisplay(lane, t, partnerNameById, { full: true }) : ''),
    [lane, t, partnerNameById],
  );

  if (!lane) return null;

  const expiring = isExpiringSoon(lane);
  const profitability = role === 'carrier' ? calcProfitability(lane) : null;
  const routeDisplay = formatRouteLabel(lane, lang);

  return (
    <div
      className="shrink-0 overflow-y-auto overflow-x-hidden flex flex-col"
      style={{
        width: 420,
        borderLeft: `1px solid ${T.bd}`,
        background: T.sf,
      }}
    >
      {/* ─── Hero ─── */}
      <div className="p-4" style={{ borderBottom: `1px solid ${T.bd}` }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, lineHeight: 1.3 }}>
              {routeDisplay}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {lane.isRoundTrip && <Badge bg="#DBEAFE" fg="#2563EB">{t('priceLists.badge.roundTrip', 'RT')}</Badge>}
              {lane.stops.length > 2 && <Badge bg="#EDE9FE" fg="#7C3AED">{t('priceLists.badge.multiStop', 'Multi')}</Badge>}
              <Badge bg={({ active: '#D1FAE5', inactive: '#F3F4F6', archived: '#FEF3C7' })[lane.status]}
                     fg={({ active: '#059669', inactive: '#6B7280', archived: '#92400E' })[lane.status]}>
                {t(`priceLists.status.${lane.status}`, lane.status)}
              </Badge>
              {(lane.scope !== 'default' || (lane.scopePartnerIds?.length ?? 0) > 0) && (
                <Badge
                  bg="#F0F9FF"
                  fg="#0EA5E9"
                  title={scopePartnerNames.length > 3 ? scopeDisplayFull : undefined}
                >
                  {formatScopeDisplay(lane, t, partnerNameById)}
                </Badge>
              )}
              {lane.scopeDirection && (
                <Badge bg={lane.scopeDirection === 'sell' ? '#D1FAE5' : '#FEE2E2'}
                       fg={lane.scopeDirection === 'sell' ? '#059669' : '#DC2626'}>
                  {lane.scopeDirection === 'sell' ? '↑ Sell' : '↓ Buy'}
                </Badge>
              )}
              {expiring && <Badge bg="#FEF3C7" fg="#92400E">⏰ {t('priceLists.badge.expiring', 'Expiring')}</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="border-none cursor-pointer bg-transparent p-1 rounded" style={{ color: T.t3 }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <span style={{ fontSize: 10, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>{lane.id}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: "'JetBrains Mono', monospace" }}>{lane.totalKm.toLocaleString()} km</span>
          <span style={{ fontSize: 11, color: T.t3 }}>
            {formatDisplayDate(lane.effectiveFrom?.slice(0, 10) || '')}
            {lane.effectiveTo
              ? ` → ${formatDisplayDate(lane.effectiveTo.slice(0, 10))}`
              : (
                <>
                  {' → '}
                  <OpenEndedInfinity color={T.t3} />
                </>
              )}
          </span>
        </div>
      </div>

      {/* ─── Sections ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Scope — specific partners */}
        {scopePartnerNames.length > 0 && (
          <Section
            title={t('priceLists.detail.scope', 'Scope')}
            sectionKey="scope"
            count={scopePartnerNames.length}
            open={openSections.scope}
            onToggle={toggle}
            T={T}
          >
            <div className="flex flex-wrap gap-1.5">
              {scopePartnerNames.map((name, idx) => (
                <span
                  key={lane.scopePartnerIds[idx] ?? idx}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: '#F0F9FF',
                    color: '#0369A1',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Route Legs */}
        <Section title={t('priceLists.detail.routeLegs', 'Route legs')} sectionKey="legs"
          open={openSections.legs} onToggle={toggle} T={T}>
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: T.t3, fontWeight: 600, padding: '4px 0', fontSize: 10 }}>{t('priceLists.detail.from', 'From')}</th>
                <th style={{ color: T.t3, fontWeight: 600, padding: '4px 0', fontSize: 10 }} />
                <th style={{ textAlign: 'left', color: T.t3, fontWeight: 600, padding: '4px 0', fontSize: 10 }}>{t('priceLists.detail.to', 'To')}</th>
                <th style={{ textAlign: 'right', color: T.t3, fontWeight: 600, padding: '4px 0', fontSize: 10 }}>km</th>
              </tr>
            </thead>
            <tbody>
              {lane.legs.map((leg, i) => (
                <tr key={i} style={{ opacity: leg.isReturn ? 0.55 : 1 }}>
                  <td style={{ padding: '4px 0', color: T.t1 }}>{cityLabel(leg.from, lang)}</td>
                  <td style={{ padding: '4px 4px', color: T.t3 }}><ArrowRight size={12} /></td>
                  <td style={{ padding: '4px 0', color: T.t1 }}>{cityLabel(leg.to, lang)}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: T.t1 }}>
                    {leg.km ? leg.km.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `1px solid ${T.bd}`, fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '6px 0', color: T.t1 }}>{t('common.total', 'Total')}</td>
                <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: T.t1, padding: '6px 0' }}>
                  {lane.totalKm.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </Section>

        {/* Pricing */}
        <Section title={t('priceLists.detail.pricing', 'Pricing')} sectionKey="pricing"
          open={openSections.pricing} onToggle={toggle} T={T}>
          {pricingRows.length === 0 ? (
            <div style={{ fontSize: 12, color: T.t3, padding: '8px 0' }}>
              {t('priceLists.detail.noPricing', 'No pricing configured.')}
            </div>
          ) : (
            <div className="space-y-1.5">
              {pricingRows.map((row, idx) => (
                <PriceLine
                  key={`${row.metric}-${idx}`}
                  T={T}
                  label={`${formatMetricLabel(row.metric, t)} · ${formatMetricValueLabel(row.metric, row.metricValue, t)}`}
                  value={`€${Number(row.priceEur || 0).toLocaleString(undefined, { minimumFractionDigits: Number(row.priceEur) < 10 ? 2 : 0 })}`}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Profitability — carrier only */}
        {role === 'carrier' && profitability && (
          <Section title={t('priceLists.detail.profitability', 'Profitability')} sectionKey="profitability"
            open={openSections.profitability} onToggle={toggle} T={T}>
            <div className="space-y-1.5">
              <PriceLine T={T} label={t('priceLists.profitability.revenue', 'Revenue')} value={`€${profitability.revenue.toFixed(2)}`} bold />
              <div style={{ height: 1, background: T.bd, margin: '4px 0' }} />
              <PriceLine T={T} label={t('priceLists.profitability.fuel', 'Fuel')} value={`−€${profitability.fuel.toFixed(2)}`} />
              <PriceLine T={T} label={t('priceLists.profitability.driver', 'Driver')} value={`−€${profitability.driver.toFixed(2)}`} />
              <PriceLine T={T} label={t('priceLists.profitability.maintenance', 'Maintenance')} value={`−€${profitability.maintenance.toFixed(2)}`} />
              <PriceLine T={T} label={t('priceLists.profitability.depreciation', 'Depreciation')} value={`−€${profitability.depreciation.toFixed(2)}`} />
              <PriceLine T={T} label={t('priceLists.profitability.insurance', 'Insurance')} value={`−€${profitability.insurance.toFixed(2)}`} />
              <div style={{ height: 1, background: T.bd, margin: '4px 0' }} />
              <PriceLine T={T} label={t('priceLists.profitability.totalCost', 'Total cost')} value={`€${profitability.totalCost.toFixed(2)}`} />
              <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{t('priceLists.profitability.netMargin', 'Net margin')}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: marginColor(profitability.marginPct) }}>
                    €{profitability.margin.toFixed(2)}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: marginColor(profitability.marginPct) + '1A',
                    color: marginColor(profitability.marginPct),
                  }}>
                    {profitability.marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Margin Analysis — forwarder only */}
        {role === 'forwarder' && (
          <Section title={t('priceLists.detail.marginAnalysis', 'Margin analysis')} sectionKey="marginAnalysis"
            open={openSections.marginAnalysis} onToggle={toggle} T={T}>
            {marginPair ? (
              <div className="space-y-1.5">
                <PriceLine T={T} label={t('priceLists.marginAnalysis.sellPrice', 'Sell price')} value={`€${marginPair.sellPrice}`} />
                <PriceLine T={T} label={t('priceLists.marginAnalysis.buyPrice', 'Buy price')} value={`€${marginPair.buyPrice}`} />
                <div style={{ height: 1, background: T.bd, margin: '4px 0' }} />
                <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{t('priceLists.marginAnalysis.grossMargin', 'Gross margin')}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: marginColor(marginPair.pct) }}>
                      €{marginPair.gross.toFixed(2)}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: marginColor(marginPair.pct) + '1A',
                      color: marginColor(marginPair.pct),
                    }}>
                      {marginPair.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: T.t3, padding: '8px 0' }}>
                {lane.scopeDirection
                  ? t('priceLists.marginAnalysis.addOther', `Add a ${lane.scopeDirection === 'sell' ? 'buy' : 'sell'} rate to see margin.`)
                  : t('priceLists.marginAnalysis.noDirection', 'Set scope direction (sell/buy) to enable margin analysis.')}
              </div>
            )}
          </Section>
        )}

        {/* History */}
        <Section
          title={t('priceLists.detail.history', 'History')}
          sectionKey="history"
          count={historyLoading ? null : historyTotal}
          open={openSections.history}
          onToggle={toggle}
          T={T}
        >
          {historyLoading ? (
            <div style={{ fontSize: 12, color: T.t3, padding: '8px 0' }}>
              {t('common.loading', 'Loading…')}
            </div>
          ) : laneHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: T.t3, padding: '8px 0' }}>
              {t('priceLists.detail.noHistory', 'No history available.')}
            </div>
          ) : (
            <div className="space-y-2">
              {laneHistory.map((entry) => (
                <div key={entry.id} className="flex gap-2" style={{ fontSize: 11 }}>
                  <span style={{ fontSize: 10, color: T.t3, fontFamily: "'JetBrains Mono', monospace", minWidth: 110, whiteSpace: 'nowrap' }}>
                    {formatIsoDisplayDateTime(entry.ts)}
                  </span>
                  <span className="min-w-0">
                    <span style={{ color: T.t2, display: 'block' }}>{entry.details}</span>
                    {entry.actor && (
                      <span style={{ color: T.t3, fontSize: 10 }}>{entry.actor}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Notes */}
        {lane.notes && (
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.bd}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.t3 }}>{t('priceLists.detail.notes', 'Notes')}</span>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>{lane.notes}</p>
          </div>
        )}
      </div>

      {/* ─── Footer Actions ─── */}
      <div className="shrink-0 flex items-center gap-2 p-3 flex-wrap" style={{ borderTop: `1px solid ${T.bd}`, background: T.sh }}>
        <ActionBtn T={T} onClick={() => onAction('edit', lane)}>✏️ {t('common.edit', 'Edit')}</ActionBtn>
        <ActionBtn T={T} onClick={() => onAction('duplicate', lane)}>📋 {t('priceLists.actions.duplicate', 'Duplicate')}</ActionBtn>
        {lane.status === 'active' && <ActionBtn T={T} onClick={() => onAction('deactivate', lane)}>⏸️ {t('priceLists.actions.deactivate', 'Deactivate')}</ActionBtn>}
        {lane.status === 'inactive' && <ActionBtn T={T} onClick={() => onAction('activate', lane)}>▶️ {t('priceLists.actions.activate', 'Activate')}</ActionBtn>}
        {lane.status !== 'archived'
          ? <ActionBtn T={T} onClick={() => onAction('archive', lane)}>🗄️ {t('priceLists.actions.archive', 'Archive')}</ActionBtn>
          : (
            <>
              <ActionBtn T={T} onClick={() => onAction('reactivate', lane)}>♻️ {t('priceLists.actions.reactivate', 'Reactivate')}</ActionBtn>
              <ActionBtn T={T} onClick={() => onAction('deleteForever', lane)} danger>🗑️ {t('priceLists.actions.deleteForever', 'Delete forever')}</ActionBtn>
            </>
          )}
      </div>
    </div>
  );
}

function Section({ title, sectionKey, open, onToggle, T, children, count = null }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.bd}` }}>
      <button
        onClick={() => onToggle(sectionKey)}
        className="flex items-center justify-between w-full border-none cursor-pointer bg-transparent"
        style={{ padding: '10px 16px' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = T.sh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{title}</span>
        <span className="flex items-center gap-2 shrink-0">
          {count != null && (
            <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>
              ({count})
            </span>
          )}
          {open ? <ChevronDown size={14} style={{ color: T.t3 }} /> : <ChevronRight size={14} style={{ color: T.t3 }} />}
        </span>
      </button>
      {open && <div style={{ padding: '0 16px 12px' }}>{children}</div>}
    </div>
  );
}

function PriceLine({ T, label, value, sub, muted, bold }) {
  return (
    <div className="flex items-baseline justify-between" style={{ padding: '2px 0' }}>
      <span style={{ fontSize: 12, color: muted ? T.t3 : T.t2, fontStyle: muted ? 'italic' : 'normal' }}>{label}</span>
      <div className="text-right">
        <span style={{
          fontSize: 12, fontWeight: bold ? 700 : 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: muted ? T.t3 : T.t1,
          fontStyle: muted ? 'italic' : 'normal',
        }}>
          {value}
        </span>
        {sub && <div style={{ fontSize: 10, color: T.t3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Badge({ bg, fg, children, title }) {
  return (
    <span
      title={title}
      style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function ActionBtn({ T, children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-none cursor-pointer"
      style={{
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 600,
        background: danger ? '#FEE2E2' : T.sa,
        color: danger ? '#DC2626' : T.t1,
        border: `1px solid ${danger ? '#FECACA' : T.bd}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? '#FCA5A5' : T.sh; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = danger ? '#FEE2E2' : T.sa; }}
    >
      {children}
    </button>
  );
}
