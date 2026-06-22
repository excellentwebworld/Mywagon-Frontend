import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Shipment } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

export const ManageShipments: React.FC = () => {
  const { shipments, updateShipment, carriers, showToast } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [activeStab, setActiveStab] = useState<string>('Active');

  // Selected shipments for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Collapsed rows
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Invite Carrier Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitedCarriers, setInvitedCarriers] = useState<Set<string>>(new Set());

  // Counter offer input state
  const [counterValue, setCounterValue] = useState<Record<string, string>>({});



  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    showToast(t('copiedId', { id }), 'success');
  };

  const getFilteredShipments = () => {
    return shipments
      .filter((s) => {
        // Search query
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const customerMatches = s.customer.some((c) => c.name.toLowerCase().includes(q));
        const carrierMatches = s.carrier && s.carrier.toLowerCase().includes(q);
        return (
          s.id.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.dest.toLowerCase().includes(q) ||
          customerMatches ||
          carrierMatches
        );
      })
      .filter((s) => {
        // Status stab tabs
        if (activeStab === 'Active') return s.status !== 'cancelled' && s.status !== 'delivered';
        if (activeStab === 'Pending') return s.status === 'pending';
        if (activeStab === 'Upcoming') return s.status === 'upcoming';
        if (activeStab === 'In Progress') return s.status === 'in_progress';
        if (activeStab === 'Completed') return s.status === 'delivered';
        if (activeStab === 'Cancelled') return s.status === 'cancelled';
        return true;
      })
      .filter((s) => {
        // KPI active filters
        if (!activeKpi) return true;
        if (activeKpi === 'action') return s.status === 'pending';
        if (activeKpi === 'bids') return s.status === 'pending' && s.bids > 0;
        if (activeKpi === 'uncov') return !s.carrier;
        if (activeKpi === 'risk') return s.at_risk;
        return true;
      });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = getFilteredShipments().map((s) => s.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkAction = (action: string) => {
    showToast(`${action} action on ${selectedIds.size} shipments`, 'info');
    setSelectedIds(new Set());
  };

  const handleAwardBid = (s: Shipment, carrierName: string, bidPrice: number) => {
    updateShipment({
      ...s,
      status: 'awarded',
      carrier: carrierName,
      price: bidPrice,
      updated: 'Just now',
      tl_cur: 3, // Awarded state
    });
    showToast(t('awardedTo', { name: carrierName }), 'success');
  };

  const handleSendCounter = (s: Shipment) => {
    const val = counterValue[s.id];
    if (!val || isNaN(Number(val))) {
      showToast('Please enter a valid price', 'warning');
      return;
    }
    showToast(`Counter offer of €${val} sent to carrier!`, 'success');
    setCounterValue((prev) => ({ ...prev, [s.id]: '' }));
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleToggleInviteCarrier = (name: string) => {
    setInvitedCarriers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSendInvites = () => {
    if (invitedCarriers.size === 0) {
      showToast('Select at least one carrier', 'warning');
      return;
    }
    showToast(`Sent invites to ${invitedCarriers.size} carrier(s)!`, 'success');
    setIsInviteOpen(false);
    setInvitedCarriers(new Set());
  };

  const filteredShipments = getFilteredShipments();

  // Metrics summary
  const needsActionCount = shipments.filter((s) => s.status === 'pending').length;
  const bidsCount = shipments.filter((s) => s.status === 'pending' && s.bids > 0).length;
  const uncoveredCount = shipments.filter((s) => !s.carrier).length;
  const riskCount = shipments.filter((s) => s.at_risk).length;

  return (
    <div className="animate-fade-in" style={{ padding: '0px' }}>
      <h1 className="text-h2" style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 700 }}>
        {t('manageShipments')}
      </h1>

      {/* KPI Cards Strip */}
      <div className="mgmt-kpi-s" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { key: 'action', value: needsActionCount, label: t('needsActionLabel'), type: 'c-warn' },
          { key: 'bids', value: bidsCount, label: t('pendingHasBids'), type: 'c-acc' },
          { key: 'uncov', value: uncoveredCount, label: t('uncoveredLabel'), type: 'c-err' },
          { key: 'risk', value: riskCount, label: t('atRiskLate'), type: 'c-err' },
          { key: 'all', value: shipments.length, label: t('allShipments'), type: '' },
        ].map((kpi) => (
          <div
            key={kpi.key}
            className={`mgmt-kpi ${kpi.type} ${activeKpi === kpi.key ? 'act' : ''}`}
            onClick={() => setActiveKpi(activeKpi === kpi.key ? null : kpi.key)}
            style={{ cursor: 'pointer', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
          >
            <div className="mgmt-kpi-v" style={{ fontSize: '22px', fontWeight: 700 }}>{kpi.value}</div>
            <div className="mgmt-kpi-l" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="fbar" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <div className="f-search" style={{ position: 'relative', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={t('searchShipmentsPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px', width: '100%' }}
          />
        </div>
        <select value={activeStab} onChange={(e) => setActiveStab(e.target.value)}>
          <option>Active</option>
          <option>Pending</option>
          <option>Upcoming</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => setIsInviteOpen(true)}>
          Invite Carriers
        </button>
        <span
          className="f-clear"
          onClick={() => {
            setSearchQuery('');
            setActiveKpi(null);
            setActiveStab('Active');
          }}
          style={{ cursor: 'pointer' }}
        >
          {t('clearAll')}
        </span>
      </div>

      {/* Main Table */}
      <div className="tbl-wrap" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="mgmt-t">
          <thead>
            <tr>
              <th style={{ width: '36px' }}>
                <input
                  type="checkbox"
                  checked={filteredShipments.length > 0 && selectedIds.size === filteredShipments.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>{t('shipmentIdCol')}</th>
              <th>{t('laneColHeader')}</th>
              <th>{t('customerCol')}</th>
              <th>{t('status')}</th>
              <th>{t('visibilityCol')}</th>
              <th>{t('bidsCol')}</th>
              <th>{t('carrierCol')}</th>
              <th>{t('priceCol')}</th>
              <th>{t('lastUpdateCol')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                  No shipments found
                </td>
              </tr>
            ) : (
              filteredShipments.map((s) => {
                const isExpanded = expandedRow === s.id;
                const isSelected = selectedIds.has(s.id);
                const roleBadge = s.status === 'in_progress' ? 'badge-info' : s.status === 'upcoming' ? 'badge-gray' : s.status === 'pending' ? 'badge-warning' : s.status === 'awarded' ? 'badge-accent' : 'badge-success';

                return (
                  <React.Fragment key={s.id}>
                    <tr
                      onClick={() => toggleRowExpansion(s.id)}
                      className={isExpanded ? 'expanded' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(s.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="sid">
                          <span className="mono" onClick={(e) => handleCopyId(s.id, e)} title="Click to copy">
                            {s.id}
                          </span>
                        </div>
                        <div className="sub">{s.date}</div>
                      </td>
                      <td>
                        <div className="lane" style={{ fontWeight: 600 }}>
                          {s.origin} <span className="arr">→</span> {s.dest}
                        </div>
                        {s.via && <div className="lane-stops">via {s.via}</div>}
                      </td>
                      <td>
                        <div className="cust-pills">
                          {s.customer.map((c, idx) => (
                            <span key={idx} className="cust-pill">🏪 {c.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${roleBadge}`}>
                          <span className="bdot"></span>
                          {t(s.status)}
                        </span>
                        {s.at_risk && (
                          <span className="badge badge-warning" style={{ marginLeft: '4px', fontSize: '10px' }}>
                            ⚠ At Risk
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`vis vis-${s.vis}`}>{t(s.vis)}</span>
                      </td>
                      <td>
                        {s.bids > 0 ? (
                          <div className="bids-cell">
                            <span className="bids-ct" style={{ fontWeight: 600 }}>{s.bids} bid{s.bids > 1 ? 's' : ''}</span>
                            {s.best_bid && <span className="bids-best"> · Best €{s.best_bid}</span>}
                          </div>
                        ) : (
                          <span className="uncov">Uncovered</span>
                        )}
                      </td>
                      <td>
                        {s.carrier ? (
                          <div className="carrier-cell" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="avatar avatar-xs">{s.carrier_init || s.carrier.substring(0, 2).toUpperCase()}</div>
                            <span>{s.carrier}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {s.price ? (
                          <div>
                            <span className="price" style={{ fontWeight: 700 }}>€{s.price}</span>
                            <span className={`chip-${s.price_type}`} style={{ display: 'block', fontSize: '10px' }}>
                              {t(s.price_type)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="ago">{s.updated}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="acts" style={{ display: 'flex', gap: '4px' }}>
                          <button className="act-btn" onClick={() => navigate(`/shipments/${s.id}`)}>
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="exp open">
                        <td colSpan={11}>
                          <div className="exp-inner" style={{ padding: '20px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                              {/* Left Column: Orders list */}
                              <div>
                                <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Orders</h4>
                                {s.customer.map((c, idx) => (
                                  <div key={idx} className="exp-cust-group" style={{ marginBottom: '10px' }}>
                                    <div className="exp-cust-head" style={{ fontWeight: 600, fontSize: '13px' }}>
                                      <span>🏪</span> <span>{c.name}</span>
                                    </div>
                                    <div className="exp-cust-body" style={{ paddingLeft: '16px' }}>
                                      {c.orders ? (
                                        c.orders.map((o) => (
                                          <div key={o} className="ord" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {o} · General Cargo
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Mock orders list</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Center Column: Live timeline tracker */}
                              <div>
                                <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Tracking Status</h4>
                                <div className="tl" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '12px' }}>
                                  {['Booked', 'Posted', 'Bidding', 'Awarded', 'Pickup', 'Transit', 'Delivered'].map((lbl, idx) => {
                                    const isDone = idx < s.tl_cur;
                                    const isCur = idx === s.tl_cur;
                                    return (
                                      <div key={lbl} style={{ textAlign: 'center', flex: 1 }}>
                                        <div
                                          style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            background: isDone ? 'var(--success)' : isCur ? 'var(--accent)' : 'var(--border)',
                                            margin: '0 auto 4px',
                                          }}
                                        ></div>
                                        <div style={{ color: isCur ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{lbl}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right Column: Bid acceptance controls */}
                              <div>
                                <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Bids ({s.bids})</h4>
                                {s.carrier ? (
                                  <div className="status-detail" style={{ fontSize: '13px' }}>
                                    <div><strong>Assigned Carrier:</strong> {s.carrier}</div>
                                    <div><strong>Booked Price:</strong> €{s.price}</div>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => navigate(`/shipments/${s.id}`)}
                                      style={{ marginTop: '12px' }}
                                    >
                                      View stop directions & map
                                    </button>
                                  </div>
                                ) : s.bids > 0 ? (
                                  <div className="bid-row" style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', background: 'var(--surface)' }}>
                                    <div className="bid-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span className="bid-name" style={{ fontWeight: 600 }}>KRP Transport S.A ★4.8</span>
                                      <span className="bid-price" style={{ fontWeight: 700, color: 'var(--accent)' }}>€{s.best_bid || 820}</span>
                                    </div>
                                    <div className="bid-meta" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                      18t · Full · ETA on time
                                    </div>
                                    <div className="bid-acts" style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleAwardBid(s, 'KRP Transport S.A', s.best_bid || 820)}
                                      >
                                        Accept
                                      </button>
                                      <button className="btn btn-secondary btn-sm" onClick={() => showToast('Counter offer popup')}>
                                        Counter
                                      </button>
                                    </div>

                                    {/* Counter offer inline input */}
                                    <div className="counter-form" style={{ marginTop: '10px', display: 'flex', gap: '4px' }}>
                                      <input
                                        type="number"
                                        placeholder="€ your offer"
                                        value={counterValue[s.id] || ''}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setCounterValue((prev) => ({ ...prev, [s.id]: v }));
                                        }}
                                        style={{ flex: 1, padding: '4px 8px' }}
                                      />
                                      <button className="btn btn-primary btn-sm" onClick={() => handleSendCounter(s)}>
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>No bids yet.</p>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setIsInviteOpen(true)}>
                                      + Invite Carrier
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bulk" style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: '#111827', color: '#fff', position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', borderRadius: '8px', zIndex: 100, alignItems: 'center' }}>
          <span className="bulk-cnt" style={{ fontWeight: 700, marginRight: '16px' }}>{selectedIds.size} selected</span>
          <button className="btn btn-primary btn-sm" onClick={() => handleBulkAction('cancel')}>Cancel Selected</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleBulkAction('invite')}>Invite Carriers</button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('export')}>Export Selected</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())} style={{ color: '#fff' }}>✕</button>
        </div>
      )}

      {/* Invite Carrier Modal */}
      {isInviteOpen && (
        <div className="modal-backdrop open">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>🚛 Invite Carriers</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsInviteOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <input
                className="inv-search w-full"
                type="text"
                placeholder="Search carriers by name, type…"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
              <div id="invCarrierList" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {carriers
                  .filter((c) => c.name.toLowerCase().includes(inviteQuery.toLowerCase()))
                  .map((c) => {
                    const isSelected = invitedCarriers.has(c.name);
                    return (
                      <div
                        key={c.id}
                        className={`inv-carrier ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleInviteCarrier(c.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-light)' : 'none',
                        }}
                      >
                        <div className="ic-av" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', fontWeight: 700 }}>
                          {c.init}
                        </div>
                        <div className="ic-info" style={{ flex: 1 }}>
                          <div className="ic-name" style={{ fontWeight: 600 }}>{c.name}</div>
                          <div className="ic-meta" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {c.type} · ★ {c.rating}
                          </div>
                        </div>
                        {isSelected && <div className="ic-check" style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</div>}
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <span style={{ marginRight: 'auto', fontSize: '12px', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                {invitedCarriers.size} selected
              </span>
              <button className="btn btn-secondary" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendInvites}>
                Send Invitations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
