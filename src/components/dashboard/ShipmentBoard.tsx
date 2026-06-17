import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BOARD_DATA, TAB_COUNTS } from './mockData';
import type { BoardItem } from './types';

interface ShipmentBoardProps {
  activeTab: number;
  setActiveTab: (idx: number) => void;
}

export const ShipmentBoard: React.FC<ShipmentBoardProps> = ({ activeTab, setActiveTab }) => {
  const { lang, showToast } = useApp();

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

  // Dynamic values
  const totalPages = Math.ceil(rawData.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(startItem + paginatedData.length - 1, totalItemsCount);

  // Translations object
  const labels: Record<string, { en: string; el: string }> = {
    needsAction: { en: "Needs Action", el: "Χρειάζεται Ενέργεια" },
    upcoming: { en: "Upcoming", el: "Προσεχές" },
    inTransit: { en: "In Transit", el: "Σε Μεταφορά" },
    delivered: { en: "Delivered", el: "Παραδόθηκαν" },
    billing: { en: "Billing", el: "Χρέωση" },
    selectAll: { en: "Select all", el: "Επιλογή όλων" },
    rate: { en: "Rate", el: "Τιμή" },
    date: { en: "Date", el: "Ημ/νία" },
    shipmentId: { en: "Shipment ID", el: "ID Φορτίου" },
    route: { en: "Route", el: "Διαδρομή" },
    status: { en: "Status", el: "Κατάσταση" },
    nextMilestone: { en: "Next Milestone", el: "Επόμενο Ορόσημο" },
    carrier: { en: "Carrier", el: "Μεταφορέας" },
    selected: { en: "selected", el: "επιλεγμένα" },
    export: { en: "Export", el: "Εξαγωγή" },
    messageCarrier: { en: "Message Carrier", el: "Μήνυμα σε Μεταφορέα" },
    printManifest: { en: "Print Manifest", el: "Εκτύπωση Manifest" },
    showing: { en: "Showing", el: "Εμφάνιση" },
    of: { en: "of", el: "από" },
    details: { en: "Shipment Details", el: "Στοιχεία Φορτίου" },
    reference: { en: "Reference", el: "Αναφορά" },
    vehicle: { en: "Vehicle", el: "Όχημα" },
    weight: { en: "Weight", el: "Βάρος" },
    cargo: { en: "Cargo", el: "Φορτίο" },
    routePrice: { en: "Route & Pricing", el: "Διαδρομή & Τιμολόγηση" },
    distance: { en: "Distance", el: "Απόσταση" },
    costKm: { en: "Cost / km", el: "Κόστος / km" },
    notes: { en: "Notes", el: "Σημειώσεις" },
    booked: { en: "Booked", el: "Κρατήθηκε" },
    pickedUp: { en: "Picked up", el: "Παραλήφθηκε" },
    deliveredStep: { en: "Delivered", el: "Παραδόθηκε" },
    fullDetails: { en: "Full Details", el: "Πλήρη Στοιχεία" },
    resolveNow: { en: "Resolve Now", el: "Επίλυση Τώρα" },
    callCarrier: { en: "Call Carrier", el: "Κλήση Μεταφορέα" },
    liveTrack: { en: "Live Track", el: "Ζωντανός Εντοπισμός" },
    message: { en: "Message", el: "Μήνυμα" },
    edit: { en: "Edit", el: "Επεξεργασία" },
    clone: { en: "Clone", el: "Κλωνοποίηση" },
    viewPod: { en: "View POD", el: "Προβολή POD" },
    invoice: { en: "Invoice", el: "Τιμολόγιο" },
    rateCarrier: { en: "Rate", el: "Αξιολόγηση" },
    resolve: { en: "Resolve", el: "Επίλυση" },
  };

  const getT = (key: string): string => {
    return labels[key]?.[lang] || labels[key]?.en || key;
  };

  const handleBulkAction = (action: string) => {
    showToast(lang === 'el' ? `Μαζική ενέργεια: ${action} για ${selectedRows.size} φορτία` : `Bulk action: ${action} for ${selectedRows.size} shipments`, 'info');
  };

  const handleActionClick = (actionName: string, sid: string) => {
    showToast(lang === 'el' ? `Ενέργεια: ${actionName} για ${sid}` : `Action: ${actionName} for ${sid}`, 'success');
  };

  return (
    <div className="card a d4" style={{ marginBottom: '20px' }} id="boardCard">
      {/* Board tabs */}
      <div className="board-tabs" id="boardTabs">
        <div className={`b-tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
          <span>{getT('needsAction')}</span>
          <span className="tc warn">{TAB_COUNTS[0]}</span>
        </div>
        <div className={`b-tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          <span>{getT('upcoming')}</span>
          <span className="tc">{TAB_COUNTS[1]}</span>
        </div>
        <div className={`b-tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
          <span>{getT('inTransit')}</span>
          <span className="tc">{TAB_COUNTS[2]}</span>
        </div>
        <div className={`b-tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>
          <span>{getT('delivered')}</span>
          <span className="tc">{TAB_COUNTS[3]}</span>
        </div>
        <div className={`b-tab ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>
          <span>{getT('billing')}</span>
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
            <span>{getT('selectAll')}</span>
          </label>
        </div>
        <div className="board-toolbar-right">
          <button
            className={`board-sort-btn ${sortType === 'rate' ? 'active' : ''}`}
            onClick={() => handleSort('rate')}
            title="Sort by rate"
          >
            € {getT('rate')} <span className="sort-icon">{sortType === 'rate' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>
          <button
            className={`board-sort-btn ${sortType === 'date' ? 'active' : ''}`}
            onClick={() => handleSort('date')}
            title="Sort by date"
          >
            📅 {getT('date')} <span className="sort-icon">{sortType === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }} id="boardTableWrap">
        <table className="bt" id="boardTable">
          <thead>
            <tr>
              <th className="c-check" style={{ cursor: 'default' }}></th>
              <th>{getT('shipmentId')} <span className="sort-icon">↕</span></th>
              <th>{getT('route')} <span className="sort-icon">↕</span></th>
              <th>{getT('status')} <span className="sort-icon">↕</span></th>
              <th>{getT('nextMilestone')} <span className="sort-icon">↕</span></th>
              <th>{getT('carrier')} <span className="sort-icon">↕</span></th>
              <th>{getT('rate')} <span className="sort-icon">↕</span></th>
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
                  📋 {getT('fullDetails')}
                </button>
              );

              if (r.status === 'pending' || r.status === 'action') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn primary" onClick={() => handleActionClick("Resolve Now", r.sid)}>
                      ⚡ {getT('resolveNow')}
                    </button>
                    <button className="expand-btn warn" onClick={() => handleActionClick("Call Carrier", r.sid)}>
                      📞 {getT('callCarrier')}
                    </button>
                  </>
                );
              } else if (r.status === 'transit' || r.status === 'delayed') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn primary" onClick={() => handleActionClick("Live Track", r.sid)}>
                      📍 {getT('liveTrack')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Message", r.sid)}>
                      💬 {getT('message')}
                    </button>
                  </>
                );
              } else if (r.status === 'upcoming') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn" onClick={() => handleActionClick("Edit", r.sid)}>
                      ✏️ {getT('edit')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Clone", r.sid)}>
                      📄 {getT('clone')}
                    </button>
                  </>
                );
              } else if (r.status === 'delivered') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn" onClick={() => handleActionClick("View POD", r.sid)}>
                      📸 {getT('viewPod')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Invoice", r.sid)}>
                      📥 {getT('invoice')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Rate Carrier", r.sid)}>
                      ⭐ {getT('rateCarrier')}
                    </button>
                  </>
                );
              } else if (r.status === 'billing') {
                actionBtns = (
                  <>
                    {actionBtns}
                    <button className="expand-btn primary" onClick={() => handleActionClick("Resolve", r.sid)}>
                      💳 {getT('resolve')}
                    </button>
                    <button className="expand-btn" onClick={() => handleActionClick("Invoice", r.sid)}>
                      📥 {getT('invoice')}
                    </button>
                  </>
                );
              }

              // Milestone Progress Step
              let progressHtml = null;
              if (r.status === 'transit' || r.status === 'delayed') {
                progressHtml = (
                  <div className="expand-progress">
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('booked')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('pickedUp')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot active"></div>{getT('inTransit')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{getT('deliveredStep')}</div>
                  </div>
                );
              } else if (r.status === 'delivered') {
                progressHtml = (
                  <div className="expand-progress">
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('booked')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('pickedUp')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('inTransit')}</div>
                    <div className="expand-progress-line done"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('deliveredStep')}</div>
                  </div>
                );
              } else if (r.status === 'upcoming') {
                progressHtml = (
                  <div className="expand-progress">
                    <div className="expand-progress-step"><div className="expand-progress-dot done"></div>{getT('booked')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{getT('pickedUp')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{getT('inTransit')}</div>
                    <div className="expand-progress-line"></div>
                    <div className="expand-progress-step"><div className="expand-progress-dot"></div>{getT('deliveredStep')}</div>
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
                            <div className="expand-section-title">{getT('details')}</div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('reference')}</span>
                              <span className="expand-field-value mono">{r.ref}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('vehicle')}</span>
                              <span className="expand-field-value">{r.vehicle[lang] || r.vehicle.en}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('weight')}</span>
                              <span className="expand-field-value">{r.weight[lang] || r.weight.en}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('cargo')}</span>
                              <span className="expand-field-value">{r.cargo[lang] || r.cargo.en}</span>
                            </div>
                          </div>

                          <div className="expand-section">
                            <div className="expand-section-title">{getT('routePrice')}</div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('distance')}</span>
                              <span className="expand-field-value mono">{r.distance}</span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('costKm')}</span>
                              <span className="expand-field-value mono">
                                € {(r.rate / parseInt(r.distance)).toFixed(2)}
                              </span>
                            </div>
                            <div className="expand-field">
                              <span className="expand-field-label">{getT('rate')}</span>
                              <span className="expand-field-value mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                                € {r.rate}
                              </span>
                            </div>
                            {progressHtml}
                          </div>

                          <div className="expand-section">
                            <div className="expand-section-title">{getT('notes')}</div>
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
          <span>{selectedRows.size}</span> {getT('selected')}
        </div>
        <div className="bulk-bar-right">
          <button className="bulk-btn" onClick={() => handleBulkAction("Export")}>
            📥 {getT('export')}
          </button>
          <button className="bulk-btn" onClick={() => handleBulkAction("Message Carrier")}>
            💬 {getT('messageCarrier')}
          </button>
          <button className="bulk-btn" onClick={() => handleBulkAction("Print Manifest")}>
            🖨 {getT('printManifest')}
          </button>
        </div>
      </div>

      {/* Pagination */}
      <div className="pag" id="pagination">
        <div className="pag-info" id="pagInfo">
          {getT('showing')} {startItem}–{endItem} {getT('of')} {totalItemsCount}
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
