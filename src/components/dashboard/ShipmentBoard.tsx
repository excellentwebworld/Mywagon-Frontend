import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ListShipmentsParams, ShipmentKpiKey } from '../../api/types/shipments';
import type { Shipment } from '../../context/AppContext';
import { useShipmentsList } from '../../hooks/useShipments';
import { useTranslation } from '../../hooks/useTranslation';
import {
  formatEuro,
  statusBadgeClass,
} from '../../pages/ManageShipments/utils/listingUtils';
import { DashUpgradeBlock, translateDashMessage } from './dashErrorUtils';
import { DashBoardSkeleton } from './DashboardSkeletons';
import { BoardRowExpand } from './BoardRowExpand';

interface ShipmentBoardProps {
  activeTab: number;
  setActiveTab: (idx: number) => void;
  selectedShipmentId?: number | null;
  onSelectShipment?: (id: number) => void;
}

const PER_PAGE = 5;

type BoardTabDef =
  | { key: string; labelKey: string; warn?: boolean; filter: { kpi: ShipmentKpiKey } }
  | { key: string; labelKey: string; warn?: boolean; filter: { status: string } };

const BOARD_TABS: BoardTabDef[] = [
  { key: 'needs_action', labelKey: 'needsActionLabel', warn: true, filter: { kpi: 'needs_action' } },
  { key: 'awaiting_response', labelKey: 'awaitingResponse', filter: { kpi: 'awaiting_response' } },
  { key: 'at_risk', labelKey: 'kpiAtRisk', filter: { kpi: 'at_risk' } },
  { key: 'upcoming', labelKey: 'upcoming', filter: { kpi: 'upcoming' } },
  { key: 'on_trip', labelKey: 'on_trip', filter: { status: 'on_trip' } },
  { key: 'past_due', labelKey: 'kpiPastDue', warn: true, filter: { status: 'past_due' } },
];

function manageShipmentsHref(tabIndex: number): string {
  const tab = BOARD_TABS[tabIndex] ?? BOARD_TABS[3];
  if ('kpi' in tab.filter) return `/shipments?kpi=${tab.filter.kpi}`;
  return `/shipments?status=${tab.filter.status}`;
}

function tabCount(
  tab: BoardTabDef,
  summary: { kpis?: Record<string, number>; statuses?: Record<string, number> }
): number {
  if ('kpi' in tab.filter) return summary.kpis?.[tab.filter.kpi] ?? 0;
  return summary.statuses?.[tab.filter.status] ?? 0;
}

export const ShipmentBoard: React.FC<ShipmentBoardProps> = ({
  activeTab,
  setActiveTab,
  selectedShipmentId,
  onSelectShipment,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, Shipment>>({});

  const safeTab = BOARD_TABS[activeTab] ? activeTab : 3;
  const activeDef = BOARD_TABS[safeTab];

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [safeTab]);

  const summaryParams = useMemo(
    (): Omit<ListShipmentsParams, 'page' | 'per_page'> => ({
      direction: 'outbound',
    }),
    []
  );

  const listParams = useMemo((): ListShipmentsParams => {
    const base: ListShipmentsParams = {
      direction: 'outbound',
      page,
      per_page: PER_PAGE,
      sort: 'earliest_first_pickup_time',
    };
    if ('kpi' in activeDef.filter) {
      return { ...base, kpi: activeDef.filter.kpi };
    }
    return { ...base, status: activeDef.filter.status };
  }, [activeDef, page]);

  const { shipments, meta, summary, loading, error, upgradeUrl } = useShipmentsList(
    listParams,
    summaryParams,
    true,
    0,
    true
  );

  const handleCache = useCallback((shipment: Shipment) => {
    setDetailCache((prev) => ({ ...prev, [shipment.id]: shipment }));
  }, []);

  useEffect(() => {
    if (selectedShipmentId == null && shipments.length > 0 && onSelectShipment) {
      onSelectShipment(Number(shipments[0].id));
    }
  }, [shipments, selectedShipmentId, onSelectShipment]);

  const total = meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const startItem = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const endItem = Math.min(page * PER_PAGE, total);
  const visibleShipments = shipments.slice(0, PER_PAGE);

  return (
    <div className="card a d4" id="boardCard">
      <div className="card-hd board-card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span>{t('manageShipments')}</span>
        </h3>
        <Link to={manageShipmentsHref(safeTab)} className="card-link">
          {t('manageShipments')} →
        </Link>
      </div>

      <div className="board-tabs" id="boardTabs">
        {BOARD_TABS.map((tab, idx) => {
          const count = tabCount(tab, summary);
          return (
            <div
              key={tab.key}
              className={`b-tab ${safeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab(idx);
                }
              }}
            >
              <span>{t(tab.labelKey)}</span>
              <span className={`tc${tab.warn ? ' warn' : ''}`}>{count}</span>
            </div>
          );
        })}
      </div>

      <div style={{ overflowX: 'auto' }} id="boardTableWrap">
        <table className="bt" id="boardTable">
          <thead>
            <tr>
              <th>{t('shipmentIdCol')}</th>
              <th>{t('laneColHeader')}</th>
              <th>{t('status')}</th>
              <th>{t('boardRate')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <DashBoardSkeleton rows={PER_PAGE} />}

            {!loading && error && (
              <tr>
                <td colSpan={5} className="board-empty-cell">
                  {upgradeUrl ? (
                    <DashUpgradeBlock upgradeUrl={upgradeUrl} t={t} compact />
                  ) : (
                    translateDashMessage(t, error)
                  )}
                </td>
              </tr>
            )}

            {!loading && !error && visibleShipments.length === 0 && (
              <tr>
                <td colSpan={5} className="board-empty-cell">
                  {t('boardEmpty')}
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              visibleShipments.map((row) => {
                const isExpanded = expandedId === row.id;
                const badgeClass = statusBadgeClass(row.status, Boolean(row.at_risk), {
                  bidsReceived: row.bidsReceived ?? 0,
                  bidsSent: row.bidsSent ?? 0,
                  interestedCount: row.interestedCount ?? 0,
                  awaitingResponse: Boolean(row.awaitingResponse),
                  needsAction: Boolean(row.needsAction),
                });
                const rate = formatEuro(row.agreedPrice ?? row.quotedPrice ?? row.price) ?? '—';

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={isExpanded ? 'selected' : ''}
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    >
                      <td className="c-sid">{row.autoId || row.id}</td>
                      <td className="c-lane">
                        {row.origin || '—'} <span className="arr">→</span> {row.dest || '—'}
                      </td>
                      <td>
                        <span className={`status-box-wrap${row.at_risk ? ' is-at-risk' : ''}`}>
                          {row.status === 'partially_fullfilled' ? (
                            <span className={`${badgeClass} status-box--partial-compact`}>
                              <span className="status-partial-left">{t('partially')}</span>
                              <span className="status-partial-right">{t('fulfilled')}</span>
                            </span>
                          ) : (
                            <span className={badgeClass}>{t(row.status)}</span>
                          )}
                        </span>
                      </td>
                      <td className="c-price">{rate}</td>
                      <td className="c-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title={t('viewOnMap', 'View on Map')}
                          onClick={() => {
                            if (onSelectShipment) {
                              onSelectShipment(Number(row.id));
                              const mapEl = document.querySelector('.map-wrap');
                              if (mapEl) {
                                mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            } else {
                              navigate(`/shipments/${row.id}`);
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title={isExpanded ? t('collapse') : t('expand')}
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    <tr className={`expand-row ${isExpanded ? 'open' : ''}`}>
                      <td colSpan={5}>
                        {isExpanded && (
                          <BoardRowExpand
                            shipmentId={row.id}
                            listShipment={row}
                            cached={detailCache[row.id] ?? null}
                            onCached={handleCache}
                          />
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="pag">
        <div className="pag-info">
          {total === 0
            ? t('boardEmpty')
            : t('boardShowing', { start: startItem, end: endItem, total })}
        </div>
        <div className="pag-btns">
          <button
            type="button"
            className="pag-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </button>
          <span className="pag-page">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="pag-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
