import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { BOARD_DATA, TAB_COUNTS } from './mockData';
import type { BoardItem } from './types';
import { Pagination } from '../../components/ui/Pagination';

interface ShipmentBoardProps {
  activeTab: number;
  setActiveTab: (idx: number) => void;
}

export const ShipmentBoard: React.FC<ShipmentBoardProps> = ({ activeTab, setActiveTab }) => {
  const { showToast } = useApp();
  const { t, lang } = useTranslation();

  // Component states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortType, setSortType] = useState<'rate' | 'date' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const rawData = BOARD_DATA[activeTab] || [];
  const totalItemsCount = TAB_COUNTS[activeTab]; // match design total counts
  const itemsPerPage = activeTab === 1 || activeTab === 3 ? 6 : 25;

  // Reset page, selections, expansions, and sorting when active tab changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows(new Set());
    setExpandedRow(null);
    setSortType(null);
    setSortDirection(null);
  }, [activeTab]);

  // Handle Select All checkbox change
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageItems = getPaginatedData();
      const sids = new Set<string>(currentPageItems.map(item => item.sid));
      setSelectedRows(sids);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (sid: string, checked: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(sid);
      } else {
        next.delete(sid);
      }
      return next;
    });
  };

  const handleSort = (type: 'rate' | 'date') => {
    if (sortType === type) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortType(null);
        setSortDirection(null);
      }
    } else {
      setSortType(type);
      setSortDirection('asc');
    }
  };

  // Sort and Paginate Data
  const getSortedData = (): BoardItem[] => {
    if (!sortType || !sortDirection) return rawData;
    const sorted = [...rawData];
    if (sortType === 'rate') {
      sorted.sort((a, b) => {
        return sortDirection === 'asc' ? a.rate - b.rate : b.rate - a.rate;
      });
    } else if (sortType === 'date') {
      sorted.sort((a, b) => {
        return sortDirection === 'asc' ? a.sortDate - b.sortDate : b.sortDate - a.sortDate;
      });
    }
    return sorted;
  };

  const getPaginatedData = (): BoardItem[] => {
    const sorted = getSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  };

  const paginatedData = getPaginatedData();

  // Dynamic values for pagination
  const totalPages = Math.ceil(rawData.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(startItem + paginatedData.length - 1, totalItemsCount);

  // Handle bulk action
  const handleBulkAction = (action: string) => {
    showToast(t('bulkAction', { action, count: selectedRows.size }), 'info');
  };

  // Handle action click
  const handleActionClick = (actionName: string, sid: string) => {
    showToast(t('actionForShipment', { action: actionName, sid }), 'success');
  };

  return (
    <div className="card a d4" style={{ marginBottom: '20px' }} id="boardCard">
      {/* Board tabs */}
      <div className="board-tabs" id="boardTabs">
        <div className={`b-tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
          <span>{t('needsActionLabel')}</span>
          <span className="tc warn">{TAB_COUNTS[0]}</span>
        </div>
        <div className={`b-tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          <span>{t('upcoming')}</span>
          <span className="tc">{TAB_COUNTS[1]}</span>
        </div>
        <div className={`b-tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
          <span>{t('boardInTransit')}</span>
          <span className="tc">{TAB_COUNTS[2]}</span>
        </div>
        <div className={`b-tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>
          <span>{t('boardDeliveredTab')}</span>
          <span className="tc">{TAB_COUNTS[3]}</span>
        </div>
        <div className={`b-tab ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>
          <span>{t('boardBilling')}</span>
          <span className="tc">{TAB_COUNTS[4]}</span>
        </div>
      </div>

      {/* Board toolbar */}
      <div className="board-toolbar">
        <div className="board-toolbar-left">
          <label className="board-select-all">
            <input
              type="checkbox"
              id="selectAllCheck"
              checked={paginatedData.length > 0 && paginatedData.every(item => selectedRows.has(item.sid))}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span>{t('boardSelectAll')}</span>
          </label>
        </div>
        <div className="board-toolbar-right">
          <button
            className={`board-sort-btn ${sortType === 'rate' ? 'active' : ''}`}
            onClick={() => handleSort('rate')}
            title="Sort by rate"
          >
            € {t('boardRate')} <span className="sort-icon">{sortType === 'rate' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>
          <button
            className={`board-sort-btn ${sortType === 'date' ? 'active' : ''}`}
            onClick={() => handleSort('date')}
            title="Sort by date"
          >
            📅 {t('boardDate')} <span className="sort-icon">{sortType === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }} id="boardTableWrap">
        <table className="bt" id="boardTable">
          <thead>
            <tr>
              <th className="c-check" style={{ cursor: 'default' }}></th>
              <th>{t('shipmentIdCol')} <span className="sort-icon">↕</span></th>
              <th>{t('laneColHeader')} <span className="sort-icon">↕</span></th>
              <th>{t('status')} <span className="sort-icon">↕</span></th>
              <th>{t('boardNextMilestone')} <span className="sort-icon">↕</span></th>
              <th>{t('carrierCol')} <span className="sort-icon">↕</span></th>
              <th>{t('boardRate')} <span className="sort-icon">↕</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody id="boardBody">
            {paginatedData.map((r) => {
              const isSelected = selectedRows.has(r.sid);
              const isExpanded = expandedRow === r.sid;

              // Action buttons per status inside expanded details
              let actionBtns = (
                <button className="expand-btn" onClick={() => handleActionClick("Full Details", r.sid)}>
                  📋 {t('boardFullDetails')}
                </button>
              );

              if (r.status === 'pending' || r.status === 'action') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn primary" onClick={() => handleActionClick("Resolve Now", r.sid)}>
                      ⚡ {t('boardResolveNow')}
                    </button>
                    <button className="expand-btn warn" onClick={() => handleActionClick("Call Carrier", r.sid)}>
                      📞 {t('boardCallCarrier')}
                    </button>
                  </>
                );
              } else if (r.status === 'transit' || r.status === 'delayed') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn primary" onClick={() => handleActionClick("Live Track", r.sid)}>
                      📍 {t('liveTracking')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Message", r.sid)}>
                      💬 {t('boardMessage')}
                    </button>
                  </>
                );
              } else if (r.status === 'upcoming') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn" onClick={() => handleActionClick("Edit", r.sid)}>
                      ✏️ {t('edit')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Clone", r.sid)}>
                      📄 {t('boardClone')}
                    </button>
                  </>
                );
              } else if (r.status === 'delivered') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn" onClick={() => handleActionClick("View POD", r.sid)}>
                      📸 {t('boardViewPod')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Invoice", r.sid)}>
                      📥 {t('boardInvoice')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Rate Carrier", r.sid)}>
                      ⭐ {t('boardRateCarrier')}
                    </button>
                  </>
                );
              } else if (r.status === 'billing') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn primary" onClick={() => handleActionClick("Resolve", r.sid)}>
                      💳 {t('boardResolve')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Invoice", r.sid)}>
                      📥 {t('boardInvoice')}
                    </button>
                  </>
                );
              }

              // Milestone Progress Step
              let progressHtml = null;
              if (r.status === 'transit' || r.status === 'delayed') {
                progressHtml = (
                  <div className="expand-progress">
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardBooked')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardPickedUp')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot active"></div>{t('boardInTransit')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{t('boardDeliveredStep')}</div>
                  </div>
                );
              } else if (r.status === 'delivered') {
                progressHtml = (
                  <div className="expand-progress">
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardBooked')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardPickedUp')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardInTransit')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardDeliveredStep')}</div>
                  </div>
                );
              } else if (r.status === 'upcoming') {
                progressHtml = (
                  <div className="expand-progress">
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{t('boardBooked')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{t('boardPickedUp')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{t('boardInTransit')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{t('boardDeliveredStep')}</div>
                  </div>
                );
              }

              return (
                <React.Fragment key={r.sid}>
                  <tr
                    className={isSelected ? 'selected' : ''}
                    onClick={() => setExpandedRow(isExpanded ? null : r.sid)}
                  >
                    <td className="c-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleRowSelect(r.sid, e.target.checked)}
                      />
                    </td>
                    <td className="c-sid">{r.sid}</td>
                    <td className="c-lane">{r.from} <span className="arr">→</span> {r.to}</td>
                    <td>
                      <span className={`sched-status ${r.statusClass}`}>
                        <span className="sts-dot"></span>
                        {r.statusLabel[lang] || r.statusLabel.en}
                      </span>
                    </td>
                    <td className="c-milestone">
                      {r.ms[lang] || r.ms.en} <span className="dt">{r.dt[lang] || r.dt.en}</span>
                    </td>
                    <td>
                      <div className="c-carrier">
                        <span className="c-carrier-av">{r.ci}</span>
                        {r.carrier}
                      </div>
                    </td>
                    <td className="c-price">€ {r.rate}</td>
                    <td className="c-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        title="Track"
                        onClick={() => handleActionClick("Track Icon Clicked", r.sid)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </button>
                      <button
                        title="Message"
                        onClick={() => handleActionClick("Message Icon Clicked", r.sid)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </button>
                      <button
                        title="Expand"
                        onClick={() => setExpandedRow(isExpanded ? null : r.sid)}
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

                  {/* Expanded Row */}
                  <tr className={`expand-row ${isExpanded ? 'open' : ''}`}>
                    <td colSpan={8}>
                      <div className="expand-content">
                        <div className="expand-grid">
                          <div className="expand-section">
                            <div className="expand-section-title">{t('boardShipmentDetails')}</div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('boardReference')}</span>
                              <span className="expand-field-value mono">{r.ref}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('boardVehicle')}</span>
                              <span className="expand-field-value">{r.vehicle[lang] || r.vehicle.en}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('weight')}</span>
                              <span className="expand-field-value">{r.weight[lang] || r.weight.en}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('boardCargo')}</span>
                              <span className="expand-field-value">{r.cargo[lang] || r.cargo.en}</span>
                            </div>
                          </div>

                          <div className="expand-section">
                            <div className="expand-section-title">{t('boardRoutePrice')}</div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('boardDistance')}</span>
                              <span className="expand-field-value mono">{r.distance}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('boardCostKm')}</span>
                              <span className="expand-field-value mono">€ {(r.rate / parseInt(r.distance)).toFixed(2)}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{t('boardRate')}</span>
                              <span className="expand-field-value mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                                € {r.rate}
                              </span>
                            </div>
                            {progressHtml}
                          </div>

                          <div className="expand-section">
                            <div className="expand-section-title">{t('notes')}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                              {r.notes[lang] || r.notes.en}
                            </div>
                            {r.issue && (
                              <div style={{
                                marginTop: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                background: 'var(--warning-bg)',
                                border: '1px solid #FDE68A',
                                fontSize: '12px',
                                color: 'var(--warning-text)',
                                fontWeight: 500
                              }}>
                                ⚠️ {r.issue[lang] || r.issue.en}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="expand-actions">{actionBtns}</div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      <div className={`bulk-bar ${selectedRows.size > 0 ? 'show' : ''}`}>
        <div className="bulk-bar-left">
          <span>{selectedRows.size}</span> {t('selected')}
        </div>
        <div className="bulk-bar-right">
          <button className="bulk-btn" onClick={() => handleBulkAction("Export")}>
            📥 {t('export')}
          </button>
          <button className="bulk-btn" onClick={() => handleBulkAction("Message Carrier")}>
            💬 {t('boardMessageCarrier')}
          </button>
          <button className="bulk-btn" onClick={() => handleBulkAction("Print Manifest")}>
            🖨 {t('boardPrintManifest')}
          </button>
        </div>
      </div>

      {/* Pagination */}
      <div className="pag" id="pagination">
        <div className="pag-info" id="pagInfo">
          {t('showing')} {startItem}–{endItem} {t('of')} {totalItemsCount}
        </div>
        <div className="pag-btns" id="pagBtns">
          {totalPages > 1 && (
            <>
              <button
                className="pag-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pag-btn ${currentPage === p ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="pag-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};